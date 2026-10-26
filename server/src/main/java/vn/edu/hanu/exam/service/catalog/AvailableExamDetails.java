package vn.edu.hanu.exam.service.catalog;

public record AvailableExamDetails(
        long id,
        String title,
        String description,
        int durationMinutes,
        long questionCount,
        long totalPoints) {
}
