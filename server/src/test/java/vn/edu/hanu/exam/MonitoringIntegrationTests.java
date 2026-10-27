package vn.edu.hanu.exam;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import vn.edu.hanu.exam.domain.monitoring.ActivityType;
import vn.edu.hanu.exam.exception.MonitoringException;
import vn.edu.hanu.exam.service.monitoring.ActivityRecorded;
import vn.edu.hanu.exam.service.monitoring.ExamMonitoringSummary;
import vn.edu.hanu.exam.service.monitoring.MonitoringService;
import vn.edu.hanu.exam.service.monitoring.ReportActivityCommand;

@SpringBootTest
class MonitoringIntegrationTests {
    @Autowired
    private MonitoringService monitoringService;

    @Autowired
    private NamedParameterJdbcTemplate jdbcTemplate;

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
                INSERT INTO exams (title, duration_minutes, status, created_by)
                VALUES (:title, 60, 'PUBLISHED', :teacherId)
                RETURNING id
                """, Map.of("title", "Monitoring " + UUID.randomUUID(), "teacherId", teacherId), Long.class);
        OffsetDateTime startedAt = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(1);
        Long attemptId = jdbcTemplate.queryForObject("""
                INSERT INTO exam_attempts (
                    exam_id, student_id, status, started_at, deadline_at
                ) VALUES (
                    :examId, :studentId, 'IN_PROGRESS', :startedAt, :deadline
                )
                RETURNING id
                """, Map.of(
                        "examId", examId,
                        "studentId", studentId,
                        "startedAt", startedAt,
                        "deadline", startedAt.plusMinutes(60)), Long.class);
        if (examId == null || attemptId == null) {
            throw new IllegalStateException("Monitoring fixture IDs were not returned.");
        }
        return new Fixture(teacherId, studentId, examId, attemptId);
    }

    private long insertUser(String role) {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        Long id = jdbcTemplate.queryForObject("""
                INSERT INTO users (username, password_hash, full_name, email, role)
                VALUES (:username, 'test-hash', :fullName, :email, :role)
                RETURNING id
                """, Map.of(
                        "username", "monitor_" + suffix,
                        "fullName", "Monitoring User",
                        "email", suffix + "@example.com",
                        "role", role), Long.class);
        if (id == null) throw new IllegalStateException("Monitoring user ID was not returned.");
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
