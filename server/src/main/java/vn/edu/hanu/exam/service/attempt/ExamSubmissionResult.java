package vn.edu.hanu.exam.service.attempt;

import java.time.OffsetDateTime;

import vn.edu.hanu.exam.domain.attempt.AttemptStatus;

public record ExamSubmissionResult(
        long attemptId,
        long examId,
        AttemptStatus status,
        OffsetDateTime submittedAt,
        int score,
        int maxScore,
        int correctAnswers,
        int totalQuestions) {
}
