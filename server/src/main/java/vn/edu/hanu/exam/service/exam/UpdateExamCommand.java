package vn.edu.hanu.exam.service.exam;

import java.time.OffsetDateTime;

public record UpdateExamCommand(
        String title,
        String description,
        int durationMinutes,
        OffsetDateTime scheduledAt,
        String assessmentType
) {
    public UpdateExamCommand(String title, String description, int durationMinutes) {
        this(title, description, durationMinutes, null, null);
    }
    public UpdateExamCommand(String title, String description, int durationMinutes, OffsetDateTime scheduledAt) {
        this(title, description, durationMinutes, scheduledAt, null);
    }
}
