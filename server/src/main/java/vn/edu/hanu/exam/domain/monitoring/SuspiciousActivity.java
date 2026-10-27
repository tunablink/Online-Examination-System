package vn.edu.hanu.exam.domain.monitoring;

import java.time.OffsetDateTime;

public record SuspiciousActivity(
        long id,
        long attemptId,
        MonitoringRule rule,
        ActivitySeverity severity,
        String description,
        OffsetDateTime occurredAt,
        OffsetDateTime recordedAt) {
}
