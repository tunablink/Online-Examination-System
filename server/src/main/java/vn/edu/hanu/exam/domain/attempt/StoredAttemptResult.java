package vn.edu.hanu.exam.domain.attempt;

import java.time.OffsetDateTime;

public record StoredAttemptResult(
        long attemptId,
        long examId,
        AttemptStatus status,
        OffsetDateTime submittedAt,
        int score,
        int maxScore,
        int correctAnswers,
        int totalQuestions) {
}
