package vn.edu.hanu.exam.service.monitoring;

import java.util.List;

import vn.edu.hanu.exam.domain.monitoring.MonitoringAttemptSnapshot;

public record ExamMonitoringSummary(
        long examId,
        List<MonitoringAttemptSnapshot> attempts,
        String interpretation) {
    public ExamMonitoringSummary {
        attempts = List.copyOf(attempts);
    }
}
