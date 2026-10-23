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
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.hanu.exam.domain.Exam;
import vn.edu.hanu.exam.domain.ExamStatus;
import vn.edu.hanu.exam.service.exam.ExamPublishReadiness;

@Repository
public class JdbcExamRepository implements ExamRepository {
    private static final String SELECT_COLUMNS = """
            SELECT id, title, description, duration_minutes, status,
                   created_by, created_at, updated_at
            FROM exams
            """;
    private static final RowMapper<Exam> EXAM_ROW_MAPPER = JdbcExamRepository::mapExam;

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public JdbcExamRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Exam create(String title, String description, int durationMinutes, long createdBy) {
        String sql = """
                INSERT INTO exams (title, description, duration_minutes, status, created_by)
                VALUES (:title, :description, :durationMinutes, :status, :createdBy)
                """;
        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("title", title)
                .addValue("description", description)
                .addValue("durationMinutes", durationMinutes)
                .addValue("status", ExamStatus.DRAFT.name())
                .addValue("createdBy", createdBy);
        KeyHolder keyHolder = new GeneratedKeyHolder();

        int affectedRows = jdbcTemplate.update(sql, parameters, keyHolder, new String[] {"id"});
        if (affectedRows != 1) {
            throw new IllegalStateException("Expected one inserted exam, but affected " + affectedRows + " rows.");
        }
        Number generatedId = keyHolder.getKey();
        if (generatedId == null) {
            throw new IllegalStateException("PostgreSQL did not return the generated exam ID.");
        }
        return findByIdAndCreatedBy(generatedId.longValue(), createdBy)
                .orElseThrow(() -> new IllegalStateException("The inserted exam could not be read back."));
    }

    @Override
    public List<Exam> findAllByCreatedBy(long createdBy) {
        String sql = SELECT_COLUMNS + """
                WHERE created_by = :createdBy
                ORDER BY created_at DESC, id DESC
                """;
        return jdbcTemplate.query(sql, Map.of("createdBy", createdBy), EXAM_ROW_MAPPER);
    }

    @Override
    public Optional<Exam> findByIdAndCreatedBy(long examId, long createdBy) {
        String sql = SELECT_COLUMNS + """
                WHERE id = :examId AND created_by = :createdBy
                """;
        List<Exam> exams = jdbcTemplate.query(
                sql,
                Map.of("examId", examId, "createdBy", createdBy),
                EXAM_ROW_MAPPER);
        return exams.stream().findFirst();
    }

    @Override
    public Optional<Exam> updateDraft(
            long examId,
            long teacherId,
            String title,
            String description,
            int durationMinutes) {
        String sql = """
                UPDATE exams
                SET title = :title,
                    description = :description,
                    duration_minutes = :durationMinutes,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :examId
                  AND created_by = :teacherId
                  AND status = 'DRAFT'
                """;
        int affectedRows = jdbcTemplate.update(sql, new MapSqlParameterSource()
                .addValue("examId", examId)
                .addValue("teacherId", teacherId)
                .addValue("title", title)
                .addValue("description", description)
                .addValue("durationMinutes", durationMinutes));
        return affectedRows == 1 ? findByIdAndCreatedBy(examId, teacherId) : Optional.empty();
    }

    @Override
    public ExamPublishReadiness getPublishReadiness(long examId, long teacherId) {
        String sql = """
                SELECT COUNT(*) AS question_count,
                       COUNT(*) FILTER (WHERE choice_count < 2) AS invalid_choice_count,
                       COUNT(*) FILTER (WHERE correct_count <> 1) AS invalid_correct_choice_count
                FROM (
                    SELECT q.id,
                           COUNT(c.id) AS choice_count,
                           COUNT(c.id) FILTER (WHERE c.correct = TRUE) AS correct_count
                    FROM questions q
                    JOIN exams e ON e.id = q.exam_id
                    LEFT JOIN choices c ON c.question_id = q.id
                    WHERE q.exam_id = :examId
                      AND e.created_by = :teacherId
                    GROUP BY q.id
                ) readiness
                """;
        return jdbcTemplate.queryForObject(
                sql,
                Map.of("examId", examId, "teacherId", teacherId),
                (resultSet, rowNumber) -> new ExamPublishReadiness(
                        resultSet.getInt("question_count"),
                        resultSet.getInt("invalid_choice_count"),
                        resultSet.getInt("invalid_correct_choice_count")));
    }

    @Override
    public Optional<Exam> publish(long examId, long teacherId) {
        return transitionStatus(examId, teacherId, ExamStatus.DRAFT, ExamStatus.PUBLISHED);
    }

    @Override
    public Optional<Exam> close(long examId, long teacherId) {
        return transitionStatus(examId, teacherId, ExamStatus.PUBLISHED, ExamStatus.CLOSED);
    }

    @Override
    @Transactional
    public void deleteDraft(long examId, long teacherId) {
        Map<String, Object> parameters = Map.of("examId", examId, "teacherId", teacherId);
        jdbcTemplate.update("""
                DELETE FROM choices
                WHERE question_id IN (
                    SELECT q.id
                    FROM questions q
                    JOIN exams e ON e.id = q.exam_id
                    WHERE q.exam_id = :examId
                      AND e.created_by = :teacherId
                      AND e.status = 'DRAFT'
                )
                """, parameters);
        jdbcTemplate.update("""
                DELETE FROM questions
                WHERE exam_id = :examId
                  AND EXISTS (
                      SELECT 1 FROM exams e
                      WHERE e.id = :examId
                        AND e.created_by = :teacherId
                        AND e.status = 'DRAFT'
                  )
                """, parameters);
        int affectedRows = jdbcTemplate.update("""
                DELETE FROM exams
                WHERE id = :examId
                  AND created_by = :teacherId
                  AND status = 'DRAFT'
                """, parameters);
        if (affectedRows != 1) {
            throw new IllegalStateException("Draft exam changed before it could be deleted.");
        }
    }

    private Optional<Exam> transitionStatus(
            long examId,
            long teacherId,
            ExamStatus expectedStatus,
            ExamStatus targetStatus) {
        String sql = """
                UPDATE exams
                SET status = :targetStatus,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :examId
                  AND created_by = :teacherId
                  AND status = :expectedStatus
                """;
        int affectedRows = jdbcTemplate.update(sql, Map.of(
                "examId", examId,
                "teacherId", teacherId,
                "expectedStatus", expectedStatus.name(),
                "targetStatus", targetStatus.name()));
        return affectedRows == 1 ? findByIdAndCreatedBy(examId, teacherId) : Optional.empty();
    }

    private static Exam mapExam(ResultSet resultSet, int rowNumber) throws SQLException {
        return new Exam(
                resultSet.getLong("id"),
                resultSet.getString("title"),
                resultSet.getString("description"),
                resultSet.getInt("duration_minutes"),
                ExamStatus.valueOf(resultSet.getString("status")),
                resultSet.getLong("created_by"),
                resultSet.getObject("created_at", OffsetDateTime.class),
                resultSet.getObject("updated_at", OffsetDateTime.class));
    }
}
