package vn.edu.hanu.exam.service.question;

import java.util.List;

public record TeacherQuestionList(List<TeacherQuestionDetails> questions) {
    public TeacherQuestionList {
        questions = questions == null ? List.of() : List.copyOf(questions);
    }
}