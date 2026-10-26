package vn.edu.hanu.exam.service.question;

import java.util.List;

public record CreateQuestionCommand(long examId, String content, int points, int displayOrder, List<ChoiceCommand> choices) {
    public CreateQuestionCommand{
        choices = choices == null ? List.of() : List.copyOf(choices);
    }

    public record ChoiceCommand(String content, boolean correct, int displayOrder) {
    }
}
