package vn.edu.hanu.exam.service.attempt;

import java.util.List;

public record AttemptHistoryResult(
        List<StudentAttemptResult> attempts) {

    public AttemptHistoryResult {
        attempts = List.copyOf(attempts);
    }
}