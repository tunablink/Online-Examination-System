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
import org.springframework.transaction.annotation.Propagation;

import vn.edu.hanu.exam.domain.ExamStatus;
import vn.edu.hanu.exam.exception.ExamManagementException;
import vn.edu.hanu.exam.service.exam.CreateExamCommand;
import vn.edu.hanu.exam.service.exam.ExamDetails;
import vn.edu.hanu.exam.service.exam.ExamManagementService;
import vn.edu.hanu.exam.service.exam.UpdateExamCommand;

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

    @Test
    void updateDraftValidatesInputOwnershipAndState() {
        long ownerId = insertUser("TEACHER");
        long otherTeacherId = insertUser("TEACHER");
        ExamDetails draft = createExam(ownerId, "Original");

        ExamDetails updated = examService.updateExam(
                ownerId,
                new UpdateExamCommand(draft.id(), " Updated ", "Changed", 90));

        assertEquals("Updated", updated.title());
        assertEquals("Changed", updated.description());
        assertEquals(90, updated.durationMinutes());
        assertCode("INVALID_EXAM_TITLE", () -> examService.updateExam(
                ownerId, new UpdateExamCommand(draft.id(), " ", null, 30)));
        assertCode("INVALID_EXAM_TITLE", () -> examService.updateExam(
                ownerId, new UpdateExamCommand(draft.id(), "x".repeat(256), null, 30)));
        assertCode("INVALID_EXAM_DURATION", () -> examService.updateExam(
                ownerId, new UpdateExamCommand(draft.id(), "Exam", null, 0)));
        assertCode("EXAM_NOT_FOUND", () -> examService.updateExam(
                otherTeacherId, new UpdateExamCommand(draft.id(), "Exam", null, 30)));

        setStatus(draft.id(), "PUBLISHED");
        assertCode("EXAM_NOT_EDITABLE", () -> examService.updateExam(
                ownerId, new UpdateExamCommand(draft.id(), "Exam", null, 30)));
        setStatus(draft.id(), "CLOSED");
        assertCode("EXAM_NOT_EDITABLE", () -> examService.updateExam(
                ownerId, new UpdateExamCommand(draft.id(), "Exam", null, 30)));
    }

    @Test
    void publishRequiresQuestionsChoicesAndExactlyOneCorrectChoice() {
        long teacherId = insertUser("TEACHER");
        ExamDetails noQuestions = createExam(teacherId, "No questions");
        assertCode("EXAM_HAS_NO_QUESTIONS", () -> examService.publishExam(noQuestions.id(), teacherId));

        ExamDetails tooFewChoices = createExam(teacherId, "Few choices");
        long firstQuestion = insertQuestion(tooFewChoices.id());
        insertChoice(firstQuestion, true);
        assertCode("QUESTION_HAS_TOO_FEW_CHOICES", () ->
                examService.publishExam(tooFewChoices.id(), teacherId));

        ExamDetails noCorrect = createExam(teacherId, "No correct");
        long secondQuestion = insertQuestion(noCorrect.id());
        insertChoice(secondQuestion, false);
        insertChoice(secondQuestion, false);
        assertCode("QUESTION_HAS_INVALID_CORRECT_CHOICE_COUNT", () ->
                examService.publishExam(noCorrect.id(), teacherId));

        ExamDetails multipleCorrect = createExam(teacherId, "Multiple correct");
        long thirdQuestion = insertQuestion(multipleCorrect.id());
        insertChoice(thirdQuestion, true);
        insertChoice(thirdQuestion, true);
        assertCode("QUESTION_HAS_INVALID_CORRECT_CHOICE_COUNT", () ->
                examService.publishExam(multipleCorrect.id(), teacherId));

        ExamDetails valid = createExam(teacherId, "Valid");
        long validQuestion = insertQuestion(valid.id());
        insertChoice(validQuestion, true);
        insertChoice(validQuestion, false);
        assertEquals(ExamStatus.PUBLISHED, examService.publishExam(valid.id(), teacherId).status());
    }

    @Test
    void publishEnforcesOwnershipAndDraftState() {
        long ownerId = insertUser("TEACHER");
        long otherTeacherId = insertUser("TEACHER");
        ExamDetails draft = createExam(ownerId, "Owner exam");
        long questionId = insertQuestion(draft.id());
        insertChoice(questionId, true);
        insertChoice(questionId, false);

        assertCode("EXAM_NOT_FOUND", () -> examService.publishExam(draft.id(), otherTeacherId));
        setStatus(draft.id(), "CLOSED");
        assertCode("EXAM_NOT_EDITABLE", () -> examService.publishExam(draft.id(), ownerId));
    }

    @Test
    void closeOnlyTransitionsOwnedPublishedExam() {
        long ownerId = insertUser("TEACHER");
        long otherTeacherId = insertUser("TEACHER");
        ExamDetails exam = createExam(ownerId, "Close exam");

        assertCode("EXAM_NOT_EDITABLE", () -> examService.closeExam(exam.id(), ownerId));
        setStatus(exam.id(), "PUBLISHED");
        assertCode("EXAM_NOT_FOUND", () -> examService.closeExam(exam.id(), otherTeacherId));
        assertEquals(ExamStatus.CLOSED, examService.closeExam(exam.id(), ownerId).status());
        assertCode("EXAM_NOT_EDITABLE", () -> examService.closeExam(exam.id(), ownerId));
    }

    @Test
    void deleteDraftRemovesItsQuestionsAndChoices() {
        long teacherId = insertUser("TEACHER");
        ExamDetails emptyExam = createExam(teacherId, "Delete empty exam");
        ExamDetails exam = createExam(teacherId, "Delete exam");
        long questionId = insertQuestion(exam.id());
        insertChoice(questionId, true);
        insertChoice(questionId, false);

        examService.deleteExam(emptyExam.id(), teacherId);
        examService.deleteExam(exam.id(), teacherId);

        assertEquals(0, count("exams", "id", emptyExam.id()));
        assertEquals(0, count("exams", "id", exam.id()));
        assertEquals(0, count("questions", "exam_id", exam.id()));
        assertEquals(0, count("choices", "question_id", questionId));
    }

    @Test
    void deleteDraftEnforcesOwnershipAndState() {
        long ownerId = insertUser("TEACHER");
        long otherTeacherId = insertUser("TEACHER");
        ExamDetails exam = createExam(ownerId, "Protected exam");

        assertCode("EXAM_NOT_FOUND", () -> examService.deleteExam(exam.id(), otherTeacherId));
        setStatus(exam.id(), "PUBLISHED");
        assertCode("EXAM_NOT_EDITABLE", () -> examService.deleteExam(exam.id(), ownerId));
        setStatus(exam.id(), "CLOSED");
        assertCode("EXAM_NOT_EDITABLE", () -> examService.deleteExam(exam.id(), ownerId));
        assertEquals(1, count("exams", "id", exam.id()));
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void deleteRollsBackWhenAChildDeleteFails() {
        long teacherId = insertUser("TEACHER");
        ExamDetails exam = createExam(teacherId, "Rollback exam");
        long questionId = insertQuestion(exam.id());
        insertChoice(questionId, true);
        insertChoice(questionId, false);
        jdbcTemplate.getJdbcTemplate().execute("DROP TABLE IF EXISTS exam_delete_test_blocker");
        jdbcTemplate.getJdbcTemplate().execute("""
                CREATE TABLE exam_delete_test_blocker (
                    question_id BIGINT PRIMARY KEY REFERENCES questions(id)
                )
                """);
        jdbcTemplate.update(
                "INSERT INTO exam_delete_test_blocker (question_id) VALUES (:questionId)",
                Map.of("questionId", questionId));

        try {
            assertCode("DATABASE_ERROR", () -> examService.deleteExam(exam.id(), teacherId));
            assertEquals(1, count("exams", "id", exam.id()));
            assertEquals(1, count("questions", "id", questionId));
            assertEquals(2, count("choices", "question_id", questionId));
        } finally {
            jdbcTemplate.getJdbcTemplate().execute("DROP TABLE IF EXISTS exam_delete_test_blocker");
            examService.deleteExam(exam.id(), teacherId);
            jdbcTemplate.update("DELETE FROM users WHERE id = :id", Map.of("id", teacherId));
        }
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

    private ExamDetails createExam(long teacherId, String title) {
        return examService.createExam(teacherId, new CreateExamCommand(title, null, 60));
    }

    private long insertQuestion(long examId) {
        Long id = jdbcTemplate.queryForObject("""
                INSERT INTO questions (exam_id, content, points, display_order)
                VALUES (:examId, 'Question', 1, 0)
                RETURNING id
                """, Map.of("examId", examId), Long.class);
        return id == null ? 0 : id;
    }

    private void insertChoice(long questionId, boolean correct) {
        jdbcTemplate.update("""
                INSERT INTO choices (question_id, content, correct, display_order)
                VALUES (:questionId, :content, :correct, 0)
                """, Map.of(
                        "questionId", questionId,
                        "content", "Choice " + UUID.randomUUID(),
                        "correct", correct));
    }

    private void setStatus(long examId, String status) {
        jdbcTemplate.update(
                "UPDATE exams SET status = :status WHERE id = :examId",
                Map.of("status", status, "examId", examId));
    }

    private int count(String table, String column, long id) {
        Integer result = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM " + table + " WHERE " + column + " = :id",
                Map.of("id", id),
                Integer.class);
        return result == null ? 0 : result;
    }

    private void assertCode(String expectedCode, Runnable operation) {
        ExamManagementException exception = assertThrows(ExamManagementException.class, operation::run);
        assertEquals(expectedCode, exception.code());
    }
}
