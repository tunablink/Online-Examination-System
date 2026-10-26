package vn.edu.hanu.exam.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import vn.edu.hanu.exam.domain.ExamStatus;
import vn.edu.hanu.exam.service.dashboard.RecentExamSummary;
import vn.edu.hanu.exam.service.dashboard.TeacherDashboardSummary;

@Repository
public class JdbcTeacherDashboardRepository implements TeacherDashboardRepository {
    private final NamedParameterJdbcTemplate jdbcTemplate;

    public JdbcTeacherDashboardRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public TeacherDashboardSummary findByTeacherId(long teacherId) {
        Map<String, Object> parameters = Map.of("teacherId", teacherId);
        String countSql = """
                SELECT COUNT(*) AS total_exams,
                       COUNT(*) FILTER (WHERE status = 'DRAFT') AS draft_exam_count,
                       COUNT(*) FILTER (WHERE status = 'PUBLISHED') AS published_exam_count,
                       COUNT(*) FILTER (WHERE status = 'CLOSED') AS closed_exam_count
                FROM exams
                WHERE created_by = :teacherId
                """;
        DashboardCounts counts = jdbcTemplate.queryForObject(
                countSql, parameters, JdbcTeacherDashboardRepository::mapCounts);
        if (counts == null) {
            throw new IllegalStateException("Dashboard count query returned no row.");
        }

        String recentSql = """
                SELECT e.id, e.title, e.description, e.duration_minutes, e.status,
                       COUNT(q.id) AS question_count, e.created_at, e.updated_at
                FROM exams e
                LEFT JOIN questions q ON q.exam_id = e.id
                WHERE e.created_by = :teacherId
                GROUP BY e.id, e.title, e.description, e.duration_minutes,
                         e.status, e.created_at, e.updated_at
                ORDER BY e.updated_at DESC, e.id DESC
                LIMIT 5
                """;
        List<RecentExamSummary> recentExams = jdbcTemplate.query(
                recentSql, parameters, JdbcTeacherDashboardRepository::mapRecentExam);

        return new TeacherDashboardSummary(
                counts.totalExams(), counts.draftExamCount(),
                counts.publishedExamCount(), counts.closedExamCount(), recentExams);
    }

    private static DashboardCounts mapCounts(ResultSet resultSet, int rowNumber) throws SQLException {
        return new DashboardCounts(
                resultSet.getLong("total_exams"),
                resultSet.getLong("draft_exam_count"),
                resultSet.getLong("published_exam_count"),
                resultSet.getLong("closed_exam_count"));
    }

    private static RecentExamSummary mapRecentExam(ResultSet resultSet, int rowNumber) throws SQLException {
        return new RecentExamSummary(
                resultSet.getLong("id"), resultSet.getString("title"),
                resultSet.getString("description"), resultSet.getInt("duration_minutes"),
                ExamStatus.valueOf(resultSet.getString("status")),
                resultSet.getLong("question_count"),
                resultSet.getObject("created_at", OffsetDateTime.class),
                resultSet.getObject("updated_at", OffsetDateTime.class));
    }

    private record DashboardCounts(
            long totalExams,
            long draftExamCount,
            long publishedExamCount,
            long closedExamCount) {
    }
}
