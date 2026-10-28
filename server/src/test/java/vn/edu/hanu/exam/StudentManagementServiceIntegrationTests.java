package vn.edu.hanu.exam;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.hanu.exam.exception.StudentManagementException;
import vn.edu.hanu.exam.service.RegisterUserCommand;
import vn.edu.hanu.exam.service.RegisteredUser;
import vn.edu.hanu.exam.service.student.StudentAccountService;
import vn.edu.hanu.exam.service.student.StudentDetails;
import vn.edu.hanu.exam.service.student.StudentManagementService;

@SpringBootTest
@Transactional
class StudentManagementServiceIntegrationTests {
    @Autowired
    private StudentManagementService studentService;

    @Autowired
    private StudentAccountService studentAccounts;

    @Autowired
    private NamedParameterJdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

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
        assertFalse(ids.contains(newerStudent));
        assertTrue(ids.contains(sameTimeStudent));
        assertFalse(ids.contains(teacher));
        assertTrue(ids.indexOf(sameTimeStudent) < ids.indexOf(olderStudent));
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

    @Test
    void departmentEnteredWhenCreatingStudentIsReturnedForEdit() {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        RegisteredUser created = studentAccounts.create(new RegisterUserCommand(
                "dept_" + suffix, "StrongPassword123", "Department Student",
                suffix + "@directory.example.com"), "IT");

        StudentDetails details = studentService.findStudentById(created.id());
        assertEquals("IT", details.department());
    }

    @Test
    void teacherCanUpdateStudentDetailsAndDeactivateAccountWithoutDeletingHistory() {
        OffsetDateTime createdAt = OffsetDateTime.parse("2026-10-26T12:00:00+07:00");
        long studentId = insertUser("STUDENT", "editable_student", true, createdAt);
        long teacherId = insertUser("TEACHER", "protected_teacher", true, createdAt);

        String originalUsername = studentService.findStudentById(studentId).username();
        StudentManagementException missingDepartment = assertThrows(StudentManagementException.class,
                () -> studentService.updateStudent(studentId, originalUsername, "Updated Student",
                        "updated@example.com", "", "", ""));
        assertEquals("INVALID_DEPARTMENT", missingDepartment.code());
        assertEquals("Directory Test User", studentService.findStudentById(studentId).fullName());

        String newUsername = "edited_" + studentId;
        StudentDetails updated = studentService.updateStudent(studentId, newUsername, "Updated Student",
                "UPDATED@EXAMPLE.COM", "Computer Science", "NewPassword123", "NewPassword123");
        assertEquals(newUsername, updated.username());
        assertEquals("Updated Student", updated.fullName());
        assertEquals("updated@example.com", updated.email());
        assertEquals("Computer Science", updated.department());
        assertEquals(createdAt.toInstant(), updated.createdAt().toInstant());
        String passwordHash = jdbcTemplate.queryForObject("SELECT password_hash FROM users WHERE id = :id",
                new MapSqlParameterSource().addValue("id", studentId), String.class);
        assertTrue(passwordEncoder.matches("NewPassword123", passwordHash));

        StudentDetails renamed = studentService.updateStudent(studentId, newUsername, "Renamed Student",
                "updated@example.com", "Computer Science", "", "");
        assertEquals("Renamed Student", renamed.fullName());
        assertEquals(passwordHash, jdbcTemplate.queryForObject("SELECT password_hash FROM users WHERE id = :id",
                new MapSqlParameterSource().addValue("id", studentId), String.class));

        StudentManagementException teacherUpdate = assertThrows(StudentManagementException.class,
                () -> studentService.updateStudent(teacherId, "wrong_student", "Wrong Name",
                        "wrong@example.com", "Science", "", ""));
        assertEquals("STUDENT_NOT_FOUND", teacherUpdate.code());

        studentService.deactivateStudent(studentId);
        assertFalse(studentService.findStudentById(studentId).active());
        assertFalse(studentService.findAllStudents().students().stream().anyMatch(student -> student.id() == studentId));
        StudentManagementException repeatedDelete = assertThrows(StudentManagementException.class,
                () -> studentService.deactivateStudent(studentId));
        assertEquals("STUDENT_NOT_FOUND", repeatedDelete.code());
        assertNotFound(teacherId);
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
