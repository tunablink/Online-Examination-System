package vn.edu.hanu.exam.domain.attempt;

import java.time.OffsetDateTime;

public record SavedAnswer(
        long attemptId,
        long questionId,
        long choiceId,
        OffsetDateTime savedAt) {
}
