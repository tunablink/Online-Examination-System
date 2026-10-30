package vn.edu.hanu.exam;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.TextMessage;
import org.mockito.ArgumentCaptor;

import vn.edu.hanu.exam.domain.monitoring.ActivityType;
import vn.edu.hanu.exam.exception.MonitoringException;
import vn.edu.hanu.exam.service.monitoring.ActivityRecorded;
import vn.edu.hanu.exam.service.monitoring.ExamMonitoringSummary;
import vn.edu.hanu.exam.service.monitoring.MonitoringService;
import vn.edu.hanu.exam.service.monitoring.ReportActivityCommand;
import vn.edu.hanu.exam.service.monitoring.TeacherMonitoringQuery;
import vn.edu.hanu.exam.websocket.MonitoringPushHub;
import vn.edu.hanu.exam.session.AuthenticatedSessionRegistry;
import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.service.LoggedInUser;

@SpringBootTest(properties = "exam.deadline.enabled=false")
class MonitoringIntegrationTests {
    @Autowired
    private MonitoringService monitoringService;

    @Autowired
    private NamedParameterJdbcTemplate jdbcTemplate;

    @Autowired
    private MonitoringPushHub pushHub;
    @Autowired
    private AuthenticatedSessionRegistry sessions;
    @Autowired
    private PlatformTransactionManager transactions;
    @Autowired
    private TeacherMonitoringQuery overview;
    @Autowired
    private vn.edu.hanu.exam.session.SessionResumeService resumeService;

    private final List<Long> createdUserIds = new ArrayList<>();
    private final List<Long> createdExamIds = new ArrayList<>();
    private final List<Long> createdAttemptIds = new ArrayList<>();

    @AfterEach
    void cleanUpTestData() {
        TransactionTemplate cleanupTransaction = new TransactionTemplate(transactions);

        cleanupTransaction.executeWithoutResult(status -> {
            if (!createdAttemptIds.isEmpty()) {
                Map<String, Object> params = Map.of("ids", createdAttemptIds);

                // Xóa các bảng con trước khi xóa attempt.
                jdbcTemplate.update("""
                        DELETE FROM suspicious_activities
                        WHERE attempt_id IN (:ids)
                        """, params);

                jdbcTemplate.update("""
                        DELETE FROM attempt_answers
                        WHERE attempt_id IN (:ids)
                        """, params);

                jdbcTemplate.update("""
                        DELETE FROM attempt_choices
                        WHERE attempt_id IN (:ids)
                        """, params);

                jdbcTemplate.update("""
                        DELETE FROM attempt_questions
                        WHERE attempt_id IN (:ids)
                        """, params);

                jdbcTemplate.update("""
                        DELETE FROM exam_attempts
                        WHERE id IN (:ids)
                        """, params);
            }

            if (!createdExamIds.isEmpty()) {
                jdbcTemplate.update("""
                        DELETE FROM exams
                        WHERE id IN (:ids)
                        """, Map.of("ids", createdExamIds));
            }

            if (!createdUserIds.isEmpty()) {
                jdbcTemplate.update("""
                        DELETE FROM users
                        WHERE id IN (:ids)
                        """, Map.of("ids", createdUserIds));
            }
        });

        createdAttemptIds.clear();
        createdExamIds.clear();
        createdUserIds.clear();
    }

    @Test
    void pushOccursAfterCommitOnlyAndOverviewFiltersTeacherOwnership() throws Exception {
        Fixture fixture = createFixture();
        WebSocketSession owner = mock(WebSocketSession.class);
        String sessionId = UUID.randomUUID().toString();
        when(owner.getId()).thenReturn(sessionId);
        when(owner.isOpen()).thenReturn(true);
        sessions.authenticate(sessionId,
                new LoggedInUser(fixture.teacherId(), "owner", "Owner", "o@example.com", UserRole.TEACHER));
        resumeService.issue(sessionId,
                new LoggedInUser(fixture.teacherId(), "owner", "Owner", "o@example.com", UserRole.TEACHER));
        pushHub.watch(owner, fixture.examId(), Map.of("live", true));
        try {
            var transaction = new TransactionTemplate(transactions);
            transaction.executeWithoutResult(status -> {
                monitoringService.reportActivity(fixture.studentId(),
                        new ReportActivityCommand(fixture.attemptId(), ActivityType.TAB_HIDDEN));
                try {
                    verify(owner, never()).sendMessage(any());
                } catch (java.io.IOException exception) {
                    throw new IllegalStateException(exception);
                }
            });
            ArgumentCaptor<TextMessage> message = ArgumentCaptor.forClass(TextMessage.class);
            verify(owner).sendMessage(message.capture());
            assertTrue(message.getValue().getPayload().contains("EXAM_MONITORING"));
            assertTrue(message.getValue().getPayload().contains("TAB_HIDDEN"));
            assertEquals(1, overview.read(fixture.teacherId()).warningEvents());
            assertEquals(fixture.examId(), overview.read(fixture.teacherId()).activities().getFirst().examId());
            assertEquals(0, overview.read(-1).activities().size());

            clearInvocations(owner);
            transaction.executeWithoutResult(status -> {
                monitoringService.reportActivity(fixture.studentId(),
                        new ReportActivityCommand(fixture.attemptId(), ActivityType.WINDOW_BLUR));
                status.setRollbackOnly();
            });
            verify(owner, never()).sendMessage(any());
            assertEquals(1, activityCount(fixture.attemptId()));
        } finally {
            pushHub.remove(sessionId);
            sessions.remove(sessionId);
            resumeService.revoke(sessionId);
        }
    }

    @Test
    void activityIsPersistedAndVisibleToOwningTeacher() {
        Fixture fixture = createFixture();

        ActivityRecorded recorded = monitoringService.reportActivity(
                fixture.studentId(),
                new ReportActivityCommand(fixture.attemptId(), ActivityType.TAB_HIDDEN));
        ExamMonitoringSummary monitoring = monitoringService.getExamMonitoring(
                fixture.teacherId(), fixture.examId());

        assertNotNull(recorded.activity());
        assertEquals(1L, recorded.warningCount());
        assertEquals(1, monitoring.attempts().size());
        assertEquals(fixture.studentId(), monitoring.attempts().getFirst().studentId());
        assertEquals(1L, monitoring.attempts().getFirst().warningCount());
        assertEquals("TAB_HIDDEN",
                monitoring.attempts().getFirst().latestSuspiciousActivity().rule().name());
    }

    @Test
    void failedThresholdInsertRollsBackTheTriggeringWarning() {
        Fixture fixture = createFixture();
        insertActivity(fixture.attemptId(), "TAB_HIDDEN", "WARNING");
        insertActivity(fixture.attemptId(), "WINDOW_BLUR", "WARNING");
        insertActivity(fixture.attemptId(), "MULTIPLE_WARNING_THRESHOLD", "WARNING");
        long before = activityCount(fixture.attemptId());

        MonitoringException error = assertThrows(
                MonitoringException.class,
                () -> monitoringService.reportActivity(
                        fixture.studentId(),
                        new ReportActivityCommand(fixture.attemptId(), ActivityType.DISCONNECTED)));

        assertEquals("DATABASE_ERROR", error.code());
        assertEquals(before, activityCount(fixture.attemptId()));
    }

    @Test
    void anotherTeacherCannotReadExamMonitoring() {
        Fixture fixture = createFixture();
        long otherTeacherId = insertUser("TEACHER");

        MonitoringException error = assertThrows(
                MonitoringException.class,
                () -> monitoringService.getExamMonitoring(otherTeacherId, fixture.examId()));

        assertEquals("EXAM_NOT_ACCESSIBLE", error.code());
    }

    private Fixture createFixture() {
        long teacherId = insertUser("TEACHER");
        long studentId = insertUser("STUDENT");

        Long examId = jdbcTemplate.queryForObject("""
                INSERT INTO exams (
                    title,
                    duration_minutes,
                    status,
                    created_by
                )
                VALUES (
                    :title,
                    60,
                    'PUBLISHED',
                    :teacherId
                )
                RETURNING id
                """,
                Map.of(
                        "title", "Monitoring " + UUID.randomUUID(),
                        "teacherId", teacherId),
                Long.class);

        if (examId == null) {
            throw new IllegalStateException(
                    "Monitoring exam ID was not returned.");
        }

        createdExamIds.add(examId);

        OffsetDateTime startedAt = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(1);

        Long attemptId = jdbcTemplate.queryForObject("""
                INSERT INTO exam_attempts (
                    exam_id,
                    student_id,
                    status,
                    started_at,
                    deadline_at
                )
                VALUES (
                    :examId,
                    :studentId,
                    'IN_PROGRESS',
                    :startedAt,
                    :deadline
                )
                RETURNING id
                """,
                Map.of(
                        "examId", examId,
                        "studentId", studentId,
                        "startedAt", startedAt,
                        "deadline", startedAt.plusMinutes(60)),
                Long.class);

        if (attemptId == null) {
            throw new IllegalStateException(
                    "Monitoring attempt ID was not returned.");
        }

        createdAttemptIds.add(attemptId);

        return new Fixture(
                teacherId,
                studentId,
                examId,
                attemptId);
    }

    private long insertUser(String role) {
        String suffix = UUID.randomUUID()
                .toString()
                .replace("-", "");

        Long id = jdbcTemplate.queryForObject("""
                INSERT INTO users (
                    institutional_id,
                    password_hash,
                    full_name,
                    email,
                    role
                )
                VALUES (
                    :institutionalId,
                    'test-hash',
                    :fullName,
                    :email,
                    :role
                )
                RETURNING id
                """,
                Map.of(
                        "institutionalId", "monitor_" + suffix,
                        "fullName", "Monitoring User",
                        "email", suffix + "@example.com",
                        "role", role),
                Long.class);

        if (id == null) {
            throw new IllegalStateException(
                    "Monitoring user ID was not returned.");
        }

        createdUserIds.add(id);
        return id;
    }

    private void insertActivity(long attemptId, String rule, String severity) {
        jdbcTemplate.update("""
                INSERT INTO suspicious_activities (
                    attempt_id, rule_code, severity, description, occurred_at
                ) VALUES (:attemptId, :rule, :severity, 'Test signal', CURRENT_TIMESTAMP)
                """, Map.of("attemptId", attemptId, "rule", rule, "severity", severity));
    }

    private long activityCount(long attemptId) {
        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM suspicious_activities WHERE attempt_id = :attemptId",
                Map.of("attemptId", attemptId), Long.class);
        return count == null ? 0 : count;
    }

    private record Fixture(long teacherId, long studentId, long examId, long attemptId) {
    }
}
