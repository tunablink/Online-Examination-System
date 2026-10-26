package vn.edu.hanu.exam;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.hanu.exam.exception.StudentManagementException;
import vn.edu.hanu.exam.service.student.StudentDetails;
import vn.edu.hanu.exam.service.student.StudentManagementService;

@SpringBootTest
@Transactional
class StudentManagementServiceIntegrationTests {
    @Autowired
    private StudentManagementService studentService;

    @Autowired
    private NamedParameterJdbcTemplate jdbcTemplate;

    @Test
    void listReturnsOnlyStudentsInStableCreatedAtAndIdOrder() {
        OffsetDateTime baseTime = OffsetDateTime.parse("2026-10-26T10:00:00+07:00");
        long olderStudent = insertUser("STUDENT", "older", true, baseTime);
        long newerStudent = insertUser("STUDENT", "newer", false, baseTime.plusHours(1));
        long sameTimeStudent = insertUser("STUDENT", "same_time", true, baseTime.plusHours(1));
        long teacher = insertUser("TEACHER", "hidden_teacher", true, baseTime.plusHours(2));

        List<StudentDetails> students = studentService.findAllStudents().students();
        List<Long> ids = students.stream().map(StudentDetails::id).toList();

        assertTrue(ids.contains(olderStudent));
        assertTrue(ids.contains(newerStudent));
        assertTrue(ids.contains(sameTimeStudent));
        assertFalse(ids.contains(teacher));
        assertTrue(ids.indexOf(sameTimeStudent) < ids.indexOf(newerStudent));
        assertTrue(ids.indexOf(newerStudent) < ids.indexOf(olderStudent));
    }

    @Test
    void detailReturnsSafeStudentDataAndDoesNotExposeTeacherAccounts() {
        OffsetDateTime createdAt = OffsetDateTime.parse("2026-10-26T12:00:00+07:00");
        long studentId = insertUser("STUDENT", "detail_student", false, createdAt);
        long teacherId = insertUser("TEACHER", "detail_teacher", true, createdAt);

        StudentDetails details = studentService.findStudentById(studentId);

        assertEquals(studentId, details.id());
        assertTrue(details.username().startsWith("detail_student_"));
        assertEquals("Directory Test User", details.fullName());
        assertTrue(details.email().endsWith("@directory.example.com"));
        assertFalse(details.active());
        assertEquals(createdAt.toInstant(), details.createdAt().toInstant());
        assertNotFound(teacherId);
        assertNotFound(Long.MAX_VALUE);
        assertNotFound(0);
        assertNotFound(-1);
    }

    private long insertUser(String role, String prefix, boolean active, OffsetDateTime createdAt) {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        String sql = """
                INSERT INTO users
                    (username, password_hash, full_name, email, role, active, created_at, updated_at)
                VALUES
                    (:username, :passwordHash, :fullName, :email, :role, :active, :createdAt, :createdAt)
                RETURNING id
                """;
        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("username", prefix + "_" + suffix)
                .addValue("passwordHash", "sensitive-test-hash")
                .addValue("fullName", "Directory Test User")
                .addValue("email", suffix + "@directory.example.com")
                .addValue("role", role)
                .addValue("active", active)
                .addValue("createdAt", createdAt);
        Long id = jdbcTemplate.queryForObject(sql, parameters, Long.class);
        if (id == null) {
            throw new IllegalStateException("Database did not return a user ID.");
        }
        return id;
    }

    private void assertNotFound(long studentId) {
        StudentManagementException exception = assertThrows(
                StudentManagementException.class,
                () -> studentService.findStudentById(studentId));
        assertEquals("STUDENT_NOT_FOUND", exception.code());
        assertEquals("Student was not found.", exception.getMessage());
    }
}
