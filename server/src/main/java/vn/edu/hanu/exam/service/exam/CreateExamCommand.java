package vn.edu.hanu.exam.service.exam;

import java.time.OffsetDateTime;

public record CreateExamCommand(
        String title,
        String description,
        int durationMinutes,
        OffsetDateTime scheduledAt,
        String enrollmentKey,
        OffsetDateTime entryClosesAt) {
    public CreateExamCommand(String title, String description, int durationMinutes, OffsetDateTime scheduledAt,
            String enrollmentKey) {
        this(title, description, durationMinutes, scheduledAt, enrollmentKey, null);
    }
    public CreateExamCommand(String title, String description, int durationMinutes, OffsetDateTime scheduledAt) {
        this(title, description, durationMinutes, scheduledAt, null);
    }
    public CreateExamCommand(String title, String description, int durationMinutes) {
        this(title, description, durationMinutes, OffsetDateTime.now().plusDays(1));
    }

    @Override public String toString() { return "CreateExamCommand[enrollmentKey=REDACTED]"; }
}
