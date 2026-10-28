package vn.edu.hanu.exam.service.attempt;

import static org.mockito.Mockito.*;

import java.time.OffsetDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;

import vn.edu.hanu.exam.domain.attempt.AttemptStatus;
import vn.edu.hanu.exam.domain.attempt.ExamAttempt;
import vn.edu.hanu.exam.repository.AttemptRepository;

class AttemptDeadlineWorkerTests {
    @Test
    void failedAttemptDoesNotStopTheRestOfTheBatch() {
        AttemptRepository repository = mock(AttemptRepository.class);
        ExamAttemptService service = mock(ExamAttemptService.class);
        OffsetDateTime now = OffsetDateTime.now();
        when(repository.findDueAttempts(100)).thenReturn(List.of(
                new ExamAttempt(1, 10, 20, AttemptStatus.IN_PROGRESS, now.minusHours(2), now.minusHours(1)),
                new ExamAttempt(2, 10, 21, AttemptStatus.IN_PROGRESS, now.minusHours(2), now.minusHours(1))));
        when(service.expireAttempt(1, 20)).thenThrow(new IllegalStateException("test failure"));

        new AttemptDeadlineWorker(repository, service).finalizeDueAttempts();

        verify(service).expireAttempt(1, 20);
        verify(service).expireAttempt(2, 21);
    }
}
