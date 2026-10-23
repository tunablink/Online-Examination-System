package vn.edu.hanu.exam.service.question;

import java.time.OffsetDateTime;
import java.util.List;

import vn.edu.hanu.exam.domain.Choice;
import vn.edu.hanu.exam.domain.Question;

public record TeacherQuestionDetails(long id, long examId, String content, int points, int displayOrder,
    OffsetDateTime createdAt, OffsetDateTime updatedAt, List<TeacherChoiceDetails> choices) {
    public TeacherQuestionDetails {
        choices = choices == null ? List.of() : List.copyOf(choices);
    }

    public static TeacherQuestionDetails from(Question question, List<Choice> choices) {
        return new TeacherQuestionDetails(
                question.id(),
                question.examId(),
                question.content(),
                question.points(),
                question.displayOrder(),
                question.createdAt(),
                question.updatedAt(),
                choices.stream()
                        .map(TeacherChoiceDetails::from)
                        .toList()
        );
    }

    public record TeacherChoiceDetails(long id, long questionId, String content, boolean correct, int displayOrder) {
        public static TeacherChoiceDetails from(Choice choice) {
            return new TeacherChoiceDetails(
                    choice.id(),
                    choice.questionId(),
                    choice.content(),
                    choice.correct(),
                    choice.displayOrder()
            );
        }
    }
}