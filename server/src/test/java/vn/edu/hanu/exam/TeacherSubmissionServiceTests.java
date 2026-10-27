package vn.edu.hanu.exam;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;

import vn.edu.hanu.exam.domain.attempt.AttemptStatus;
import vn.edu.hanu.exam.domain.submission.TeacherSubmission;
import vn.edu.hanu.exam.exception.TeacherSubmissionException;
import vn.edu.hanu.exam.repository.TeacherSubmissionRepository;
import vn.edu.hanu.exam.service.submission.TeacherSubmissionList;
import vn.edu.hanu.exam.service.submission.TeacherSubmissionService;

class TeacherSubmissionServiceTests {
    @Test
    void ownedExamCanReturnAnEmptyImmutableList() {
        TeacherSubmissionRepository repository = mock(TeacherSubmissionRepository.class);
        when(repository.existsExamOwnedByTeacher(7L, 3L)).thenReturn(true);
        List<TeacherSubmission> repositoryItems = new ArrayList<>();
        when(repository.findByExamAndTeacher(7L, 3L)).thenReturn(repositoryItems);
        TeacherSubmissionService service = new TeacherSubmissionService(repository);

        TeacherSubmissionList result = service.findExamSubmissions(7L, 3L);
        repositoryItems.add(sampleSubmission(AttemptStatus.IN_PROGRESS));

        assertEquals(List.of(), result.submissions());
        assertThrows(UnsupportedOperationException.class,
                () -> result.submissions().add(sampleSubmission(AttemptStatus.IN_PROGRESS)));
    }

    @Test
    void anotherTeachersExamUsesTheSameSafeNotFoundResponse() {
        TeacherSubmissionRepository repository = mock(TeacherSubmissionRepository.class);
        when(repository.existsExamOwnedByTeacher(7L, 3L)).thenReturn(false);
        TeacherSubmissionService service = new TeacherSubmissionService(repository);

        assertCode("EXAM_NOT_FOUND", () -> service.findExamSubmissions(7L, 3L));
        verify(repository, never()).findByExamAndTeacher(7L, 3L);
    }

    @Test
    void onlyRepositoryApprovedTerminalResultIsReturned() {
        TeacherSubmissionRepository repository = mock(TeacherSubmissionRepository.class);
        TeacherSubmission expected = sampleSubmission(AttemptStatus.SUBMITTED);
        when(repository.findTerminalByAttemptAndTeacher(11L, 3L)).thenReturn(Optional.of(expected));
        TeacherSubmissionService service = new TeacherSubmissionService(repository);

        assertEquals(expected, service.findSubmissionResult(11L, 3L));
        when(repository.findTerminalByAttemptAndTeacher(12L, 3L)).thenReturn(Optional.empty());
        assertCode("SUBMISSION_RESULT_NOT_FOUND", () -> service.findSubmissionResult(12L, 3L));
    }

    @Test
    void invalidIdsAreRejectedWithoutRepositoryAccess() {
        TeacherSubmissionRepository repository = mock(TeacherSubmissionRepository.class);
        TeacherSubmissionService service = new TeacherSubmissionService(repository);

        assertCode("EXAM_NOT_FOUND", () -> service.findExamSubmissions(0L, 3L));
        assertCode("SUBMISSION_RESULT_NOT_FOUND", () -> service.findSubmissionResult(-1L, 3L));
        verify(repository, never()).existsExamOwnedByTeacher(0L, 3L);
        verify(repository, never()).findTerminalByAttemptAndTeacher(-1L, 3L);
    }

    @Test
    void databaseDetailsAreNotExposed() {
        TeacherSubmissionRepository repository = mock(TeacherSubmissionRepository.class);
        when(repository.existsExamOwnedByTeacher(7L, 3L))
                .thenThrow(new DataAccessResourceFailureException("secret SQL"));
        TeacherSubmissionService service = new TeacherSubmissionService(repository);

        TeacherSubmissionException error = assertThrows(
                TeacherSubmissionException.class,
                () -> service.findExamSubmissions(7L, 3L));

        assertEquals("DATABASE_ERROR", error.code());
        assertEquals("Submission information could not be read.", error.getMessage());
        assertFalse(error.getMessage().contains("secret"));
    }

    @Test
    void readModelContainsOnlyRequiredSafeFields() {
        Set<String> fields = Arrays.stream(TeacherSubmission.class.getRecordComponents())
                .map(component -> component.getName())
                .collect(Collectors.toSet());

        assertEquals(Set.of(
                "attemptId", "examId", "examTitle", "studentId", "username",
                "studentFullName", "status", "startedAt", "deadline", "submittedAt",
                "score", "maxScore", "correctAnswers", "totalQuestions"), fields);
        assertFalse(fields.contains("passwordHash"));
        assertFalse(fields.contains("correctChoice"));
    }

    private static TeacherSubmission sampleSubmission(AttemptStatus status) {
        OffsetDateTime started = OffsetDateTime.parse("2026-10-27T08:00:00Z");
        boolean terminal = status != AttemptStatus.IN_PROGRESS;
        return new TeacherSubmission(
                11L, 7L, "Java", 5L, "student", "Student One", status,
                started, started.plusHours(1), terminal ? started.plusMinutes(30) : null,
                terminal ? 8 : null, terminal ? 10 : null, terminal ? 4 : null, terminal ? 5 : null);
    }

    private static void assertCode(String code, Runnable operation) {
        TeacherSubmissionException error = assertThrows(
                TeacherSubmissionException.class,
                operation::run);
        assertEquals(code, error.code());
    }
}
