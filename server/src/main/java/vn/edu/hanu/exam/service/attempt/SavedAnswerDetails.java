package vn.edu.hanu.exam.service.attempt;

import java.time.OffsetDateTime;

public record SavedAnswerDetails(
        long questionId,
        long choiceId,
        OffsetDateTime savedAt) {
}
