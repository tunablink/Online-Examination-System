package vn.edu.hanu.exam.service.question;

import java.util.List;

public record UpdateQuestionCommand(
        long questionId,
        String content,
        int points,
        int displayOrder,
        List<ChoiceCommand> choices
) {
    public UpdateQuestionCommand {
        choices = choices == null ? List.of() : List.copyOf(choices);
    }

    public record ChoiceCommand(
            String content,
            boolean correct,
            int displayOrder
    ) {
    }
}
