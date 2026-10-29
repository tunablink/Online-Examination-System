package vn.edu.hanu.exam.domain;

import java.time.OffsetDateTime;

public record Exam(
    long id,
    String title,
    String description,       // nullable – không bắt buộc theo yêu cầu
    int durationMinutes,
    OffsetDateTime scheduledAt,
    ExamStatus status,
    long createdBy,           // FK → users.id
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt,
    Long courseId,
    String courseName,
    String assessmentType,
    OffsetDateTime entryClosesAt
) {
    public Exam(long id, String title, String description, int durationMinutes, OffsetDateTime scheduledAt,
            ExamStatus status, long createdBy, OffsetDateTime createdAt, OffsetDateTime updatedAt,
            Long courseId, String courseName, String assessmentType) {
        this(id, title, description, durationMinutes, scheduledAt, status, createdBy, createdAt, updatedAt,
                courseId, courseName, assessmentType, null);
    }
    public Exam(long id, String title, String description, int durationMinutes, OffsetDateTime scheduledAt,
            ExamStatus status, long createdBy, OffsetDateTime createdAt, OffsetDateTime updatedAt,
            Long courseId, String courseName) {
        this(id, title, description, durationMinutes, scheduledAt, status, createdBy, createdAt,
                updatedAt, courseId, courseName, "Examination");
    }
    public Exam(long id, String title, String description, int durationMinutes, OffsetDateTime scheduledAt,
            ExamStatus status, long createdBy, OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        this(id, title, description, durationMinutes, scheduledAt, status, createdBy, createdAt, updatedAt, null, null, "Examination");
    }
    public Exam(
            long id,
            String title,
            String description,
            int durationMinutes,
            ExamStatus status,
            long createdBy,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt) {
        this(id, title, description, durationMinutes, null, status, createdBy, createdAt, updatedAt, null, null, "Examination");
    }
}
