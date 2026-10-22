package vn.edu.hanu.exam;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.hanu.exam.domain.ExamStatus;
import vn.edu.hanu.exam.exception.ExamManagementException;
import vn.edu.hanu.exam.service.exam.CreateExamCommand;
import vn.edu.hanu.exam.service.exam.ExamDetails;
import vn.edu.hanu.exam.service.exam.ExamManagementService;

@SpringBootTest
@Transactional
class ExamManagementServiceIntegrationTests {
    @Autowired
    private ExamManagementService examService;

    @Autowired
    private NamedParameterJdbcTemplate jdbcTemplate;

    @Test
    void createPersistsDraftWithAuthenticatedTeacherAsCreator() {
        long teacherId = insertUser("TEACHER");

        ExamDetails created = examService.createExam(
                teacherId,
                new CreateExamCommand(" Java Midterm ", "Core Java", 60));

        assertTrue(created.id() > 0);
        assertEquals("Java Midterm", created.title());
        assertEquals(ExamStatus.DRAFT, created.status());
        assertEquals(teacherId, created.createdBy());
        assertEquals(created, examService.findByIdAndCreatedBy(created.id(), teacherId));
    }

    @Test
    void invalidTitleAndDurationAreRejected() {
        long teacherId = insertUser("TEACHER");

        assertCode("INVALID_EXAM_TITLE", () -> examService.createExam(
                teacherId, new CreateExamCommand("  ", null, 30)));
        assertCode("INVALID_EXAM_DURATION", () -> examService.createExam(
                teacherId, new CreateExamCommand("Exam", null, 0)));
        assertCode("INVALID_EXAM_DURATION", () -> examService.createExam(
                teacherId, new CreateExamCommand("Exam", null, -1)));
    }

    @Test
    void listAndGetNeverExposeAnotherTeachersExam() {
        long ownerId = insertUser("TEACHER");
        long otherTeacherId = insertUser("TEACHER");
        ExamDetails ownerExam = examService.createExam(
                ownerId, new CreateExamCommand("Owner exam", null, 45));
        examService.createExam(
                otherTeacherId, new CreateExamCommand("Other exam", null, 45));

        assertEquals(1, examService.findAllByCreatedBy(ownerId).exams().size());
        assertEquals(ownerExam.id(), examService.findAllByCreatedBy(ownerId).exams().getFirst().id());
        assertCode("EXAM_NOT_FOUND", () ->
                examService.findByIdAndCreatedBy(ownerExam.id(), otherTeacherId));
    }

    private long insertUser(String role) {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        String sql = """
                INSERT INTO users (username, password_hash, full_name, email, role)
                VALUES (:username, :passwordHash, :fullName, :email, :role)
                RETURNING id
                """;
        Long id = jdbcTemplate.queryForObject(sql, Map.of(
                "username", "user_" + suffix,
                "passwordHash", "test-hash",
                "fullName", "Exam Test User",
                "email", suffix + "@example.com",
                "role", role), Long.class);
        if (id == null) {
            throw new IllegalStateException("Test user ID was not returned.");
        }
        return id;
    }

    private void assertCode(String expectedCode, Runnable operation) {
        ExamManagementException exception = assertThrows(ExamManagementException.class, operation::run);
        assertEquals(expectedCode, exception.code());
    }
}
