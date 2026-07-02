<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Absence;
use App\Models\Justification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AbsenceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = auth('api')->user();

        $query = Absence::with([
            'student.user:id,name',
            'seance.module:id,name',
            'seance:id,module_id,date,start_time,end_time',
            'justificationRecord',
        ]);

        if ($user->hasRole('Student') && $user->student) {
            $query->where('student_id', $user->student->id);
        }

        if ($s = $request->query('student_id')) {
            $query->where('student_id', $s);
        }
        if ($seance = $request->query('seance_id')) {
            $query->where('seance_id', $seance);
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return response()->json($query->latest()->paginate($request->integer('per_page', 30)));
    }

    /**
     * POST /api/absences/bulk — mark attendance for a session.
     */
    public function bulkStore(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'seance_id' => ['required', 'exists:seances,id'],
            'records' => ['required', 'array', 'min:1'],
            'records.*.student_id' => ['required', 'exists:students,id'],
            'records.*.status' => ['required', 'in:absent,present,justified,late'],
        ]);

        foreach ($payload['records'] as $row) {
            Absence::updateOrCreate(
                ['seance_id' => $payload['seance_id'], 'student_id' => $row['student_id']],
                ['status' => $row['status']],
            );
        }

        return response()->json(['message' => 'Présences enregistrées.']);
    }

    public function update(Request $request, Absence $absence): JsonResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', 'in:absent,present,justified,late'],
            'justification' => ['nullable', 'string'],
        ]);

        if (($data['status'] ?? null) === 'justified') {
            $data['justified_by'] = auth('api')->id();
            $data['justified_at'] = now();
        }

        $absence->update($data);

        return response()->json($absence);
    }

    /**
     * POST /api/absences/{absence}/justify — student submits a justification.
     */
    public function justify(Request $request, Absence $absence): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string'],
            'document' => ['nullable', 'file', 'max:5120'],
        ]);

        $path = null;
        if ($request->hasFile('document')) {
            $path = $request->file('document')->store('justifications', 'public');
        }

        $justification = Justification::create([
            'absence_id' => $absence->id,
            'reason' => $data['reason'],
            'document_path' => $path,
            'status' => 'pending',
        ]);

        return response()->json($justification, 201);
    }

    /**
     * PATCH /api/justifications/{justification}/review
     */
    public function reviewJustification(Request $request, Justification $justification): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:approved,rejected'],
        ]);

        $justification->update([
            'status' => $data['status'],
            'reviewed_by' => auth('api')->id(),
            'reviewed_at' => now(),
        ]);

        if ($data['status'] === 'approved') {
            $justification->absence->update([
                'status' => 'justified',
                'justified_by' => auth('api')->id(),
                'justified_at' => now(),
            ]);
        }

        return response()->json($justification);
    }
}
