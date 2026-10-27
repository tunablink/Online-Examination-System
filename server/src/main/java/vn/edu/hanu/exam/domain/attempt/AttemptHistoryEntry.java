package vn.edu.hanu.exam.domain.attempt;

import java.time.OffsetDateTime;

public record AttemptHistoryEntry(
        long attemptId,
        long examId,
        String examTitle,
        AttemptStatus status,
        OffsetDateTime startedAt,
        OffsetDateTime submittedAt,
        int score,
        int maxScore,
        int correctAnswers,
        int totalQuestions) {
}