package vn.edu.hanu.exam;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
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

import vn.edu.hanu.exam.domain.attempt.AttemptStatus;
import vn.edu.hanu.exam.domain.submission.TeacherSubmission;
import vn.edu.hanu.exam.exception.TeacherSubmissionException;
import vn.edu.hanu.exam.service.submission.TeacherSubmissionService;

@SpringBootTest
@Transactional
class TeacherSubmissionServiceIntegrationTests {
    @Autowired
    private TeacherSubmissionService service;

    @Autowired
    private NamedParameterJdbcTemplate jdbcTemplate;

    @Test
    void ownedExamListPreservesNullProgressAndUsesStableNewestFirstOrder() {
        long teacher = insertUser("TEACHER", "owner");
        long student = insertUser("STUDENT", "learner");
        long exam = insertExam(teacher, "Submission Review");
        OffsetDateTime start = OffsetDateTime.parse("2026-10-27T08:00:00+07:00");
        long older = insertAttempt(exam, student, AttemptStatus.SUBMITTED, start, 8, 10, 4, 5);
        long newer = insertAttempt(exam, student, AttemptStatus.IN_PROGRESS, start.plusMinutes(5), null, null, null, null);

        List<TeacherSubmission> submissions = service.findExamSubmissions(exam, teacher).submissions();

        assertEquals(List.of(newer, older), submissions.stream().map(TeacherSubmission::attemptId).toList());
        TeacherSubmission progress = submissions.get(0);
        assertEquals(AttemptStatus.IN_PROGRESS, progress.status());
        assertNull(progress.submittedAt());
        assertNull(progress.score());
        assertNull(progress.maxScore());
        assertNull(progress.correctAnswers());
        assertNull(progress.totalQuestions());
        assertEquals("Submission Review", progress.examTitle());
        assertEquals("Submission Test User", progress.studentFullName());
    }

    @Test
    void ownershipAndTerminalStatusAreEnforcedInsideReadQueries() {
        long owner = insertUser("TEACHER", "owner");
        long anotherTeacher = insertUser("TEACHER", "other");
        long student = insertUser("STUDENT", "student");
        long exam = insertExam(owner, "Owned Exam");
        OffsetDateTime start = OffsetDateTime.parse("2026-10-27T09:00:00Z");
        long submitted = insertAttempt(exam, student, AttemptStatus.SUBMITTED, start, 7, 9, 3, 4);
        long expired = insertAttempt(exam, student, AttemptStatus.EXPIRED, start.plusMinutes(1), 5, 9, 2, 4);
        long progress = insertAttempt(exam, student, AttemptStatus.IN_PROGRESS, start.plusMinutes(2), null, null, null, null);

        TeacherSubmission submittedResult = service.findSubmissionResult(submitted, owner);
        TeacherSubmission expiredResult = service.findSubmissionResult(expired, owner);
        assertEquals(AttemptStatus.SUBMITTED, submittedResult.status());
        assertEquals(7, submittedResult.score());
        assertEquals(AttemptStatus.EXPIRED, expiredResult.status());
        assertEquals(5, expiredResult.score());

        assertCode("EXAM_NOT_FOUND", () -> service.findExamSubmissions(exam, anotherTeacher));
        assertCode("SUBMISSION_RESULT_NOT_FOUND", () -> service.findSubmissionResult(submitted, anotherTeacher));
        assertCode("SUBMISSION_RESULT_NOT_FOUND", () -> service.findSubmissionResult(progress, owner));
    }

    private long insertUser(String role, String prefix) {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        String sql = """
                INSERT INTO users (username, password_hash, full_name, email, role, active)
                VALUES (:username, :passwordHash, :fullName, :email, :role, TRUE)
                RETURNING id
                """;
        Long id = jdbcTemplate.queryForObject(
                sql,
                new MapSqlParameterSource()
                        .addValue("username", prefix + "_" + suffix)
                        .addValue("passwordHash", "sensitive-hash")
                        .addValue("fullName", "Submission Test User")
                        .addValue("email", suffix + "@submission.example.com")
                        .addValue("role", role),
                Long.class);
        return requireId(id);
    }

    private long insertExam(long teacherId, String title) {
        String sql = """
                INSERT INTO exams (title, duration_minutes, status, created_by)
                VALUES (:title, 60, 'PUBLISHED', :teacherId)
                RETURNING id
                """;
        return requireId(jdbcTemplate.queryForObject(
                sql,
                Map.of("title", title, "teacherId", teacherId),
                Long.class));
    }

    private long insertAttempt(
            long examId,
            long studentId,
            AttemptStatus status,
            OffsetDateTime startedAt,
            Integer score,
            Integer maxScore,
            Integer correctAnswers,
            Integer totalQuestions) {
        String sql = """
                INSERT INTO exam_attempts
                    (exam_id, student_id, status, started_at, deadline_at, submitted_at,
                     score, max_score, correct_answers, total_questions)
                VALUES
                    (:examId, :studentId, :status, :startedAt, :deadline,
                     :submittedAt, :score, :maxScore, :correctAnswers, :totalQuestions)
                RETURNING id
                """;
        OffsetDateTime submittedAt = status == AttemptStatus.IN_PROGRESS
                ? null
                : startedAt.plusMinutes(30);
        return requireId(jdbcTemplate.queryForObject(
                sql,
                new MapSqlParameterSource()
                        .addValue("examId", examId)
                        .addValue("studentId", studentId)
                        .addValue("status", status.name())
                        .addValue("startedAt", startedAt)
                        .addValue("deadline", startedAt.plusHours(1))
                        .addValue("submittedAt", submittedAt)
                        .addValue("score", score)
                        .addValue("maxScore", maxScore)
                        .addValue("correctAnswers", correctAnswers)
                        .addValue("totalQuestions", totalQuestions),
                Long.class));
    }

    private static long requireId(Long id) {
        if (id == null) throw new IllegalStateException("Database did not return an ID.");
        return id;
    }

    private static void assertCode(String code, Runnable operation) {
        TeacherSubmissionException error = assertThrows(TeacherSubmissionException.class, operation::run);
        assertEquals(code, error.code());
    }
}
