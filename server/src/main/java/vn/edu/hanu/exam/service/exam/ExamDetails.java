package vn.edu.hanu.exam.service.exam;

import java.time.OffsetDateTime;

import vn.edu.hanu.exam.domain.Exam;
import vn.edu.hanu.exam.domain.ExamStatus;

public record ExamDetails(
        long id,
        String title,
        String description,
        int durationMinutes,
        OffsetDateTime scheduledAt,
        ExamStatus status,
        long createdBy,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        Long courseId,
        String courseName,
        String assessmentType,
        OffsetDateTime entryClosesAt) {

    public ExamDetails(long id, String title, String description, int durationMinutes, OffsetDateTime scheduledAt,
            ExamStatus status, long createdBy, OffsetDateTime createdAt, OffsetDateTime updatedAt,
            Long courseId, String courseName, String assessmentType) {
        this(id, title, description, durationMinutes, scheduledAt, status, createdBy, createdAt, updatedAt,
                courseId, courseName, assessmentType, null);
    }

    public ExamDetails(long id, String title, String description, int durationMinutes, OffsetDateTime scheduledAt,
            ExamStatus status, long createdBy, OffsetDateTime createdAt, OffsetDateTime updatedAt,
            Long courseId, String courseName) {
        this(id, title, description, durationMinutes, scheduledAt, status, createdBy, createdAt,
                updatedAt, courseId, courseName, "Examination");
    }

    public ExamDetails(long id, String title, String description, int durationMinutes, OffsetDateTime scheduledAt,
            ExamStatus status, long createdBy, OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        this(id, title, description, durationMinutes, scheduledAt, status, createdBy, createdAt, updatedAt, null, null, "Examination");
    }

    public ExamDetails(
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

    public static ExamDetails from(Exam exam) {
        return new ExamDetails(
                exam.id(), exam.title(), exam.description(), exam.durationMinutes(), exam.scheduledAt(),
                exam.status(), exam.createdBy(), exam.createdAt(), exam.updatedAt(), exam.courseId(),
                exam.courseName(), exam.assessmentType(), exam.entryClosesAt());
    }
}
