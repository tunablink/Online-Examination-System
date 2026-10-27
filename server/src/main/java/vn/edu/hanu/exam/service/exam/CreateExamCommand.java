package vn.edu.hanu.exam.service.exam;

import java.time.OffsetDateTime;

public record CreateExamCommand(
        String title,
        String description,
        int durationMinutes,
        OffsetDateTime scheduledAt) {
    public CreateExamCommand(String title, String description, int durationMinutes) {
        this(title, description, durationMinutes, OffsetDateTime.now().plusDays(1));
    }
}
