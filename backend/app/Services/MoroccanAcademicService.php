<?php

namespace App\Services;

use App\Models\Grade;
use App\Models\StudentModuleStatus;
use App\Models\Module;
use Illuminate\Support\Facades\DB;

class MoroccanAcademicService
{
    /**
     * Compute and save final validation status for a student in a single module.
     */
    public function calculateModuleStatus(int $studentId, int $moduleId, string $academicYear): StudentModuleStatus
    {
        $module = Module::findOrFail($moduleId);

        // Fetch all grades for this student, module, and academic year
        $grades = Grade::where('student_id', $studentId)
            ->where('module_id', $moduleId)
            ->where('academic_year', $academicYear)
            ->get()
            ->keyBy('exam_type');

        // Extract raw grade values
        $cc = $grades->has('CC') ? (float)$grades->get('CC')->grade : null;
        $tp = $grades->has('TP') ? (float)$grades->get('TP')->grade : null;
        $final = $grades->has('Final') ? (float)$grades->get('Final')->grade : null;
        $ratt = $grades->has('Rattrapage') ? (float)$grades->get('Rattrapage')->grade : null;

        // Weights: 20% CC, 20% TP, 60% Final
        // If TP doesn't exist, it distributes to 40% CC, 60% Final (or 100% Final if CC is missing)
        $rawAverage = $this->computeWeightedAverage($cc, $tp, $final);
        
        $rattAverage = null;
        $finalScore = $rawAverage;
        $status = 'RAT';

        // Check for Note Éliminatoire (< 7.00 in the Final exam)
        $hasEliminatoryFinal = ($final !== null && $final < 7.00);

        if ($rawAverage >= 10.00 && !$hasEliminatoryFinal) {
            $status = 'V'; // Validated directly
        } else {
            $status = 'RAT'; // Needs Rattrapage
        }

        // Handle Rattrapage if it was taken
        if ($ratt !== null) {
            // Under Moroccan LMD, the Rattrapage replaces the Final exam grade if it's better
            $effectiveFinal = max($final ?? 0, $ratt);
            $rattAverage = $this->computeWeightedAverage($cc, $tp, $effectiveFinal);
            $finalScore = max($rawAverage, $rattAverage);

            // Re-evaluate validation status (Note Éliminatoire checks Rattrapage as well)
            $hasEliminatoryRatt = ($effectiveFinal < 7.00);
            if ($finalScore >= 10.00 && !$hasEliminatoryRatt) {
                $status = 'V';
            } else {
                $status = $finalScore < 7.00 ? 'ELIM' : 'RAT';
            }
        }

        // Save or update cache status
        return StudentModuleStatus::updateOrCreate(
            [
                'student_id' => $studentId,
                'module_id' => $moduleId,
                'academic_year' => $academicYear,
            ],
            [
                'semester' => $module->semester,
                'raw_average' => $rawAverage,
                'ratt_average' => $rattAverage,
                'final_score' => $finalScore,
                'status' => $status,
                'is_locked' => false,
            ]
        );
    }

    /**
     * Compute weighted averages based on available exams.
     */
    private function computeWeightedAverage(?float $cc, ?float $tp, ?float $final): float
    {
        $final = $final ?? 0.00;

        if ($cc !== null && $tp !== null) {
            return ($cc * 0.20) + ($tp * 0.20) + ($final * 0.60);
        }

        if ($cc !== null) {
            return ($cc * 0.40) + ($final * 0.60);
        }

        return $final; // 100% Final if no CC/TP exists
    }

    /**
     * Process Semester Compensation (Validation par Compensation - V.C.)
     */
    public function calculateSemesterCompensation(int $studentId, int $semester, string $academicYear): array
    {
        // 1. Fetch all module statuses for this semester
        $statuses = StudentModuleStatus::where('student_id', $studentId)
            ->where('semester', $semester)
            ->where('academic_year', $academicYear)
            ->get();

        if ($statuses->isEmpty()) {
            return ['message' => 'No module grades loaded for this semester.', 'updated' => 0];
        }

        // Check if any module has an active eliminatory score (< 7.00) or is marked ELIM
        $hasEliminatoryGrade = false;
        $totalFinalScore = 0.00;
        $totalModulesCount = $statuses->count();

        foreach ($statuses as $status) {
            if ($status->final_score < 7.00) {
                $hasEliminatoryGrade = true;
            }
            $totalFinalScore += (float)$status->final_score;
        }

        $semesterAverage = $totalModulesCount > 0 ? ($totalFinalScore / $totalModulesCount) : 0.00;
        $updatedCount = 0;

        // Compensation Rule: Semester Average >= 10.00/20 AND no note éliminatoire (< 7.00)
        if ($semesterAverage >= 10.00 && !$hasEliminatoryGrade) {
            foreach ($statuses as $status) {
                // If module is currently marked as RAT (failed) but is >= 7.00, it can be compensated (VC)
                if ($status->status === 'RAT' && $status->final_score >= 7.00 && !$status->is_locked) {
                    $status->update(['status' => 'VC']);
                    $updatedCount++;
                }
            }
        } else {
            // If compensation is failed or invalid, restore VC statuses back to RAT
            foreach ($statuses as $status) {
                if ($status->status === 'VC' && !$status->is_locked) {
                    $status->update(['status' => 'RAT']);
                    $updatedCount++;
                }
            }
        }

        return [
            'semester_average' => $semesterAverage,
            'has_eliminatory_grade' => $hasEliminatoryGrade,
            'compensation_applied' => ($semesterAverage >= 10.00 && !$hasEliminatoryGrade),
            'updated' => $updatedCount
        ];
    }
}
