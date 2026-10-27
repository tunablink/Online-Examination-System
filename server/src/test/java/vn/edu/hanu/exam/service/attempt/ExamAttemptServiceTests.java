package vn.edu.hanu.exam.service.attempt;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import vn.edu.hanu.exam.domain.Exam;
import vn.edu.hanu.exam.domain.ExamStatus;
import vn.edu.hanu.exam.domain.attempt.AttemptStatus;
import vn.edu.hanu.exam.domain.attempt.AttemptScore;
import vn.edu.hanu.exam.domain.attempt.ExamAttempt;
import vn.edu.hanu.exam.domain.attempt.SavedAnswer;
import vn.edu.hanu.exam.domain.attempt.StoredAttemptResult;
import vn.edu.hanu.exam.exception.AttemptException;
import vn.edu.hanu.exam.repository.AttemptRepository;

class ExamAttemptServiceTests {
    private AttemptRepository repository;
    private ExamAttemptService service;

    @BeforeEach
    void setUp() {
        repository = mock(AttemptRepository.class);
        service = new ExamAttemptService(repository);
    }

    @Test
    void draftExamIsRejectedBeforeAttemptLookupOrCreation() {
        when(repository.findExamByIdForUpdate(12L)).thenReturn(Optional.of(sampleExam(ExamStatus.DRAFT)));

        AttemptException exception = assertThrows(
                AttemptException.class,
                () -> service.startExam(12L, 20L));

        assertEquals("EXAM_NOT_AVAILABLE", exception.code());
        verify(repository, never()).findInProgressByExamAndStudent(12L, 20L);
        verify(repository, never()).insertAttemptQuestions(31L, List.of());
    }

    @Test
    void anExistingActiveAttemptIsReturnedWithoutCreatingAnotherOne() {
        Exam exam = sampleExam(ExamStatus.PUBLISHED);
        ExamAttempt attempt = sampleAttempt();
        when(repository.findExamByIdForUpdate(12L)).thenReturn(Optional.of(exam));
        when(repository.findInProgressByExamAndStudent(12L, 20L)).thenReturn(Optional.of(attempt));
        when(repository.findAttemptQuestions(31L)).thenReturn(List.of());
        when(repository.findAttemptChoices(31L)).thenReturn(List.of());

        ExamAttemptDetails details = service.startExam(12L, 20L);

        assertEquals(31L, details.attemptId());
        assertEquals(attempt.deadline(), details.deadline());
        verify(repository, never()).insertAttempt(
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any());
        verify(repository, never()).insertAttemptQuestions(
                org.mockito.ArgumentMatchers.anyLong(),
                anyList());
    }

    @Test
    void publishedExamWithoutQuestionsIsRejectedAsNotReady() {
        when(repository.findExamByIdForUpdate(12L)).thenReturn(Optional.of(sampleExam(ExamStatus.PUBLISHED)));
        when(repository.findInProgressByExamAndStudent(12L, 20L)).thenReturn(Optional.empty());
        when(repository.findQuestionsByExamId(12L)).thenReturn(List.of());
        when(repository.findChoicesByExamId(12L)).thenReturn(List.of());

        AttemptException exception = assertThrows(
                AttemptException.class,
                () -> service.startExam(12L, 20L));

        assertEquals("EXAM_NOT_READY", exception.code());
        verify(repository, never()).insertAttempt(
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any());
    }

    @Test
    void anotherStudentsAttemptIsReportedAsNotFound() {
        when(repository.findByIdAndStudent(31L, 99L)).thenReturn(Optional.empty());

        AttemptException exception = assertThrows(
                AttemptException.class,
                () -> service.getAttempt(31L, 99L));

        assertEquals("ATTEMPT_NOT_FOUND", exception.code());
        verify(repository, never()).findExamById(12L);
    }

    @Test
    void validAnswerIsPersistedOnlyAfterOwnershipAndAttemptChoiceChecks() {
        ExamAttempt attempt = activeAttempt(AttemptStatus.IN_PROGRESS);
        when(repository.findByIdAndStudentForUpdate(31L, 20L)).thenReturn(Optional.of(attempt));
        when(repository.containsAttemptChoice(31L, 41L, 51L)).thenReturn(true);
        when(repository.upsertAnswer(anyLong(), anyLong(), anyLong(), any()))
                .thenAnswer(invocation -> new SavedAnswer(
                        invocation.getArgument(0),
                        invocation.getArgument(1),
                        invocation.getArgument(2),
                        invocation.getArgument(3)));

        SavedAnswerDetails saved = service.saveAnswer(31L, 41L, 51L, 20L);

        assertEquals(41L, saved.questionId());
        assertEquals(51L, saved.choiceId());
        verify(repository).upsertAnswer(anyLong(), anyLong(), anyLong(), any());
    }

    @Test
    void choiceOutsideTheAttemptSnapshotIsRejected() {
        when(repository.findByIdAndStudentForUpdate(31L, 20L))
                .thenReturn(Optional.of(activeAttempt(AttemptStatus.IN_PROGRESS)));
        when(repository.containsAttemptChoice(31L, 41L, 999L)).thenReturn(false);

        AttemptException exception = assertThrows(
                AttemptException.class,
                () -> service.saveAnswer(31L, 41L, 999L, 20L));

        assertEquals("INVALID_ANSWER", exception.code());
        verify(repository, never()).upsertAnswer(anyLong(), anyLong(), anyLong(), any());
    }

    @Test
    void activeAttemptIsScoredAndFinalizedOnce() {
        AttemptScore score = new AttemptScore(3, 5, 1, 2);
        OffsetDateTime submittedAt = OffsetDateTime.now();
        when(repository.findByIdAndStudentForUpdate(31L, 20L))
                .thenReturn(Optional.of(activeAttempt(AttemptStatus.IN_PROGRESS)));
        when(repository.calculateScore(31L)).thenReturn(score);
        when(repository.finalizeAttempt(anyLong(), any(), any(), any())).thenReturn(true);
        when(repository.findSubmissionResult(31L, 20L)).thenReturn(Optional.of(
                new StoredAttemptResult(
                        31L, 12L, AttemptStatus.SUBMITTED, submittedAt, 3, 5, 1, 2)));

        ExamSubmissionResult result = service.submitExam(31L, 20L);

        assertEquals(AttemptStatus.SUBMITTED, result.status());
        assertEquals(3, result.score());
        assertEquals(5, result.maxScore());
        verify(repository).finalizeAttempt(anyLong(), any(), any(), any());
    }

    @Test
    void duplicateSubmissionReturnsStoredResultWithoutGradingAgain() {
        OffsetDateTime submittedAt = OffsetDateTime.now();
        when(repository.findByIdAndStudentForUpdate(31L, 20L))
                .thenReturn(Optional.of(activeAttempt(AttemptStatus.SUBMITTED)));
        when(repository.findSubmissionResult(31L, 20L)).thenReturn(Optional.of(
                new StoredAttemptResult(
                        31L, 12L, AttemptStatus.SUBMITTED, submittedAt, 3, 5, 1, 2)));

        ExamSubmissionResult result = service.submitExam(31L, 20L);

        assertEquals(submittedAt, result.submittedAt());
        assertEquals(3, result.score());
        verify(repository, never()).calculateScore(31L);
        verify(repository, never()).finalizeAttempt(anyLong(), any(), any(), any());
    }

    private static Exam sampleExam(ExamStatus status) {
        OffsetDateTime createdAt = OffsetDateTime.parse("2026-10-27T01:00:00Z");
        return new Exam(
                12L,
                "Java Final",
                "Core Java",
                60,
                status,
                10L,
                createdAt,
                createdAt);
    }

    private static ExamAttempt sampleAttempt() {
        OffsetDateTime startedAt = OffsetDateTime.parse("2026-10-27T02:00:00Z");
        return new ExamAttempt(
                31L,
                12L,
                20L,
                AttemptStatus.IN_PROGRESS,
                startedAt,
                startedAt.plusMinutes(60));
    }

    private static ExamAttempt activeAttempt(AttemptStatus status) {
        OffsetDateTime startedAt = OffsetDateTime.now().minusMinutes(5);
        return new ExamAttempt(
                31L,
                12L,
                20L,
                status,
                startedAt,
                startedAt.plusMinutes(60));
    }
}
