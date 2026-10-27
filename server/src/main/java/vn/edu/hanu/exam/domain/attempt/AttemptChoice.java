package vn.edu.hanu.exam.domain.attempt;

public record AttemptChoice(
        long attemptId,
        long questionId,
        long choiceId,
        String content,
        int displayOrder) {
}
