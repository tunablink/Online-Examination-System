package vn.edu.hanu.exam.service.exam;

import java.time.OffsetDateTime;

import vn.edu.hanu.exam.domain.Exam;
import vn.edu.hanu.exam.domain.ExamStatus;

public record ExamDetails(
        long id,
        String title,
        String description,
        int durationMinutes,
        ExamStatus status,
        long createdBy,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {

    public static ExamDetails from(Exam exam) {
        return new ExamDetails(
                exam.id(), exam.title(), exam.description(), exam.durationMinutes(),
                exam.status(), exam.createdBy(), exam.createdAt(), exam.updatedAt());
    }
}
