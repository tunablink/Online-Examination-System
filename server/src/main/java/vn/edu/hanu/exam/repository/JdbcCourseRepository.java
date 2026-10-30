package vn.edu.hanu.exam.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import vn.edu.hanu.exam.service.course.CourseDetails;
import vn.edu.hanu.exam.service.course.CourseStatistics;
import vn.edu.hanu.exam.service.student.StudentDetails;

@Repository
public class JdbcCourseRepository implements CourseRepository {
    private static final String COURSE_SELECT = """
            SELECT c.id, c.teacher_id, c.code, c.name, c.subject, c.department,
                   c.academic_year, c.semester, c.description, c.archived, c.created_at,
                   (SELECT COUNT(*) FROM course_students cs JOIN users u ON u.id = cs.student_id
                    WHERE cs.course_id = c.id AND u.active = TRUE) AS student_count,
                   (SELECT COUNT(*) FROM exams e WHERE e.course_id = c.id AND e.status = 'PUBLISHED') AS exam_count
            FROM courses c
            """;
    private final NamedParameterJdbcTemplate jdbc;

    public JdbcCourseRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Override
    public CourseDetails create(long teacherId, String code, String name) {
        return create(teacherId, code, name, null, null, null, null, null);
    }

    @Override
    public CourseDetails create(long teacherId, String code, String name, String subject, String department,
            String academicYear, String semester, String description) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.update("""
                INSERT INTO courses (teacher_id, code, name, subject, department, academic_year, semester, description)
                VALUES (:teacherId, :code, :name, :subject, :department, :academicYear, :semester, :description)
                """,
                new MapSqlParameterSource().addValue("teacherId", teacherId).addValue("code", code).addValue("name", name)
                        .addValue("subject", subject).addValue("department", department)
                        .addValue("academicYear", academicYear).addValue("semester", semester)
                        .addValue("description", description),
                keys, new String[] {"id"});
        return findOwned(keys.getKey().longValue(), teacherId).orElseThrow();
    }

    @Override
    public CourseDetails update(long courseId, long teacherId, String name, String subject, String department,
            String academicYear, String semester, String description) {
        int changed = jdbc.update("""
                UPDATE courses SET name = :name, subject = :subject, department = :department,
                    academic_year = :academicYear, semester = :semester, description = :description
                WHERE id = :courseId AND teacher_id = :teacherId AND archived = FALSE
                """, new MapSqlParameterSource().addValue("courseId", courseId).addValue("teacherId", teacherId)
                .addValue("name", name).addValue("subject", subject).addValue("department", department)
                .addValue("academicYear", academicYear).addValue("semester", semester)
                .addValue("description", description));
        return changed == 1 ? findOwned(courseId, teacherId).orElseThrow() : null;
    }

    @Override
    public boolean setArchived(long courseId, long teacherId, boolean archived) {
        return jdbc.update("""
                UPDATE courses SET archived = :archived WHERE id = :courseId AND teacher_id = :teacherId
                """, Map.of("courseId", courseId, "teacherId", teacherId, "archived", archived)) == 1;
    }

    @Override
    public List<CourseDetails> findByTeacher(long teacherId) {
        return jdbc.query(COURSE_SELECT + " WHERE c.teacher_id = :teacherId ORDER BY c.created_at DESC, c.id DESC",
                Map.of("teacherId", teacherId), JdbcCourseRepository::mapCourse);
    }

    @Override
    public Optional<CourseDetails> findOwned(long courseId, long teacherId) {
        return jdbc.query(COURSE_SELECT + " WHERE c.id = :courseId AND c.teacher_id = :teacherId",
                Map.of("courseId", courseId, "teacherId", teacherId), JdbcCourseRepository::mapCourse).stream().findFirst();
    }

    @Override
    public List<StudentDetails> findStudents(long courseId) {
        return jdbc.query("""
                SELECT u.id, u.institutional_id, u.full_name, u.email, u.department, u.active, u.created_at
                FROM course_students cs JOIN users u ON u.id = cs.student_id
                WHERE cs.course_id = :courseId AND u.active = TRUE ORDER BY u.full_name, u.id
                """, Map.of("courseId", courseId), (rs, row) -> new StudentDetails(rs.getLong("id"),
                rs.getString("institutional_id"), rs.getString("full_name"), rs.getString("email"), rs.getString("department"),
                rs.getBoolean("active"), rs.getObject("created_at", OffsetDateTime.class)));
    }

    @Override
    public CourseStatistics statistics(long courseId) {
        Double average = jdbc.queryForObject("""
                SELECT AVG(a.score::double precision / a.max_score * 100)
                FROM exam_attempts a JOIN exams e ON e.id = a.exam_id
                WHERE e.course_id = :courseId AND a.status = 'SUBMITTED'
                    AND a.score IS NOT NULL AND a.max_score > 0
                """, Map.of("courseId", courseId), Double.class);
        var exams = jdbc.query("""
                SELECT e.id AS exam_id,
                    (SELECT COUNT(*) FROM questions q WHERE q.exam_id = e.id) AS question_count,
                    (SELECT COUNT(*) FROM exam_attempts a
                     WHERE a.exam_id = e.id AND a.status = 'SUBMITTED') AS submission_count
                FROM exams e WHERE e.course_id = :courseId
                """, Map.of("courseId", courseId), (rs, row) ->
                new CourseStatistics.ExamStatistics(rs.getLong("exam_id"),
                        rs.getLong("question_count"), rs.getLong("submission_count")));
        return new CourseStatistics(average, exams);
    }

    @Override
    public boolean enroll(long courseId, long studentId) {
        return jdbc.update("""
                INSERT INTO course_students (course_id, student_id)
                SELECT :courseId, u.id FROM users u WHERE u.id = :studentId AND u.role = 'STUDENT'
                ON CONFLICT DO NOTHING
                """, Map.of("courseId", courseId, "studentId", studentId)) == 1;
    }

    @Override
    public void lockEnrollment(long courseId, long studentId) {
        jdbc.query("""
                SELECT student_id FROM course_students
                WHERE course_id=:courseId AND student_id=:studentId FOR UPDATE
                """, Map.of("courseId", courseId, "studentId", studentId), (rs, row) -> rs.getLong("student_id"));
    }

    @Override
    public boolean unenroll(long courseId, long studentId) {
        return jdbc.update("""
                DELETE FROM course_students cs
                WHERE cs.course_id = :courseId AND cs.student_id = :studentId
                  AND NOT EXISTS (
                    SELECT 1 FROM exam_attempts a JOIN exams e ON e.id = a.exam_id
                    WHERE e.course_id = :courseId AND a.student_id = :studentId
                      AND a.status = 'IN_PROGRESS'
                  )
                """, Map.of("courseId", courseId, "studentId", studentId)) == 1;
    }

    @Override
    public boolean isEnrolled(long courseId, long studentId) {
        Boolean enrolled = jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM course_students WHERE course_id = :courseId AND student_id = :studentId)
                """, Map.of("courseId", courseId, "studentId", studentId), Boolean.class);
        return Boolean.TRUE.equals(enrolled);
    }

    private static CourseDetails mapCourse(ResultSet rs, int row) throws SQLException {
        return new CourseDetails(rs.getLong("id"), rs.getLong("teacher_id"), rs.getString("code"),
                rs.getString("name"), rs.getString("subject"), rs.getString("department"),
                rs.getString("academic_year"), rs.getString("semester"), rs.getString("description"),
                rs.getBoolean("archived"), rs.getLong("student_count"), rs.getLong("exam_count"),
                rs.getObject("created_at", OffsetDateTime.class));
    }
}
