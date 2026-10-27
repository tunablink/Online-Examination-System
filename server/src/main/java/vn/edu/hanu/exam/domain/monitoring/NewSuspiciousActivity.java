package vn.edu.hanu.exam.domain.monitoring;

import java.time.OffsetDateTime;

public record NewSuspiciousActivity(
        long attemptId,
        MonitoringRule rule,
        ActivitySeverity severity,
        String description,
        OffsetDateTime occurredAt) {
}
