package vn.edu.hanu.exam.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import vn.edu.hanu.exam.domain.monitoring.ActivitySeverity;
import vn.edu.hanu.exam.domain.monitoring.MonitoredAttempt;
import vn.edu.hanu.exam.domain.monitoring.MonitoringAttemptSnapshot;
import vn.edu.hanu.exam.domain.monitoring.MonitoringRule;
import vn.edu.hanu.exam.domain.monitoring.NewSuspiciousActivity;
import vn.edu.hanu.exam.domain.monitoring.SuspiciousActivity;

@Repository
public class JdbcMonitoringRepository implements MonitoringRepository {
    private final NamedParameterJdbcTemplate jdbcTemplate;

    public JdbcMonitoringRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Optional<MonitoredAttempt> lockAttemptOwnedByStudent(long attemptId, long studentId) {
        String sql = """
                SELECT id, exam_id, student_id, status,
                       deadline_at AS deadline
                FROM exam_attempts
                WHERE id = :attemptId
                  AND student_id = :studentId
                FOR UPDATE
                """;
        List<MonitoredAttempt> attempts = jdbcTemplate.query(
                sql,
                Map.of("attemptId", attemptId, "studentId", studentId),
                JdbcMonitoringRepository::mapAttempt);
        return attempts.stream().findFirst();
    }

    @Override
    public long countWarnings(long attemptId) {
        String sql = """
                SELECT COUNT(*)
                FROM suspicious_activities
                WHERE attempt_id = :attemptId
                  AND severity = :severity
                  AND rule_code <> :thresholdRule
                """;
        Long count = jdbcTemplate.queryForObject(
                sql,
                Map.of(
                        "attemptId", attemptId,
                        "severity", ActivitySeverity.WARNING.name(),
                        "thresholdRule", MonitoringRule.MULTIPLE_WARNING_THRESHOLD.name()),
                Long.class);
        return count == null ? 0L : count;
    }

    @Override
    public SuspiciousActivity saveActivity(NewSuspiciousActivity activity) {
        String sql = """
                INSERT INTO suspicious_activities (
                    attempt_id, rule_code, severity, description, occurred_at
                ) VALUES (
                    :attemptId, :ruleCode, :severity, :description, :occurredAt
                )
                RETURNING id, attempt_id, rule_code, severity, description,
                          occurred_at, created_at
                """;
        SuspiciousActivity saved = jdbcTemplate.queryForObject(
                sql,
                Map.of(
                        "attemptId", activity.attemptId(),
                        "ruleCode", activity.rule().name(),
                        "severity", activity.severity().name(),
                        "description", activity.description(),
                        "occurredAt", activity.occurredAt()),
                JdbcMonitoringRepository::mapActivity);
        if (saved == null) {
            throw new IllegalStateException("Expected one recorded monitoring activity.");
        }
        return saved;
    }

    @Override
    public boolean isExamOwnedByTeacher(long examId, long teacherId) {
        String sql = """
                SELECT EXISTS (
                    SELECT 1 FROM exams
                    WHERE id = :examId AND created_by = :teacherId
                )
                """;
        Boolean owned = jdbcTemplate.queryForObject(
                sql, Map.of("examId", examId, "teacherId", teacherId), Boolean.class);
        return Boolean.TRUE.equals(owned);
    }

    @Override
    public List<MonitoringAttemptSnapshot> findExamMonitoring(long examId) {
        String sql = """
                SELECT a.id AS attempt_id,
                       u.id AS student_id,
                       u.username AS student_username,
                       u.full_name AS student_full_name,
                       a.status AS attempt_status,
                       a.deadline_at AS deadline,
                       COUNT(sa.id) FILTER (
                           WHERE sa.severity = 'WARNING'
                             AND sa.rule_code <> 'MULTIPLE_WARNING_THRESHOLD'
                       ) AS warning_count,
                       latest.id AS latest_id,
                       latest.rule_code AS latest_rule_code,
                       latest.severity AS latest_severity,
                       latest.description AS latest_description,
                       latest.occurred_at AS latest_occurred_at,
                       latest.created_at AS latest_created_at
                FROM exam_attempts a
                JOIN users u ON u.id = a.student_id
                LEFT JOIN suspicious_activities sa ON sa.attempt_id = a.id
                LEFT JOIN LATERAL (
                    SELECT id, rule_code, severity, description, occurred_at, created_at
                    FROM suspicious_activities
                    WHERE attempt_id = a.id
                    ORDER BY occurred_at DESC, id DESC
                    LIMIT 1
                ) latest ON TRUE
                WHERE a.exam_id = :examId
                GROUP BY a.id, u.id, u.username, u.full_name, a.status, a.deadline_at,
                         latest.id, latest.rule_code, latest.severity, latest.description,
                         latest.occurred_at, latest.created_at
                ORDER BY a.id DESC
                """;
        return jdbcTemplate.query(
                sql, Map.of("examId", examId), JdbcMonitoringRepository::mapSnapshot);
    }

    private static MonitoredAttempt mapAttempt(ResultSet resultSet, int rowNumber) throws SQLException {
        return new MonitoredAttempt(
                resultSet.getLong("id"), resultSet.getLong("exam_id"),
                resultSet.getLong("student_id"), resultSet.getString("status"),
                resultSet.getObject("deadline", OffsetDateTime.class));
    }

    private static MonitoringAttemptSnapshot mapSnapshot(ResultSet resultSet, int rowNumber)
            throws SQLException {
        Long latestId = resultSet.getObject("latest_id", Long.class);
        SuspiciousActivity latest = latestId == null ? null : new SuspiciousActivity(
                latestId,
                resultSet.getLong("attempt_id"),
                MonitoringRule.valueOf(resultSet.getString("latest_rule_code")),
                ActivitySeverity.valueOf(resultSet.getString("latest_severity")),
                resultSet.getString("latest_description"),
                resultSet.getObject("latest_occurred_at", OffsetDateTime.class),
                resultSet.getObject("latest_created_at", OffsetDateTime.class));
        return new MonitoringAttemptSnapshot(
                resultSet.getLong("attempt_id"), resultSet.getLong("student_id"),
                resultSet.getString("student_username"), resultSet.getString("student_full_name"),
                resultSet.getString("attempt_status"),
                resultSet.getObject("deadline", OffsetDateTime.class),
                resultSet.getLong("warning_count"), latest);
    }

    private static SuspiciousActivity mapActivity(ResultSet resultSet, int rowNumber)
            throws SQLException {
        return new SuspiciousActivity(
                resultSet.getLong("id"),
                resultSet.getLong("attempt_id"),
                MonitoringRule.valueOf(resultSet.getString("rule_code")),
                ActivitySeverity.valueOf(resultSet.getString("severity")),
                resultSet.getString("description"),
                resultSet.getObject("occurred_at", OffsetDateTime.class),
                resultSet.getObject("created_at", OffsetDateTime.class));
    }
}
