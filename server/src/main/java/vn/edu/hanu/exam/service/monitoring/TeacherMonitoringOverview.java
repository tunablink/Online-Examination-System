package vn.edu.hanu.exam.service.monitoring;

import java.time.OffsetDateTime;
import java.util.List;

public record TeacherMonitoringOverview(
        long activeAttempts, long completedAttempts, long warningEvents,
        List<Activity> activities, boolean truncated, String interpretation) {
    public TeacherMonitoringOverview { activities = List.copyOf(activities); }

    public record Activity(
            long id, long attemptId, long examId, String examTitle,
            long studentId, String studentName, String institutionalId,
            String rule, String severity, String description,
            OffsetDateTime occurredAt, OffsetDateTime recordedAt) {
    }
}
