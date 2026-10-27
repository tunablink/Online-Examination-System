package vn.edu.hanu.exam.domain.attempt;

import java.time.OffsetDateTime;

public record ExamAttempt(
        long id,
        long examId,
        long studentId,
        AttemptStatus status,
        OffsetDateTime startedAt,
        OffsetDateTime deadline) {
}
