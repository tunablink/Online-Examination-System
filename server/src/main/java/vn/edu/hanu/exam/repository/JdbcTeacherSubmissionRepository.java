package vn.edu.hanu.exam.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.domain.attempt.AttemptStatus;
import vn.edu.hanu.exam.domain.submission.TeacherSubmission;

@Repository
public class JdbcTeacherSubmissionRepository
        implements TeacherSubmissionRepository {

    private static final RowMapper<TeacherSubmission> SUBMISSION_ROW_MAPPER =
            JdbcTeacherSubmissionRepository::mapSubmission;

    private static final String SELECT_SUBMISSION = """
            SELECT a.id AS attempt_id,
                   a.exam_id,
                   e.title AS exam_title,
                   a.student_id,
                   u.username,
                   u.full_name AS student_full_name,
                   a.status,
                   a.started_at,
                   a.deadline_at AS deadline,
                   a.submitted_at,
                   a.score,
                   a.max_score,
                   a.correct_answers,
                   a.total_questions
            FROM exam_attempts a
            INNER JOIN exams e ON e.id = a.exam_id
            INNER JOIN users u ON u.id = a.student_id
            """;

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public JdbcTeacherSubmissionRepository(
            NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public boolean existsExamOwnedByTeacher(long examId, long teacherId) {
        String sql = """
                SELECT EXISTS (
                    SELECT 1
                    FROM exams
                    WHERE id = :examId
                      AND created_by = :teacherId
                )
                """;

        Boolean exists = jdbcTemplate.queryForObject(
                sql,
                Map.of("examId", examId, "teacherId", teacherId),
                Boolean.class);

        return Boolean.TRUE.equals(exists);
    }

    @Override
    public List<TeacherSubmission> findByExamAndTeacher(
            long examId,
            long teacherId) {
        String sql = SELECT_SUBMISSION + """
                WHERE a.exam_id = :examId
                  AND e.created_by = :teacherId
                  AND u.role = :studentRole
                ORDER BY a.started_at DESC, a.id DESC
                """;

        return jdbcTemplate.query(
                sql,
                new MapSqlParameterSource()
                        .addValue("examId", examId)
                        .addValue("teacherId", teacherId)
                        .addValue("studentRole", UserRole.STUDENT.name()),
                SUBMISSION_ROW_MAPPER);
    }

    @Override
    public Optional<TeacherSubmission> findTerminalByAttemptAndTeacher(
            long attemptId,
            long teacherId) {
        String sql = SELECT_SUBMISSION + """
                WHERE a.id = :attemptId
                  AND e.created_by = :teacherId
                  AND u.role = :studentRole
                  AND a.status IN (:submittedStatus, :expiredStatus)
                """;

        return jdbcTemplate.query(
                sql,
                new MapSqlParameterSource()
                        .addValue("attemptId", attemptId)
                        .addValue("teacherId", teacherId)
                        .addValue("studentRole", UserRole.STUDENT.name())
                        .addValue(
                                "submittedStatus",
                                AttemptStatus.SUBMITTED.name())
                        .addValue(
                                "expiredStatus",
                                AttemptStatus.EXPIRED.name()),
                SUBMISSION_ROW_MAPPER)
                .stream()
                .findFirst();
    }

    private static TeacherSubmission mapSubmission(
            ResultSet resultSet,
            int rowNumber)
            throws SQLException {
        return new TeacherSubmission(
                resultSet.getLong("attempt_id"),
                resultSet.getLong("exam_id"),
                resultSet.getString("exam_title"),
                resultSet.getLong("student_id"),
                resultSet.getString("username"),
                resultSet.getString("student_full_name"),
                AttemptStatus.valueOf(resultSet.getString("status")),
                resultSet.getObject("started_at", OffsetDateTime.class),
                resultSet.getObject("deadline", OffsetDateTime.class),
                resultSet.getObject("submitted_at", OffsetDateTime.class),
                resultSet.getObject("score", Integer.class),
                resultSet.getObject("max_score", Integer.class),
                resultSet.getObject("correct_answers", Integer.class),
                resultSet.getObject("total_questions", Integer.class));
    }
}
