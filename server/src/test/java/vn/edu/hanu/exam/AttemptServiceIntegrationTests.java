package vn.edu.hanu.exam;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

import tools.jackson.databind.json.JsonMapper;
import vn.edu.hanu.exam.exception.AttemptException;
import vn.edu.hanu.exam.repository.AttemptRepository;
import vn.edu.hanu.exam.service.attempt.AttemptQuestionDetails;
import vn.edu.hanu.exam.service.attempt.AttemptHistoryResult;
import vn.edu.hanu.exam.service.attempt.ExamAttemptDetails;
import vn.edu.hanu.exam.service.attempt.ExamAttemptService;
import vn.edu.hanu.exam.service.attempt.ExamSubmissionResult;
import vn.edu.hanu.exam.service.attempt.SavedAnswerDetails;
import vn.edu.hanu.exam.service.attempt.StudentAttemptResult;

@SpringBootTest(properties = "exam.deadline.enabled=false")
@Transactional
class AttemptServiceIntegrationTests {
    @Autowired
    private ExamAttemptService attemptService;

    @Autowired
    private AttemptRepository attemptRepository;

    @Autowired
    private NamedParameterJdbcTemplate jdbcTemplate;

    @Autowired
    private JsonMapper jsonMapper;

    @Test
    void studentStartsPublishedExamWithServerDeadlineAndSafeRandomizedSnapshot() throws Exception {
        long teacherId = insertUser("TEACHER");
        long studentId = insertUser("STUDENT");
        long examId = insertExam(teacherId, "PUBLISHED", 75);
        insertQuestionWithChoices(examId, "Question one", 3, 0);
        insertQuestionWithChoices(examId, "Question two", 5, 1);

        ExamAttemptDetails details = attemptService.startExam(examId, studentId);

        assertEquals(examId, details.examId());
        assertEquals("Attempt integration exam", details.examTitle());
        assertEquals("IN_PROGRESS", details.status().name());
        assertEquals(Duration.ofMinutes(75), Duration.between(details.startedAt(), details.deadline()));
        assertEquals(2, details.questions().size());
        assertTrue(details.questions().stream().allMatch(question -> question.choices().size() == 3));
        assertFalse(jsonMapper.writeValueAsString(details).contains("\"correct\""));

        assertEquals(1, count("exam_attempts", "exam_id", examId));
        assertEquals(2, count("attempt_questions", "attempt_id", details.attemptId()));
        assertEquals(6, count("attempt_choices", "attempt_id", details.attemptId()));
    }

    @Test
    void draftAndClosedExamsCannotBeStarted() {
        long teacherId = insertUser("TEACHER");
        long studentId = insertUser("STUDENT");
        long draftId = insertExam(teacherId, "DRAFT", 30);
        long closedId = insertExam(teacherId, "CLOSED", 30);

        assertAttemptError("EXAM_NOT_AVAILABLE", () -> attemptService.startExam(draftId, studentId));
        assertAttemptError("EXAM_NOT_AVAILABLE", () -> attemptService.startExam(closedId, studentId));
    }

    @Test
    void startingTwiceReturnsTheSameSingleActiveAttempt() {
        long teacherId = insertUser("TEACHER");
        long studentId = insertUser("STUDENT");
        long examId = insertExam(teacherId, "PUBLISHED", 45);
        insertQuestionWithChoices(examId, "Only question", 2, 0);

        ExamAttemptDetails first = attemptService.startExam(examId, studentId);
        ExamAttemptDetails second = attemptService.startExam(examId, studentId);

        assertEquals(first, second);
        assertEquals(1, count("exam_attempts", "exam_id", examId));
    }

    @Test
    void studentCannotReadAnotherStudentsAttempt() {
        long teacherId = insertUser("TEACHER");
        long ownerId = insertUser("STUDENT");
        long otherStudentId = insertUser("STUDENT");
        long examId = insertExam(teacherId, "PUBLISHED", 60);
        insertQuestionWithChoices(examId, "Ownership question", 4, 0);
        ExamAttemptDetails attempt = attemptService.startExam(examId, ownerId);

        assertAttemptError(
                "ATTEMPT_NOT_FOUND",
                () -> attemptService.getAttempt(attempt.attemptId(), otherStudentId));
    }

    @Test
    void recoveryReturnsExactlyThePersistedQuestionAndChoiceOrder() {
        long teacherId = insertUser("TEACHER");
        long studentId = insertUser("STUDENT");
        long examId = insertExam(teacherId, "PUBLISHED", 90);
        insertQuestionWithChoices(examId, "Recovery question one", 1, 0);
        insertQuestionWithChoices(examId, "Recovery question two", 1, 1);
        insertQuestionWithChoices(examId, "Recovery question three", 1, 2);

        ExamAttemptDetails started = attemptService.startExam(examId, studentId);
        ExamAttemptDetails recovered = attemptService.getAttempt(started.attemptId(), studentId);

        assertEquals(questionOrder(started), questionOrder(recovered));
        assertEquals(choiceOrder(started), choiceOrder(recovered));
        assertEquals(started.deadline(), recovered.deadline());
    }

    @Test
    void savedAnswerIsRecoveredAndSubmissionIsGradedIdempotently() {
        long teacherId = insertUser("TEACHER");
        long studentId = insertUser("STUDENT");
        long examId = insertExam(teacherId, "PUBLISHED", 60);
        List<Long> choiceIds = insertQuestionWithChoices(
                examId,
                "Persisted answer question",
                4,
                0);

        ExamAttemptDetails started = attemptService.startExam(examId, studentId);
        long questionId = started.questions().getFirst().id();
        long correctChoiceId = choiceIds.getFirst();

        SavedAnswerDetails saved = attemptService.saveAnswer(
                started.attemptId(),
                questionId,
                correctChoiceId,
                studentId);
        ExamAttemptDetails recovered = attemptService.getAttempt(started.attemptId(), studentId);

        assertEquals(questionId, saved.questionId());
        assertEquals(correctChoiceId, saved.choiceId());
        assertEquals(List.of(saved), recovered.answers());

        ExamSubmissionResult first = attemptService.submitExam(started.attemptId(), studentId);
        ExamSubmissionResult duplicate = attemptService.submitExam(started.attemptId(), studentId);

        assertEquals(first, duplicate);
        assertEquals("SUBMITTED", first.status().name());
        assertEquals(4, first.score());
        assertEquals(4, first.maxScore());
        assertEquals(1, first.correctAnswers());
        assertEquals(1, first.totalQuestions());
        assertEquals(1, count("attempt_answers", "attempt_id", started.attemptId()));

        AttemptHistoryResult history = attemptService.getAttemptHistory(studentId);
        assertEquals(1, history.attempts().size());
        StudentAttemptResult historyItem = history.attempts().getFirst();
        assertEquals(started.attemptId(), historyItem.attemptId());
        assertEquals("Attempt integration exam", historyItem.examTitle());
        assertEquals(first.submittedAt(), historyItem.submittedAt());
        assertEquals(first.score(), historyItem.score());

        StudentAttemptResult result = attemptService.getAttemptResult(
                started.attemptId(),
                studentId);
        assertEquals(historyItem, result);

        long otherStudentId = insertUser("STUDENT");
        assertAttemptError(
                "ATTEMPT_RESULT_NOT_FOUND",
                () -> attemptService.getAttemptResult(started.attemptId(), otherStudentId));
    }

    @Test
    void deadlineFinalizesSavedAnswersWithoutClientSubmitAndRemainsIdempotent() {
        long teacherId = insertUser("TEACHER");
        long studentId = insertUser("STUDENT");
        long examId = insertExam(teacherId, "PUBLISHED", 60);
        List<Long> choices = insertQuestionWithChoices(examId, "Deadline question", 4, 0);
        ExamAttemptDetails started = attemptService.startExam(examId, studentId);
        attemptService.saveAnswer(started.attemptId(), started.questions().getFirst().id(),
                choices.getFirst(), studentId);

        jdbcTemplate.update("""
                UPDATE exam_attempts
                SET started_at = CURRENT_TIMESTAMP - INTERVAL '2 hours',
                    deadline_at = CURRENT_TIMESTAMP - INTERVAL '1 hour'
                WHERE id = :id
                """, Map.of("id", started.attemptId()));

        assertTrue(attemptRepository.findDueAttempts(100_000).stream()
                .anyMatch(candidate -> candidate.id() == started.attemptId()));
        assertTrue(attemptService.expireAttempt(started.attemptId(), studentId));
        StudentAttemptResult result = attemptService.getAttemptResult(started.attemptId(), studentId);
        assertEquals("EXPIRED", result.status().name());
        assertEquals(4, result.score());
        assertEquals(4, result.maxScore());
        assertEquals(1, result.correctAnswers());
        assertFalse(attemptService.expireAttempt(started.attemptId(), studentId));
        assertEquals(result.submittedAt(), attemptService.submitExam(started.attemptId(), studentId).submittedAt());
        assertEquals(result, attemptService.getAttemptResult(started.attemptId(), studentId));
        assertEquals(result.score(), attemptService.getAttempt(started.attemptId(), studentId).result().score());
        assertAttemptError("ATTEMPT_NOT_ACTIVE", () -> attemptService.saveAnswer(
                started.attemptId(), started.questions().getFirst().id(), choices.getLast(), studentId));
    }

    @Test
    void deadlineDoesNotFinalizeFutureOrAlreadySubmittedAttempts() {
        long teacherId = insertUser("TEACHER");
        long studentId = insertUser("STUDENT");
        long examId = insertExam(teacherId, "PUBLISHED", 60);
        insertQuestionWithChoices(examId, "Future question", 2, 0);
        ExamAttemptDetails started = attemptService.startExam(examId, studentId);
        assertFalse(attemptService.expireAttempt(started.attemptId(), studentId));
        assertFalse(attemptService.expireAttempt(started.attemptId(), insertUser("STUDENT")));
        assertEquals("IN_PROGRESS", attemptService.getAttempt(started.attemptId(), studentId).status().name());
        ExamSubmissionResult result = attemptService.submitExam(started.attemptId(), studentId);
        assertFalse(attemptService.expireAttempt(started.attemptId(), studentId));
        assertEquals(result, attemptService.submitExam(started.attemptId(), studentId));
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void concurrentSubmitAndDeadlineKeepOneStoredResult() throws Exception {
        long teacherId = insertUser("TEACHER");
        long studentId = insertUser("STUDENT");
        long examId = insertExam(teacherId, "PUBLISHED", 60);
        var executor = Executors.newFixedThreadPool(2);
        try {
            List<Long> choices = insertQuestionWithChoices(examId, "Concurrent deadline", 3, 0);
            ExamAttemptDetails attempt = attemptService.startExam(examId, studentId);
            attemptService.saveAnswer(attempt.attemptId(), attempt.questions().getFirst().id(),
                    choices.getFirst(), studentId);
            jdbcTemplate.update("""
                    UPDATE exam_attempts
                    SET started_at = CURRENT_TIMESTAMP - INTERVAL '2 hours',
                        deadline_at = CURRENT_TIMESTAMP - INTERVAL '1 hour'
                    WHERE id = :id
                    """, Map.of("id", attempt.attemptId()));

            CountDownLatch ready = new CountDownLatch(2);
            CountDownLatch start = new CountDownLatch(1);
            var manual = executor.submit(() -> {
                ready.countDown();
                if (!start.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("Start timeout");
                return attemptService.submitExam(attempt.attemptId(), studentId);
            });
            var automatic = executor.submit(() -> {
                ready.countDown();
                if (!start.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("Start timeout");
                return attemptService.expireAttempt(attempt.attemptId(), studentId);
            });
            assertTrue(ready.await(10, TimeUnit.SECONDS));
            start.countDown();
            ExamSubmissionResult submitted = manual.get(15, TimeUnit.SECONDS);
            automatic.get(15, TimeUnit.SECONDS);

            assertEquals("EXPIRED", submitted.status().name());
            assertEquals(3, submitted.score());
            assertEquals(submitted, attemptService.submitExam(attempt.attemptId(), studentId));
            assertEquals(submitted.submittedAt(),
                    attemptService.getAttemptResult(attempt.attemptId(), studentId).submittedAt());
            assertEquals(1, count("exam_attempts", "exam_id", examId));
        } finally {
            executor.shutdownNow();
            assertTrue(executor.awaitTermination(20, TimeUnit.SECONDS));
            // This test needs committed rows visible to both transactions.
            // Remove only its own UUID-backed fixture after both workers exit.
            jdbcTemplate.update("DELETE FROM suspicious_activities WHERE attempt_id IN (SELECT id FROM exam_attempts WHERE exam_id = :id)", Map.of("id", examId));
            jdbcTemplate.update("DELETE FROM attempt_answers WHERE attempt_id IN (SELECT id FROM exam_attempts WHERE exam_id = :id)", Map.of("id", examId));
            jdbcTemplate.update("DELETE FROM attempt_choices WHERE attempt_id IN (SELECT id FROM exam_attempts WHERE exam_id = :id)", Map.of("id", examId));
            jdbcTemplate.update("DELETE FROM attempt_questions WHERE attempt_id IN (SELECT id FROM exam_attempts WHERE exam_id = :id)", Map.of("id", examId));
            jdbcTemplate.update("DELETE FROM exam_attempts WHERE exam_id = :id", Map.of("id", examId));
            jdbcTemplate.update("DELETE FROM choices WHERE question_id IN (SELECT id FROM questions WHERE exam_id = :id)", Map.of("id", examId));
            jdbcTemplate.update("DELETE FROM questions WHERE exam_id = :id", Map.of("id", examId));
            jdbcTemplate.update("DELETE FROM exams WHERE id = :id", Map.of("id", examId));
            jdbcTemplate.update("DELETE FROM users WHERE id IN (:ids)", Map.of("ids", List.of(teacherId, studentId)));
        }
    }

    private long insertUser(String role) {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        String sql = """
                INSERT INTO users (username, password_hash, full_name, email, role)
                VALUES (:username, 'test-hash', :fullName, :email, :role)
                RETURNING id
                """;
        Long id = jdbcTemplate.queryForObject(sql, Map.of(
                "username", role.toLowerCase() + "_attempt_" + suffix,
                "fullName", role + " Attempt User",
                "email", suffix + "@attempt.example.com",
                "role", role), Long.class);
        return requireId(id);
    }

    private long insertExam(long teacherId, String status, int durationMinutes) {
        String sql = """
                INSERT INTO exams (title, description, duration_minutes, status, created_by)
                VALUES ('Attempt integration exam', 'Attempt test', :duration, :status, :createdBy)
                RETURNING id
                """;
        Long id = jdbcTemplate.queryForObject(sql, Map.of(
                "duration", durationMinutes,
                "status", status,
                "createdBy", teacherId), Long.class);
        return requireId(id);
    }

    private List<Long> insertQuestionWithChoices(
            long examId,
            String content,
            int points,
            int displayOrder) {
        String questionSql = """
                INSERT INTO questions (exam_id, content, points, display_order)
                VALUES (:examId, :content, :points, :displayOrder)
                RETURNING id
                """;
        MapSqlParameterSource questionParameters = new MapSqlParameterSource()
                .addValue("examId", examId)
                .addValue("content", content)
                .addValue("points", points)
                .addValue("displayOrder", displayOrder);
        long questionId = requireId(jdbcTemplate.queryForObject(
                questionSql,
                questionParameters,
                Long.class));

        String choiceSql = """
                INSERT INTO choices (question_id, content, correct, display_order)
                VALUES (:questionId, :content, :correct, :displayOrder)
                RETURNING id
                """;
        List<Long> choiceIds = new ArrayList<>();
        for (int index = 0; index < 3; index++) {
            Long choiceId = jdbcTemplate.queryForObject(choiceSql, new MapSqlParameterSource()
                    .addValue("questionId", questionId)
                    .addValue("content", "Option " + index + " for " + content)
                    .addValue("correct", index == 0)
                    .addValue("displayOrder", index), Long.class);
            choiceIds.add(requireId(choiceId));
        }
        return List.copyOf(choiceIds);
    }

    private int count(String table, String column, long id) {
        String sql = "SELECT COUNT(*) FROM " + table + " WHERE " + column + " = :id";
        Integer count = jdbcTemplate.queryForObject(sql, Map.of("id", id), Integer.class);
        return count == null ? 0 : count;
    }

    private static List<Long> questionOrder(ExamAttemptDetails details) {
        return details.questions().stream().map(AttemptQuestionDetails::id).toList();
    }

    private static List<List<Long>> choiceOrder(ExamAttemptDetails details) {
        return details.questions().stream()
                .map(question -> question.choices().stream().map(choice -> choice.id()).toList())
                .toList();
    }

    private static long requireId(Long id) {
        if (id == null) {
            throw new IllegalStateException("Database did not return an ID.");
        }
        return id;
    }

    private static void assertAttemptError(String code, Runnable operation) {
        AttemptException exception = assertThrows(AttemptException.class, operation::run);
        assertEquals(code, exception.code());
    }
}
