package vn.edu.hanu.exam.service.monitoring;

import vn.edu.hanu.exam.domain.monitoring.SuspiciousActivity;

public record ActivityRecorded(
        SuspiciousActivity activity,
        SuspiciousActivity thresholdActivity,
        long warningCount,
        String interpretation) {
}
