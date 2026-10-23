package vn.edu.hanu.exam.service.exam;

public record UpdateExamCommand(
        long examId,
        String title,
        String description,
        int durationMinutes) {}
