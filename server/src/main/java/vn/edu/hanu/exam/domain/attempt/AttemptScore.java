package vn.edu.hanu.exam.domain.attempt;

public record AttemptScore(
        int score,
        int maxScore,
        int correctAnswers,
        int totalQuestions) {
}
