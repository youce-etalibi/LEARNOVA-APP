<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Absence;
use App\Models\Justification;
use App\Models\Seance;
use App\Models\SeanceQrToken;
use App\Models\StudentWarning;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AbsenceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = auth('api')->user();

        $query = Absence::with([
            'student.user:id,name',
            'seance.module:id,name',
            'seance:id,module_id,date,start_time',
            'justification',
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

        $seance = Seance::findOrFail($payload['seance_id']);
        $moduleId = $seance->module_id;

        foreach ($payload['records'] as $row) {
            Absence::updateOrCreate(
                ['seance_id' => $payload['seance_id'], 'student_id' => $row['student_id']],
                ['status' => $row['status']],
            );

            $this->recalculateStudentWarnings($row['student_id'], $moduleId);
        }

        return response()->json(['message' => 'Présences et avertissements enregistrés.']);
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

        // Recalculate warnings
        $this->recalculateStudentWarnings($absence->student_id, $absence->seance->module_id);

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
     * PATCH /api/justifications/{justification}/review — Approve/reject justification.
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
            $absence = $justification->absence;
            $absence->update([
                'status' => 'justified',
                'justified_by' => auth('api')->id(),
                'justified_at' => now(),
            ]);

            // Automatically downgrade warning tier
            $this->recalculateStudentWarnings($absence->student_id, $absence->seance->module_id);
        }

        return response()->json($justification);
    }

    /**
     * POST /api/seances/{seance}/qr-tokens — Generate rotating QR Code.
     */
    public function generateQrToken(Seance $seance): JsonResponse
    {
        $token = Str::random(32);
        
        // Mock classroom geofence default coordinates (Casablanca, Morocco)
        $latitude = 33.57310000;
        $longitude = -7.58980000;

        $qrToken = SeanceQrToken::create([
            'seance_id' => $seance->id,
            'token' => $token,
            'latitude' => $latitude,
            'longitude' => $longitude,
            'expires_at' => now()->addSeconds(15),
        ]);

        return response()->json($qrToken, 201);
    }

    /**
     * POST /api/absences/scan-qr — Student signs in.
     */
    public function scanQrCode(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'latitude' => ['required', 'numeric'],
            'longitude' => ['required', 'numeric'],
        ]);

        $qrToken = SeanceQrToken::where('token', $data['token'])
            ->where('expires_at', '>', now())
            ->first();

        if (!$qrToken) {
            return response()->json(['error' => 'Code QR expiré ou invalide. Veuillez scanner à nouveau.'], 422);
        }

        // Proximity validation using the Haversine formula
        $distance = $this->calculateDistance(
            $data['latitude'],
            $data['longitude'],
            $qrToken->latitude,
            $qrToken->longitude
        );

        if ($distance > 30.0) { // 30 meters geofence threshold
            return response()->json(['error' => 'Géolocalisation invalide. Vous devez être présent dans la salle de classe.'], 422);
        }

        $user = auth('api')->user();
        $student = $user->student;

        if (!$student) {
            return response()->json(['error' => 'Profil étudiant introuvable.'], 403);
        }

        $absence = Absence::updateOrCreate(
            [
                'seance_id' => $qrToken->seance_id,
                'student_id' => $student->id,
            ],
            [
                'status' => 'present',
            ]
        );

        return response()->json([
            'message' => 'Présence enregistrée par QR code avec succès.',
            'absence' => $absence,
        ], 201);
    }

    /**
     * Helper to compute warnings
     */
    private function recalculateStudentWarnings(int $studentId, int $moduleId): void
    {
        $unexcusedCount = Absence::where('student_id', $studentId)
            ->whereHas('seance', function ($q) use ($moduleId) {
                $q->where('module_id', $moduleId);
            })
            ->where('status', 'absent')
            ->count();

        if ($unexcusedCount >= 7) {
            StudentWarning::updateOrCreate(
                ['student_id' => $studentId, 'module_id' => $moduleId],
                ['absence_count' => $unexcusedCount, 'status' => 'excluded']
            );
        } elseif ($unexcusedCount >= 5) {
            StudentWarning::updateOrCreate(
                ['student_id' => $studentId, 'module_id' => $moduleId],
                ['absence_count' => $unexcusedCount, 'status' => 'warning_2']
            );
        } elseif ($unexcusedCount >= 3) {
            StudentWarning::updateOrCreate(
                ['student_id' => $studentId, 'module_id' => $moduleId],
                ['absence_count' => $unexcusedCount, 'status' => 'warning_1']
            );
        } else {
            StudentWarning::where('student_id', $studentId)
                ->where('module_id', $moduleId)
                ->delete();
        }
    }

    /**
     * Haversine formula calculation (returns distance in meters)
     */
    private function calculateDistance($lat1, $lon1, $lat2, $lon2): float
    {
        $earthRadius = 6371000; // in meters
        
        $latDelta = deg2rad($lat2 - $lat1);
        $lonDelta = deg2rad($lon2 - $lon1);
        
        $a = sin($latDelta / 2) * sin($latDelta / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($lonDelta / 2) * sin($lonDelta / 2);
        
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        
        return $earthRadius * $c;
    }
}
