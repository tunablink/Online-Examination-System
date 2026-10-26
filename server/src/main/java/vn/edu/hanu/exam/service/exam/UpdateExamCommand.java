package vn.edu.hanu.exam.service.exam;

public record UpdateExamCommand(
        String title,
        String description,
        int durationMinutes
) {}