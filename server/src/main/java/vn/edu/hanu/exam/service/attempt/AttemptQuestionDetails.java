package vn.edu.hanu.exam.service.attempt;

import java.util.List;

public record AttemptQuestionDetails(
        long id,
        String content,
        int points,
        int displayOrder,
        List<AttemptChoiceDetails> choices) {
    public AttemptQuestionDetails {
        choices = List.copyOf(choices);
    }
}
