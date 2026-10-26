package vn.edu.hanu.exam.service.dashboard;

import java.time.OffsetDateTime;

import vn.edu.hanu.exam.domain.ExamStatus;

public record RecentExamSummary(
        long id,
        String title,
        String description,
        int durationMinutes,
        ExamStatus status,
        long questionCount,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {
}
