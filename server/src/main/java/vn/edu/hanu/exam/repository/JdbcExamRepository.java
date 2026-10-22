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
