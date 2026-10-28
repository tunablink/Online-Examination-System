package vn.edu.hanu.exam.service.catalog;

import java.time.OffsetDateTime;

public record AvailableExamDetails(
        long id,
        String title,
        String description,
        int durationMinutes,
        long questionCount,
        long totalPoints,
        OffsetDateTime scheduledAt,
        String courseName) {

    public AvailableExamDetails(long id, String title, String description, int durationMinutes,
            long questionCount, long totalPoints, OffsetDateTime scheduledAt) {
        this(id, title, description, durationMinutes, questionCount, totalPoints, scheduledAt, null);
    }

    public AvailableExamDetails(
            long id,
            String title,
            String description,
            int durationMinutes,
            long questionCount,
            long totalPoints) {
        this(id, title, description, durationMinutes, questionCount, totalPoints, null, null);
    }
}
