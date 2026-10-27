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
        OffsetDateTime updatedAt) {

    public ExamDetails(
            long id,
            String title,
            String description,
            int durationMinutes,
            ExamStatus status,
            long createdBy,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt) {
        this(id, title, description, durationMinutes, null, status, createdBy, createdAt, updatedAt);
    }

    public static ExamDetails from(Exam exam) {
        return new ExamDetails(
                exam.id(), exam.title(), exam.description(), exam.durationMinutes(), exam.scheduledAt(),
                exam.status(), exam.createdBy(), exam.createdAt(), exam.updatedAt());
    }
}
