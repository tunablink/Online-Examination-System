package vn.edu.hanu.exam.websocket.dto;

import java.util.List;

public record UpdateQuestionPayload(
        Long questionId,
        String content,
        Integer points,
        Integer displayOrder,
        List<ChoicePayload> choices
) {
    public record ChoicePayload(
            String content,
            Boolean correct,
            Integer displayOrder
    ) {
    }
}
