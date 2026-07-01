<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseEnrollment;
use App\Models\CoursePurchase;
use App\Models\InvoicePayment;
use App\Models\Payment;
use App\Models\TuitionInvoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    /**
     * GET /api/payments — Student lists their own payment history.
     */
    public function index(Request $request): JsonResponse
    {
        $user = auth('api')->user();

        $query = Payment::with(['coursePurchases.course:id,title', 'invoicePayments.invoice'])
            ->where('user_id', $user->id);

        return response()->json($query->latest()->paginate($request->integer('per_page', 20)));
    }

    /**
     * POST /api/payments/purchase-course — Student buys an online course.
     */
    public function purchaseCourse(Request $request): JsonResponse
    {
        $request->validate([
            'course_id' => ['required', 'exists:courses,id'],
            'payment_method' => ['required', 'string', 'max:50'],
        ]);

        $user = auth('api')->user();
        $course = Course::findOrFail($request->course_id);

        // Check if already purchased
        $existing = CoursePurchase::where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->first();

        if ($existing) {
            return response()->json(['error' => 'Vous avez déjà acheté ce cours.'], 422);
        }

        // Simulate gateway transaction
        $amount = $course->is_free ? 0.00 : 199.00; // Let's set a flat rate if no price is present
        $txRef = 'TX_' . strtoupper(Str::random(10));

        $purchase = DB::transaction(function () use ($user, $course, $request, $amount, $txRef) {
            $payment = Payment::create([
                'user_id' => $user->id,
                'amount' => $amount,
                'currency' => 'MAD',
                'status' => 'completed',
                'payment_method' => $request->payment_method,
                'transaction_ref' => $txRef,
                'paid_at' => now(),
            ]);

            $purchaseRecord = CoursePurchase::create([
                'payment_id' => $payment->id,
                'user_id' => $user->id,
                'course_id' => $course->id,
                'price_paid' => $amount,
                'unlocked_at' => now(),
            ]);

            // Auto-enroll student/user in the course
            CourseEnrollment::firstOrCreate(
                ['user_id' => $user->id, 'course_id' => $course->id],
                ['enrolled_at' => now(), 'source' => 'auto-formation']
            );

            return $purchaseRecord;
        });

        return response()->json([
            'message' => 'Cours acheté et débloqué avec succès.',
            'purchase' => $purchase->load('course:id,title', 'payment'),
        ], 201);
    }

    /**
     * POST /api/payments/pay-invoice — Student pays tuition.
     */
    public function payInvoice(Request $request): JsonResponse
    {
        $request->validate([
            'invoice_id' => ['required', 'exists:tuition_invoices,id'],
            'amount' => ['required', 'numeric', 'min:1'],
            'payment_method' => ['required', 'string', 'max:50'],
        ]);

        $user = auth('api')->user();
        $student = $user->student;

        if (!$student) {
            return response()->json(['error' => 'Profil étudiant introuvable.'], 403);
        }

        $invoice = TuitionInvoice::findOrFail($request->invoice_id);

        if ($invoice->student_id !== $student->id) {
            return response()->json(['error' => 'Cette facture ne vous appartient pas.'], 403);
        }

        $remaining = $invoice->amount - $invoice->amount_paid;
        if ($remaining <= 0) {
            return response()->json(['error' => 'Cette facture est déjà réglée.'], 422);
        }

        $payAmount = min($request->amount, $remaining);
        $txRef = 'TX_' . strtoupper(Str::random(10));

        $payment = DB::transaction(function () use ($user, $invoice, $request, $payAmount, $txRef) {
            $paymentRecord = Payment::create([
                'user_id' => $user->id,
                'amount' => $payAmount,
                'currency' => 'MAD',
                'status' => 'completed',
                'payment_method' => $request->payment_method,
                'transaction_ref' => $txRef,
                'paid_at' => now(),
            ]);

            InvoicePayment::create([
                'invoice_id' => $invoice->id,
                'payment_id' => $paymentRecord->id,
                'amount_allocated' => $payAmount,
            ]);

            // Update invoice totals
            $newPaid = $invoice->amount_paid + $payAmount;
            $status = 'partially_paid';
            if ($newPaid >= $invoice->amount) {
                $status = 'paid';
            }

            $invoice->update([
                'amount_paid' => $newPaid,
                'status' => $status,
            ]);

            return $paymentRecord;
        });

        return response()->json([
            'message' => 'Paiement de la scolarité enregistré.',
            'payment' => $payment,
            'invoice_status' => $invoice->status,
            'amount_paid' => $invoice->amount_paid,
        ], 201);
    }

    /**
     * GET /api/admin/payments — Admin lists all payments across the university.
     */
    public function adminPayments(Request $request): JsonResponse
    {
        $query = Payment::with(['user:id,name,email', 'coursePurchases.course:id,title', 'invoicePayments.invoice']);

        if ($search = $request->query('search')) {
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%");
            })->orWhere('transaction_ref', $search);
        }

        return response()->json($query->latest()->paginate($request->integer('per_page', 30)));
    }

    /**
     * GET /api/admin/invoices — Admin lists all invoices.
     */
    public function adminInvoices(Request $request): JsonResponse
    {
        $query = TuitionInvoice::with(['student.user:id,name,email']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return response()->json($query->latest()->paginate($request->integer('per_page', 30)));
    }

    /**
     * POST /api/admin/invoices — Admin issues a tuition bill.
     */
    public function storeInvoice(Request $request): JsonResponse
    {
        $data = $request->validate([
            'student_id' => ['required', 'exists:students,id'],
            'academic_year' => ['required', 'string', 'max:20'],
            'semester' => ['required', 'integer', 'min:1', 'max:12'],
            'amount' => ['required', 'numeric', 'min:0'],
            'due_date' => ['required', 'date'],
        ]);

        $invoice = TuitionInvoice::create($data);

        return response()->json([
            'message' => 'Facture de scolarité créée.',
            'invoice' => $invoice->load('student.user:id,name'),
        ], 201);
    }
}
