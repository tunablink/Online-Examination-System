package vn.edu.hanu.exam.service.attempt;

import java.time.OffsetDateTime;

import vn.edu.hanu.exam.domain.attempt.AttemptStatus;

public record StudentAttemptResult(
        long attemptId,
        long examId,
        String examTitle,
        AttemptStatus status,
        OffsetDateTime startedAt,
        OffsetDateTime submittedAt,
        int score,
        int maxScore,
        int correctAnswers,
        int totalQuestions,
        String courseName,
        String description) {
    public StudentAttemptResult(long attemptId, long examId, String examTitle, AttemptStatus status,
            OffsetDateTime startedAt, OffsetDateTime submittedAt, int score, int maxScore,
            int correctAnswers, int totalQuestions) {
        this(attemptId, examId, examTitle, status, startedAt, submittedAt, score, maxScore,
                correctAnswers, totalQuestions, null, null);
    }
}
