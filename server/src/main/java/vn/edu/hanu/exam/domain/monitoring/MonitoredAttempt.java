package vn.edu.hanu.exam.domain.monitoring;

import java.time.OffsetDateTime;

public record MonitoredAttempt(
        long attemptId,
        long examId,
        long studentId,
        String status,
        OffsetDateTime deadline) {
}
