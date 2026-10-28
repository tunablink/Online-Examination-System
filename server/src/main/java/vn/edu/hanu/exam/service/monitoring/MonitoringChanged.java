package vn.edu.hanu.exam.service.monitoring;

/** Published within a transaction; subscribers are notified only after commit. */
public record MonitoringChanged(long examId) {
}
