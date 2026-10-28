package vn.edu.hanu.exam.websocket.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record CreateExamPayload(
        String title,
        String description,
        int durationMinutes,
        OffsetDateTime scheduledAt,
        long courseId,
        String assessmentType,
        List<NewQuestion> questions) {
    public record NewQuestion(String content, int points, int displayOrder, List<NewChoice> choices) {}
    public record NewChoice(String content, boolean correct, int displayOrder) {}
}
