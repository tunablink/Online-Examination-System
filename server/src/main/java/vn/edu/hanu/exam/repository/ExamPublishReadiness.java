package vn.edu.hanu.exam.repository;

public record ExamPublishReadiness(
        int questionCount,
        int invalidChoiceCount,
        int invalidCorrectChoiceCount) {
}
