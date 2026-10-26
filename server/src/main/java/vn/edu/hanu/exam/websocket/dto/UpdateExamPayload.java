package vn.edu.hanu.exam.websocket.dto;

public record UpdateExamPayload(
        long examId,
        String title,
        String description,
        int durationMinutes
) {}