package vn.edu.hanu.exam.websocket.dto;

import java.util.List;

public record CreateQuestionPayload(Long examId, String content, Integer points, Integer displayOrder, List<ChoicePayload> choices) {
    public record ChoicePayload(
            String content,
            Boolean correct,
            Integer displayOrder
    ) {
    }
}
