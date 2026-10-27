package vn.edu.hanu.exam.websocket.dto;

import java.time.OffsetDateTime;

public record CreateExamPayload(
        String title,
        String description,
        int durationMinutes,
        OffsetDateTime scheduledAt) {}
