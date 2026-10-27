package vn.edu.hanu.exam.service.exam;

import java.time.OffsetDateTime;

public record UpdateExamCommand(
        String title,
        String description,
        int durationMinutes,
        OffsetDateTime scheduledAt
) {
    public UpdateExamCommand(String title, String description, int durationMinutes) {
        this(title, description, durationMinutes, null);
    }
}
