package vn.edu.hanu.exam.domain.attempt;

public record AttemptQuestion(
        long attemptId,
        long questionId,
        String content,
        int points,
        int displayOrder) {
}
