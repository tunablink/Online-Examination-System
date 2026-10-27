package vn.edu.hanu.exam.service.monitoring;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataAccessResourceFailureException;

import vn.edu.hanu.exam.domain.monitoring.ActivitySeverity;
import vn.edu.hanu.exam.domain.monitoring.ActivityType;
import vn.edu.hanu.exam.domain.monitoring.MonitoredAttempt;
import vn.edu.hanu.exam.domain.monitoring.MonitoringAttemptSnapshot;
import vn.edu.hanu.exam.domain.monitoring.MonitoringRule;
import vn.edu.hanu.exam.domain.monitoring.NewSuspiciousActivity;
import vn.edu.hanu.exam.domain.monitoring.SuspiciousActivity;
import vn.edu.hanu.exam.exception.MonitoringException;
import vn.edu.hanu.exam.repository.MonitoringRepository;

class MonitoringServiceTests {
    private static final long STUDENT_ID = 21L;
    private static final long TEACHER_ID = 7L;
    private static final long ATTEMPT_ID = 42L;
    private static final long EXAM_ID = 9L;

    private MonitoringRepository repository;
    private MonitoringService service;

    @BeforeEach
    void setUp() {
        repository = mock(MonitoringRepository.class);
        service = new MonitoringService(repository);
    }

    @Test
    void studentActivityIsRecordedAgainstOwnedAttempt() {
        stubOwnedAttempt();
        when(repository.saveActivity(any())).thenAnswer(invocation -> saved(1L, invocation.getArgument(0)));
        when(repository.countWarnings(ATTEMPT_ID)).thenReturn(1L);

        ActivityRecorded result = service.reportActivity(
                STUDENT_ID, new ReportActivityCommand(ATTEMPT_ID, ActivityType.TAB_HIDDEN));

        assertEquals(MonitoringRule.TAB_HIDDEN, result.activity().rule());
        assertEquals(ActivitySeverity.WARNING, result.activity().severity());
        assertEquals(1L, result.warningCount());
        assertNull(result.thresholdActivity());
        assertTrue(result.interpretation().contains("do not prove cheating"));
        verify(repository).lockAttemptOwnedByStudent(ATTEMPT_ID, STUDENT_ID);
    }

    @Test
    void studentCannotReportActivityForAnotherStudentsAttempt() {
        when(repository.lockAttemptOwnedByStudent(ATTEMPT_ID, STUDENT_ID)).thenReturn(Optional.empty());

        MonitoringException error = assertThrows(
                MonitoringException.class,
                () -> service.reportActivity(
                        STUDENT_ID, new ReportActivityCommand(ATTEMPT_ID, ActivityType.WINDOW_BLUR)));

        assertEquals("ATTEMPT_NOT_ACCESSIBLE", error.code());
        verify(repository, never()).saveActivity(any());
    }

    @Test
    void thirdWarningCreatesThresholdSignalExactlyOnce() {
        stubOwnedAttempt();
        when(repository.countWarnings(ATTEMPT_ID)).thenReturn(3L);
        when(repository.saveActivity(any())).thenAnswer(invocation -> {
            NewSuspiciousActivity activity = invocation.getArgument(0);
            long id = activity.rule() == MonitoringRule.MULTIPLE_WARNING_THRESHOLD ? 2L : 1L;
            return saved(id, activity);
        });

        ActivityRecorded result = service.reportActivity(
                STUDENT_ID, new ReportActivityCommand(ATTEMPT_ID, ActivityType.DISCONNECTED));

        assertEquals(MonitoringRule.MULTIPLE_WARNING_THRESHOLD, result.thresholdActivity().rule());
        ArgumentCaptor<NewSuspiciousActivity> captor = ArgumentCaptor.forClass(NewSuspiciousActivity.class);
        verify(repository, times(2)).saveActivity(captor.capture());
        assertEquals(
                List.of(MonitoringRule.DISCONNECTED, MonitoringRule.MULTIPLE_WARNING_THRESHOLD),
                captor.getAllValues().stream().map(NewSuspiciousActivity::rule).toList());
    }

    @Test
    void warningsAfterThresholdDoNotCreateDuplicateThresholdSignal() {
        stubOwnedAttempt();
        when(repository.countWarnings(ATTEMPT_ID)).thenReturn(4L);
        when(repository.saveActivity(any())).thenAnswer(invocation -> saved(1L, invocation.getArgument(0)));

        ActivityRecorded result = service.reportActivity(
                STUDENT_ID, new ReportActivityCommand(ATTEMPT_ID, ActivityType.WINDOW_BLUR));

        assertNull(result.thresholdActivity());
        verify(repository).saveActivity(any());
    }

    @Test
    void reconnectIsInformationalAndDoesNotCreateWarningOrMutateAttempt() {
        stubOwnedAttempt();
        when(repository.countWarnings(ATTEMPT_ID)).thenReturn(2L);
        when(repository.saveActivity(any())).thenAnswer(invocation -> saved(1L, invocation.getArgument(0)));

        ActivityRecorded result = service.reportActivity(
                STUDENT_ID, new ReportActivityCommand(ATTEMPT_ID, ActivityType.RECONNECTED));

        assertEquals(ActivitySeverity.INFO, result.activity().severity());
        assertEquals(2L, result.warningCount());
        assertNull(result.thresholdActivity());
        verify(repository).lockAttemptOwnedByStudent(ATTEMPT_ID, STUDENT_ID);
    }

    @Test
    void teacherCanOnlyReadOwnedExamMonitoring() {
        when(repository.isExamOwnedByTeacher(EXAM_ID, TEACHER_ID)).thenReturn(false);

        MonitoringException error = assertThrows(
                MonitoringException.class,
                () -> service.getExamMonitoring(TEACHER_ID, EXAM_ID));

        assertEquals("EXAM_NOT_ACCESSIBLE", error.code());
        verify(repository, never()).findExamMonitoring(EXAM_ID);
    }

    @Test
    void ownedExamReturnsOnlySafeMonitoringProjection() {
        MonitoringAttemptSnapshot snapshot = new MonitoringAttemptSnapshot(
                ATTEMPT_ID, STUDENT_ID, "student", "Student Name", "IN_PROGRESS",
                OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(30), 2L, null);
        when(repository.isExamOwnedByTeacher(EXAM_ID, TEACHER_ID)).thenReturn(true);
        when(repository.findExamMonitoring(EXAM_ID)).thenReturn(List.of(snapshot));

        ExamMonitoringSummary result = service.getExamMonitoring(TEACHER_ID, EXAM_ID);

        assertEquals(EXAM_ID, result.examId());
        assertEquals(List.of(snapshot), result.attempts());
        assertTrue(result.interpretation().contains("do not prove cheating"));
    }

    @Test
    void databaseFailureIsMappedWithoutLeakingDetails() {
        when(repository.isExamOwnedByTeacher(EXAM_ID, TEACHER_ID))
                .thenThrow(new DataAccessResourceFailureException("database secret"));

        MonitoringException error = assertThrows(
                MonitoringException.class,
                () -> service.getExamMonitoring(TEACHER_ID, EXAM_ID));

        assertEquals("DATABASE_ERROR", error.code());
        assertEquals("Monitoring data could not be processed.", error.getMessage());
    }

    private void stubOwnedAttempt() {
        when(repository.lockAttemptOwnedByStudent(ATTEMPT_ID, STUDENT_ID)).thenReturn(Optional.of(
                new MonitoredAttempt(
                        ATTEMPT_ID, EXAM_ID, STUDENT_ID, "IN_PROGRESS",
                        OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(30))));
    }

    private static SuspiciousActivity saved(long id, NewSuspiciousActivity activity) {
        return new SuspiciousActivity(
                id, activity.attemptId(), activity.rule(), activity.severity(),
                activity.description(), activity.occurredAt(), activity.occurredAt());
    }
}
