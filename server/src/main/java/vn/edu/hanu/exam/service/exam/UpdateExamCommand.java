package vn.edu.hanu.exam.service.exam;

import java.time.OffsetDateTime;

public record UpdateExamCommand(
        String title,
        String description,
        int durationMinutes,
        OffsetDateTime scheduledAt,
        String assessmentType,
        String enrollmentKey,
        OffsetDateTime entryClosesAt
) {
    public UpdateExamCommand(String title, String description, int durationMinutes, OffsetDateTime scheduledAt,
            String assessmentType, String enrollmentKey) {
        this(title, description, durationMinutes, scheduledAt, assessmentType, enrollmentKey, null);
    }
    public UpdateExamCommand(String title, String description, int durationMinutes, OffsetDateTime scheduledAt,
            String assessmentType) {
        this(title, description, durationMinutes, scheduledAt, assessmentType, null);
    }
    public UpdateExamCommand(String title, String description, int durationMinutes) {
        this(title, description, durationMinutes, null, null);
    }
    public UpdateExamCommand(String title, String description, int durationMinutes, OffsetDateTime scheduledAt) {
        this(title, description, durationMinutes, scheduledAt, null);
    }
    @Override public String toString() { return "UpdateExamCommand[enrollmentKey=REDACTED]"; }
}
