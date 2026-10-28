package vn.edu.hanu.exam.service.attempt;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import vn.edu.hanu.exam.domain.attempt.ExamAttempt;
import vn.edu.hanu.exam.repository.AttemptRepository;

/** Reads persisted deadlines, so overdue attempts are recovered after a restart. */
@Component
public class AttemptDeadlineWorker {
    private static final Logger LOGGER = LoggerFactory.getLogger(AttemptDeadlineWorker.class);
    private static final int BATCH_SIZE = 100;

    private final AttemptRepository repository;
    private final ExamAttemptService service;

    public AttemptDeadlineWorker(AttemptRepository repository, ExamAttemptService service) {
        this.repository = repository;
        this.service = service;
    }

    @Scheduled(fixedDelayString = "${exam.deadline.interval-ms:5000}")
    public void finalizeDueAttempts() {
        for (ExamAttempt attempt : repository.findDueAttempts(BATCH_SIZE)) {
            try {
                service.expireAttempt(attempt.id(), attempt.studentId());
            } catch (RuntimeException exception) {
                // Each attempt has its own transaction. One failure must not
                // prevent the remaining batch from being processed.
                LOGGER.error("Deadline finalization failed: attemptId={}", attempt.id(), exception);
            }
        }
    }
}
