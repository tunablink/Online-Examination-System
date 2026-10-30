package vn.edu.hanu.exam.domain.monitoring;

import java.time.OffsetDateTime;

public record MonitoringAttemptSnapshot(
        long attemptId,
        long studentId,
        String studentInstitutionalId,
        String studentFullName,
        String attemptStatus,
        OffsetDateTime deadline,
        long warningCount,
        SuspiciousActivity latestSuspiciousActivity) {
}
