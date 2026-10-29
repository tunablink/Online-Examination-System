package vn.edu.hanu.exam.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import vn.edu.hanu.exam.domain.ExamStatus;
import vn.edu.hanu.exam.service.catalog.AvailableExamDetails;

@Repository
public class JdbcStudentExamCatalogRepository implements StudentExamCatalogRepository {
    private static final String PUBLISHED_STATUS = ExamStatus.PUBLISHED.name();
    private static final String SELECT_PUBLISHED_EXAM_METADATA = """
            SELECT e.id,
                   e.title,
                   e.description,
                   e.duration_minutes,
                   e.scheduled_at,
                   e.entry_closes_at,
                   e.assessment_type,
                   (SELECT name FROM courses WHERE courses.id = e.course_id) AS course_name,
                   COUNT(q.id) AS question_count,
                   COALESCE(SUM(q.points), 0) AS total_points
            FROM exams e
            LEFT JOIN questions q ON q.exam_id = e.id
            """;
    private static final String GROUP_BY_EXAM_METADATA = """
            GROUP BY e.id,
                     e.title,
                     e.description,
                     e.duration_minutes,
                     e.scheduled_at,
                     e.entry_closes_at,
                     e.assessment_type,
                     e.created_at
            """;
    private static final RowMapper<AvailableExamDetails> AVAILABLE_EXAM_ROW_MAPPER =
            JdbcStudentExamCatalogRepository::mapAvailableExam;

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public JdbcStudentExamCatalogRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public List<AvailableExamDetails> findAllPublished() {
        String sql = SELECT_PUBLISHED_EXAM_METADATA + """
                WHERE e.status = :publishedStatus
                """ + GROUP_BY_EXAM_METADATA + """
                ORDER BY e.created_at DESC, e.id DESC
                """;

        return jdbcTemplate.query(
                sql,
                Map.of("publishedStatus", PUBLISHED_STATUS),
                AVAILABLE_EXAM_ROW_MAPPER);
    }

    @Override
    public Optional<AvailableExamDetails> findPublishedById(long examId) {
        String sql = SELECT_PUBLISHED_EXAM_METADATA + """
                WHERE e.id = :examId
                  AND e.status = :publishedStatus
                """ + GROUP_BY_EXAM_METADATA;

        List<AvailableExamDetails> exams = jdbcTemplate.query(
                sql,
                Map.of("examId", examId, "publishedStatus", PUBLISHED_STATUS),
                AVAILABLE_EXAM_ROW_MAPPER);
        return exams.stream().findFirst();
    }

    @Override
    public List<AvailableExamDetails> findAllPublishedForStudent(long studentId) {
        String sql = SELECT_PUBLISHED_EXAM_METADATA + """
                WHERE e.status = :publishedStatus
                  AND e.course_id IS NOT NULL
                  AND EXISTS (
                    SELECT 1 FROM course_students cs WHERE cs.course_id = e.course_id AND cs.student_id = :studentId)
                """ + GROUP_BY_EXAM_METADATA + """
                HAVING COUNT(q.id) > 0
                ORDER BY e.created_at DESC, e.id DESC
                """;
        return jdbcTemplate.query(sql, Map.of("publishedStatus", PUBLISHED_STATUS, "studentId", studentId), AVAILABLE_EXAM_ROW_MAPPER);
    }

    @Override
    public Optional<AvailableExamDetails> findPublishedByIdForStudent(long examId, long studentId) {
        String sql = SELECT_PUBLISHED_EXAM_METADATA + """
                WHERE e.id = :examId AND e.status = :publishedStatus
                  AND e.course_id IS NOT NULL
                  AND EXISTS (
                    SELECT 1 FROM course_students cs WHERE cs.course_id = e.course_id AND cs.student_id = :studentId)
                """ + GROUP_BY_EXAM_METADATA + """
                HAVING COUNT(q.id) > 0
                """;
        return jdbcTemplate.query(sql, Map.of("examId", examId, "studentId", studentId, "publishedStatus", PUBLISHED_STATUS),
                AVAILABLE_EXAM_ROW_MAPPER).stream().findFirst();
    }

    private static AvailableExamDetails mapAvailableExam(ResultSet resultSet, int rowNumber)
            throws SQLException {
        return new AvailableExamDetails(
                resultSet.getLong("id"),
                resultSet.getString("title"),
                resultSet.getString("description"),
                resultSet.getInt("duration_minutes"),
                resultSet.getLong("question_count"),
                resultSet.getLong("total_points"),
                resultSet.getObject("scheduled_at", OffsetDateTime.class),
                resultSet.getString("course_name"),
                resultSet.getString("assessment_type"),
                resultSet.getObject("entry_closes_at", OffsetDateTime.class));
    }
}
