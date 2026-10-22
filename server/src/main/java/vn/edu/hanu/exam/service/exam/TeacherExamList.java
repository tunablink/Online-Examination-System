package vn.edu.hanu.exam.service.exam;

import java.util.List;

public record TeacherExamList(List<ExamDetails> exams) {
    public TeacherExamList {
        exams = List.copyOf(exams);
    }
}
