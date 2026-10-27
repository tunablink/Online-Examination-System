package vn.edu.hanu.exam.service.attempt;

import java.time.OffsetDateTime;
import java.util.List;

import vn.edu.hanu.exam.domain.attempt.AttemptStatus;

public record ExamAttemptDetails(
        long attemptId,
        long examId,
        String examTitle,
        AttemptStatus status,
        OffsetDateTime startedAt,
        OffsetDateTime deadline,
        List<AttemptQuestionDetails> questions) {
    public ExamAttemptDetails {
        questions = List.copyOf(questions);
    }
}
