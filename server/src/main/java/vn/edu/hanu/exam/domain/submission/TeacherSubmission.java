package vn.edu.hanu.exam.domain.submission;

import java.time.OffsetDateTime;

import vn.edu.hanu.exam.domain.attempt.AttemptStatus;

public record TeacherSubmission(
        long attemptId,
        long examId,
        String examTitle,
        long studentId,
        String institutionalId,
        String studentFullName,
        AttemptStatus status,
        OffsetDateTime startedAt,
        OffsetDateTime deadline,
        OffsetDateTime submittedAt,
        Integer score,
        Integer maxScore,
        Integer correctAnswers,
        Integer totalQuestions) {
}
