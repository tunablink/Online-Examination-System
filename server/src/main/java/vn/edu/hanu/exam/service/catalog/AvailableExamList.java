package vn.edu.hanu.exam.service.catalog;

import java.util.List;

public record AvailableExamList(List<AvailableExamDetails> exams) {
    public AvailableExamList {
        exams = List.copyOf(exams);
    }
}
