package vn.edu.hanu.exam.service.monitoring;

import java.time.OffsetDateTime;
import java.util.Map;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** All projections filter by the authenticated teacher inside SQL. */
@Service
public class TeacherMonitoringQuery {
    private final NamedParameterJdbcTemplate jdbc;

    public TeacherMonitoringQuery(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    public boolean ownsExam(long teacherId, long examId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM exams WHERE id=:exam AND created_by=:teacher)
                """, Map.of("exam", examId, "teacher", teacherId), Boolean.class));
    }

    @Transactional(readOnly = true)
    public TeacherMonitoringOverview read(long teacherId) {
        var params = Map.of("teacher", teacherId);
        var counts = jdbc.queryForMap("""
                SELECT COUNT(*) FILTER (WHERE a.status='IN_PROGRESS') AS active,
                       COUNT(*) FILTER (WHERE a.status IN ('SUBMITTED','EXPIRED')) AS completed
                FROM exam_attempts a JOIN exams e ON e.id=a.exam_id
                WHERE e.created_by=:teacher
                """, params);
        Long warnings = jdbc.queryForObject("""
                SELECT COUNT(*) FROM suspicious_activities sa
                JOIN exam_attempts a ON a.id=sa.attempt_id
                JOIN exams e ON e.id=a.exam_id
                WHERE e.created_by=:teacher AND sa.severity='WARNING'
                  AND sa.rule_code <> 'MULTIPLE_WARNING_THRESHOLD'
                """, params, Long.class);
        var activities = jdbc.query("""
                SELECT sa.id, sa.attempt_id, a.exam_id, e.title, a.student_id,
                       u.full_name, u.institutional_id, sa.rule_code, sa.severity,
                       sa.description, sa.occurred_at, sa.created_at
                FROM suspicious_activities sa
                JOIN exam_attempts a ON a.id=sa.attempt_id
                JOIN exams e ON e.id=a.exam_id JOIN users u ON u.id=a.student_id
                WHERE e.created_by=:teacher
                ORDER BY sa.occurred_at DESC, sa.id DESC LIMIT 501
                """, params, (rs, row) -> new TeacherMonitoringOverview.Activity(
                        rs.getLong("id"), rs.getLong("attempt_id"), rs.getLong("exam_id"),
                        rs.getString("title"), rs.getLong("student_id"), rs.getString("full_name"),
                        rs.getString("institutional_id"), rs.getString("rule_code"), rs.getString("severity"),
                        rs.getString("description"), rs.getObject("occurred_at", OffsetDateTime.class),
                        rs.getObject("created_at", OffsetDateTime.class)));
        return new TeacherMonitoringOverview(
                ((Number) counts.get("active")).longValue(),
                ((Number) counts.get("completed")).longValue(), warnings == null ? 0 : warnings,
                activities.subList(0, Math.min(500, activities.size())), activities.size() > 500,
                MonitoringService.INTERPRETATION);
    }
}
