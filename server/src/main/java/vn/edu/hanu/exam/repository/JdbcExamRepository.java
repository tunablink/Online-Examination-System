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

import vn.edu.hanu.exam.domain.Exam;
import vn.edu.hanu.exam.domain.ExamStatus;

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
            int durationMinutes
    ) {
        String sql = """
                UPDATE exams
                SET title = :title,
                    description = :description,
                    duration_minutes = :durationMinutes,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :examId
                AND created_by = :teacherId
                AND status = :status
                """;

        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("examId", examId)
                .addValue("teacherId", teacherId)
                .addValue("title", title)
                .addValue("description", description)
                .addValue("durationMinutes", durationMinutes)
                .addValue("status", ExamStatus.DRAFT.name());

        int affectedRows = jdbcTemplate.update(sql, parameters);

        if (affectedRows == 0) {
            return Optional.empty();
        }

        if (affectedRows != 1) {
            throw new IllegalStateException(
                    "Expected one updated exam, but affected "
                            + affectedRows
                            + " rows."
            );
        }

        return findByIdAndCreatedBy(examId, teacherId);
    }

    @Override
    public ExamPublishReadiness getPublishReadiness(long examId) {
        String sql = """
                SELECT COUNT(*) AS question_count,
                       COALESCE(SUM(
                           CASE WHEN choice_count < 2 THEN 1 ELSE 0 END
                       ), 0) AS invalid_choice_count,
                       COALESCE(SUM(
                           CASE WHEN correct_choice_count <> 1 THEN 1 ELSE 0 END
                       ), 0) AS invalid_correct_choice_count
                FROM (
                    SELECT q.id,
                           COUNT(c.id) AS choice_count,
                           COUNT(c.id) FILTER (WHERE c.correct) AS correct_choice_count
                    FROM questions q
                    LEFT JOIN choices c ON c.question_id = q.id
                    WHERE q.exam_id = :examId
                    GROUP BY q.id
                ) question_statistics
                """;

        ExamPublishReadiness readiness = jdbcTemplate.queryForObject(
                sql,
                Map.of("examId", examId),
                (resultSet, rowNumber) -> new ExamPublishReadiness(
                        resultSet.getInt("question_count"),
                        resultSet.getInt("invalid_choice_count"),
                        resultSet.getInt("invalid_correct_choice_count")));

        if (readiness == null) {
            throw new IllegalStateException("Publish readiness query did not return a result.");
        }

        return readiness;
    }

    @Override
    public Optional<Exam> publishDraft(long examId, long teacherId) {
        String sql = """
                UPDATE exams
                SET status = :publishedStatus,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :examId
                  AND created_by = :teacherId
                  AND status = :draftStatus
                """;

        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("examId", examId)
                .addValue("teacherId", teacherId)
                .addValue("publishedStatus", ExamStatus.PUBLISHED.name())
                .addValue("draftStatus", ExamStatus.DRAFT.name());

        int affectedRows = jdbcTemplate.update(sql, parameters);

        if (affectedRows == 0) {
            return Optional.empty();
        }

        if (affectedRows != 1) {
            throw new IllegalStateException(
                    "Expected one published exam, but affected " + affectedRows + " rows.");
        }

        return findByIdAndCreatedBy(examId, teacherId);
    }

    @Override
    public Optional<Exam> closePublished(long examId, long teacherId) {
        String sql = """
                UPDATE exams
                SET status = :closedStatus,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :examId
                  AND created_by = :teacherId
                  AND status = :publishedStatus
                """;

        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("examId", examId)
                .addValue("teacherId", teacherId)
                .addValue("closedStatus", ExamStatus.CLOSED.name())
                .addValue("publishedStatus", ExamStatus.PUBLISHED.name());

        int affectedRows = jdbcTemplate.update(sql, parameters);

        if (affectedRows == 0) {
            return Optional.empty();
        }

        if (affectedRows != 1) {
            throw new IllegalStateException(
                    "Expected one closed exam, but affected " + affectedRows + " rows.");
        }

        return findByIdAndCreatedBy(examId, teacherId);
    }

    @Override
    public int deleteChoicesByExamId(long examId) {
        String sql = """
                DELETE FROM choices
                WHERE question_id IN (
                    SELECT id
                    FROM questions
                    WHERE exam_id = :examId
                )
                """;
        return jdbcTemplate.update(sql, Map.of("examId", examId));
    }

    @Override
    public int deleteQuestionsByExamId(long examId) {
        String sql = """
                DELETE FROM questions
                WHERE exam_id = :examId
                """;
        return jdbcTemplate.update(sql, Map.of("examId", examId));
    }

    @Override
    public boolean deleteDraft(long examId, long teacherId) {
        String sql = """
                DELETE FROM exams
                WHERE id = :examId
                  AND created_by = :teacherId
                  AND status = :draftStatus
                """;

        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("examId", examId)
                .addValue("teacherId", teacherId)
                .addValue("draftStatus", ExamStatus.DRAFT.name());

        int affectedRows = jdbcTemplate.update(sql, parameters);

        if (affectedRows > 1) {
            throw new IllegalStateException(
                    "Expected at most one deleted exam, but affected " + affectedRows + " rows.");
        }

        return affectedRows == 1;
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
