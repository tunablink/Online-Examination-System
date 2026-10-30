package vn.edu.hanu.exam;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.OffsetDateTime;
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
import vn.edu.hanu.exam.service.exam.DeletedExamDetails;
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
                OffsetDateTime scheduledAt = OffsetDateTime.now().plusDays(30).withSecond(0).withNano(0);

                ExamDetails created = examService.createExam(
                                teacherId,
                                new CreateExamCommand(" Java Midterm ", "Core Java", 60, scheduledAt));

                assertTrue(created.id() > 0);
                assertEquals("Java Midterm", created.title());
                assertEquals(ExamStatus.DRAFT, created.status());
                assertEquals(teacherId, created.createdBy());
                assertEquals(scheduledAt.toInstant(), created.scheduledAt().toInstant());
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
                assertCode("INVALID_EXAM_SCHEDULE", () -> examService.createExam(
                                teacherId, new CreateExamCommand("Exam", null, 30, null)));
                assertCode("INVALID_EXAM_SCHEDULE", () -> examService.createExam(
                                teacherId,
                                new CreateExamCommand(
                                                "Exam",
                                                null,
                                                30,
                                                OffsetDateTime.now().minusMinutes(1))));
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
                assertCode("EXAM_NOT_FOUND", () -> examService.findByIdAndCreatedBy(ownerExam.id(), otherTeacherId));
        }

        private long insertUser(String role) {
                String suffix = UUID.randomUUID().toString().replace("-", "");
                String sql = """
                                INSERT INTO users (institutional_id, password_hash, full_name, email, role)
                                VALUES (:institutionalId, :passwordHash, :fullName, :email, :role)
                                RETURNING id
                                """;
                Long id = jdbcTemplate.queryForObject(sql, Map.of(
                                "institutionalId", "user_" + suffix,
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

        @Test
        void updatesDraftExamAndPersistsTheNewValues() {
                long teacherId = insertUser("TEACHER");

                ExamDetails created = examService.createExam(
                                teacherId,
                                new CreateExamCommand(
                                                "Original title",
                                                "Original description",
                                                60));

                ExamDetails updated = examService.updateDraftExam(
                                created.id(),
                                teacherId,
                                new UpdateExamCommand(
                                                " Updated title ",
                                                "Updated description",
                                                90));

                assertEquals(created.id(), updated.id());
                assertEquals("Updated title", updated.title());
                assertEquals("Updated description", updated.description());
                assertEquals(90, updated.durationMinutes());
                assertEquals(ExamStatus.DRAFT, updated.status());
                assertEquals(teacherId, updated.createdBy());

                ExamDetails reloaded = examService.findByIdAndCreatedBy(
                                created.id(),
                                teacherId);

                assertEquals("Updated title", reloaded.title());
                assertEquals("Updated description", reloaded.description());
                assertEquals(90, reloaded.durationMinutes());
        }

        @Test
        void rejectsInvalidDraftUpdates() {
                long teacherId = insertUser("TEACHER");

                ExamDetails created = examService.createExam(
                                teacherId,
                                new CreateExamCommand("Original exam", null, 60));

                assertCode(
                                "INVALID_EXAM_TITLE",
                                () -> examService.updateDraftExam(
                                                created.id(),
                                                teacherId,
                                                new UpdateExamCommand("   ", null, 90)));

                assertCode(
                                "INVALID_EXAM_TITLE",
                                () -> examService.updateDraftExam(
                                                created.id(),
                                                teacherId,
                                                new UpdateExamCommand(
                                                                "x".repeat(256),
                                                                null,
                                                                90)));

                assertCode(
                                "INVALID_EXAM_DURATION",
                                () -> examService.updateDraftExam(
                                                created.id(),
                                                teacherId,
                                                new UpdateExamCommand(
                                                                "Updated exam",
                                                                null,
                                                                0)));

                assertCode(
                                "INVALID_EXAM_DURATION",
                                () -> examService.updateDraftExam(
                                                created.id(),
                                                teacherId,
                                                new UpdateExamCommand(
                                                                "Updated exam",
                                                                null,
                                                                -1)));
        }

        @Test
        void teacherCannotUpdateAnotherTeachersExam() {
                long ownerId = insertUser("TEACHER");
                long otherTeacherId = insertUser("TEACHER");

                ExamDetails created = examService.createExam(
                                ownerId,
                                new CreateExamCommand("Owner exam", null, 60));

                assertCode(
                                "EXAM_NOT_FOUND",
                                () -> examService.updateDraftExam(
                                                created.id(),
                                                otherTeacherId,
                                                new UpdateExamCommand(
                                                                "Illegal update",
                                                                null,
                                                                90)));

                ExamDetails unchanged = examService.findByIdAndCreatedBy(
                                created.id(),
                                ownerId);

                assertEquals("Owner exam", unchanged.title());
                assertEquals(60, unchanged.durationMinutes());
        }

        @Test
        void publishedExamCannotBeUpdated() {
                long teacherId = insertUser("TEACHER");

                ExamDetails created = examService.createExam(
                                teacherId,
                                new CreateExamCommand("Published exam", null, 60));

                jdbcTemplate.update(
                                """
                                                UPDATE exams
                                                SET status = :status,
                                                    updated_at = CURRENT_TIMESTAMP
                                                WHERE id = :examId
                                                """,
                                Map.of(
                                                "status", ExamStatus.PUBLISHED.name(),
                                                "examId", created.id()));

                assertCode(
                                "EXAM_NOT_EDITABLE",
                                () -> examService.updateDraftExam(
                                                created.id(),
                                                teacherId,
                                                new UpdateExamCommand(
                                                                "Illegal update",
                                                                null,
                                                                90)));
        }

        @Test
        void closedExamCannotBeUpdated() {
                long teacherId = insertUser("TEACHER");

                ExamDetails created = examService.createExam(
                                teacherId,
                                new CreateExamCommand("Closed exam", null, 60));

                jdbcTemplate.update(
                                """
                                                UPDATE exams
                                                SET status = :status,
                                                    updated_at = CURRENT_TIMESTAMP
                                                WHERE id = :examId
                                                """,
                                Map.of(
                                                "status", ExamStatus.CLOSED.name(),
                                                "examId", created.id()));

                assertCode(
                                "EXAM_NOT_EDITABLE",
                                () -> examService.updateDraftExam(
                                                created.id(),
                                                teacherId,
                                                new UpdateExamCommand(
                                                                "Illegal update",
                                                                null,
                                                90)));
        }

        @Test
        void publishesDraftWithValidQuestionAndChoices() {
                long teacherId = insertUser("TEACHER");
                ExamDetails created = examService.createExam(
                                teacherId,
                                new CreateExamCommand("Publishable exam", null, 60));
                long questionId = insertQuestion(created.id(), "Which keyword creates a class?", 1);
                insertChoice(questionId, "class", true, 0);
                insertChoice(questionId, "recording", false, 1);

                ExamDetails published = examService.publishExam(created.id(), teacherId);

                assertEquals(ExamStatus.PUBLISHED, published.status());
                assertEquals(
                                ExamStatus.PUBLISHED,
                                examService.findByIdAndCreatedBy(created.id(), teacherId).status());
        }

        @Test
        void rejectsPublishingExamWithoutQuestions() {
                long teacherId = insertUser("TEACHER");
                ExamDetails created = examService.createExam(
                                teacherId,
                                new CreateExamCommand("Empty exam", null, 60));

                assertCode(
                                "EXAM_HAS_NO_QUESTIONS",
                                () -> examService.publishExam(created.id(), teacherId));
        }

        @Test
        void rejectsPublishingQuestionWithTooFewChoices() {
                long teacherId = insertUser("TEACHER");
                ExamDetails created = examService.createExam(
                                teacherId,
                                new CreateExamCommand("Incomplete choices", null, 60));
                long questionId = insertQuestion(created.id(), "Incomplete question", 1);
                insertChoice(questionId, "Only choice", true, 0);

                assertCode(
                                "QUESTION_HAS_TOO_FEW_CHOICES",
                                () -> examService.publishExam(created.id(), teacherId));
        }

        @Test
        void rejectsPublishingQuestionWithoutCorrectChoice() {
                long teacherId = insertUser("TEACHER");
                ExamDetails created = examService.createExam(
                                teacherId,
                                new CreateExamCommand("No correct choice", null, 60));
                long questionId = insertQuestion(created.id(), "Choose the correct answer", 1);
                insertChoice(questionId, "First", false, 0);
                insertChoice(questionId, "Second", false, 1);

                assertCode(
                                "QUESTION_HAS_INVALID_CORRECT_CHOICE_COUNT",
                                () -> examService.publishExam(created.id(), teacherId));
        }

        @Test
        void rejectsPublishingQuestionWithMultipleCorrectChoices() {
                long teacherId = insertUser("TEACHER");
                ExamDetails created = examService.createExam(
                                teacherId,
                                new CreateExamCommand("Multiple correct choices", null, 60));
                long questionId = insertQuestion(created.id(), "Choose one answer", 1);
                insertChoice(questionId, "First", true, 0);
                insertChoice(questionId, "Second", true, 1);

                assertCode(
                                "QUESTION_HAS_INVALID_CORRECT_CHOICE_COUNT",
                                () -> examService.publishExam(created.id(), teacherId));
        }

        @Test
        void teacherCannotPublishAnotherTeachersExam() {
                long ownerId = insertUser("TEACHER");
                long otherTeacherId = insertUser("TEACHER");
                ExamDetails created = examService.createExam(
                                ownerId,
                                new CreateExamCommand("Owner publish exam", null, 60));

                assertCode(
                                "EXAM_NOT_FOUND",
                                () -> examService.publishExam(created.id(), otherTeacherId));
        }

        @Test
        void publishedExamCannotBePublishedAgain() {
                long teacherId = insertUser("TEACHER");
                ExamDetails created = examService.createExam(
                                teacherId,
                                new CreateExamCommand("Already published", null, 60));

                jdbcTemplate.update(
                                """
                                UPDATE exams
                                SET status = :status
                                WHERE id = :examId
                                """,
                                Map.of(
                                                "status", ExamStatus.PUBLISHED.name(),
                                                "examId", created.id()));

                assertCode(
                                "EXAM_NOT_EDITABLE",
                                () -> examService.publishExam(created.id(), teacherId));
        }

        @Test
        void closesPublishedExam() {
                long teacherId = insertUser("TEACHER");
                ExamDetails published = createPublishedExam(teacherId, "Closable exam");

                ExamDetails closed = examService.closeExam(published.id(), teacherId);

                assertEquals(ExamStatus.CLOSED, closed.status());
                assertEquals(
                                ExamStatus.CLOSED,
                                examService.findByIdAndCreatedBy(published.id(), teacherId).status());
        }

        @Test
        void draftExamCannotBeClosed() {
                long teacherId = insertUser("TEACHER");
                ExamDetails draft = examService.createExam(
                                teacherId,
                                new CreateExamCommand("Draft cannot close", null, 60));

                assertCode(
                                "EXAM_NOT_CLOSABLE",
                                () -> examService.closeExam(draft.id(), teacherId));
        }

        @Test
        void closedExamCannotBeClosedAgain() {
                long teacherId = insertUser("TEACHER");
                ExamDetails published = createPublishedExam(teacherId, "Close once");
                examService.closeExam(published.id(), teacherId);

                assertCode(
                                "EXAM_NOT_CLOSABLE",
                                () -> examService.closeExam(published.id(), teacherId));
        }

        @Test
        void teacherCannotCloseAnotherTeachersExam() {
                long ownerId = insertUser("TEACHER");
                long otherTeacherId = insertUser("TEACHER");
                ExamDetails published = createPublishedExam(ownerId, "Owner close exam");

                assertCode(
                                "EXAM_NOT_FOUND",
                                () -> examService.closeExam(published.id(), otherTeacherId));
        }

        private ExamDetails createPublishedExam(long teacherId, String title) {
                ExamDetails draft = examService.createExam(
                                teacherId,
                                new CreateExamCommand(title, null, 60));
                long questionId = insertQuestion(draft.id(), title + " question", 1);
                insertChoice(questionId, "Correct", true, 0);
                insertChoice(questionId, "Incorrect", false, 1);
                return examService.publishExam(draft.id(), teacherId);
        }

        @Test
        void deletesDraftWithoutQuestions() {
                long teacherId = insertUser("TEACHER");
                ExamDetails draft = examService.createExam(
                                teacherId,
                                new CreateExamCommand("Disposable draft", null, 60));

                DeletedExamDetails deleted = examService.deleteDraftExam(draft.id(), teacherId);

                assertEquals(draft.id(), deleted.examId());
                assertCode(
                                "EXAM_NOT_FOUND",
                                () -> examService.findByIdAndCreatedBy(draft.id(), teacherId));
        }

        @Test
        void deletesDraftChoicesQuestionsAndExam() {
                long teacherId = insertUser("TEACHER");
                ExamDetails draft = examService.createExam(
                                teacherId,
                                new CreateExamCommand("Draft with questions", null, 60));
                long questionId = insertQuestion(draft.id(), "Question to delete", 1);
                insertChoice(questionId, "Correct", true, 0);
                insertChoice(questionId, "Incorrect", false, 1);

                examService.deleteDraftExam(draft.id(), teacherId);

                assertEquals(0, countRows("exams", "id", draft.id()));
                assertEquals(0, countRows("questions", "exam_id", draft.id()));
                assertEquals(0, countRows("choices", "question_id", questionId));
        }

        @Test
        void teacherCannotDeleteAnotherTeachersExam() {
                long ownerId = insertUser("TEACHER");
                long otherTeacherId = insertUser("TEACHER");
                ExamDetails draft = examService.createExam(
                                ownerId,
                                new CreateExamCommand("Owner delete exam", null, 60));

                assertCode(
                                "EXAM_NOT_FOUND",
                                () -> examService.deleteDraftExam(draft.id(), otherTeacherId));
                assertEquals(1, countRows("exams", "id", draft.id()));
        }

        @Test
        void publishedAndClosedExamsCannotBeDeleted() {
                long teacherId = insertUser("TEACHER");
                ExamDetails published = createPublishedExam(teacherId, "Published cannot delete");

                assertCode(
                                "EXAM_NOT_DELETABLE",
                                () -> examService.deleteDraftExam(published.id(), teacherId));

                ExamDetails closed = examService.closeExam(published.id(), teacherId);

                assertCode(
                                "EXAM_NOT_DELETABLE",
                                () -> examService.deleteDraftExam(closed.id(), teacherId));
        }

        @Test
        @Transactional(propagation = Propagation.NOT_SUPPORTED)
        void deleteFailureRollsBackChoicesAndQuestions() {
                long teacherId = insertUser("TEACHER");
                ExamDetails draft = examService.createExam(
                                teacherId,
                                new CreateExamCommand("Rollback delete exam", null, 60));
                long questionId = insertQuestion(draft.id(), "Rollback question", 1);
                insertChoice(questionId, "Correct", true, 0);
                insertChoice(questionId, "Incorrect", false, 1);

                jdbcTemplate.getJdbcTemplate().execute(
                                "DROP TRIGGER IF EXISTS fail_exam_question_delete ON questions");
                jdbcTemplate.getJdbcTemplate().execute(
                                "DROP FUNCTION IF EXISTS fail_exam_question_delete_for_test()");
                jdbcTemplate.getJdbcTemplate().execute(
                                """
                                CREATE FUNCTION fail_exam_question_delete_for_test()
                                RETURNS trigger AS $$
                                BEGIN
                                    RAISE EXCEPTION 'forced question delete failure';
                                END;
                                $$ LANGUAGE plpgsql
                                """);
                jdbcTemplate.getJdbcTemplate().execute(
                                """
                                CREATE TRIGGER fail_exam_question_delete
                                BEFORE DELETE ON questions
                                FOR EACH ROW
                                EXECUTE FUNCTION fail_exam_question_delete_for_test()
                                """);

                try {
                        assertCode(
                                        "DATABASE_ERROR",
                                        () -> examService.deleteDraftExam(draft.id(), teacherId));

                        assertEquals(1, countRows("exams", "id", draft.id()));
                        assertEquals(1, countRows("questions", "id", questionId));
                        assertEquals(2, countRows("choices", "question_id", questionId));
                } finally {
                        jdbcTemplate.getJdbcTemplate().execute(
                                        "DROP TRIGGER IF EXISTS fail_exam_question_delete ON questions");
                        jdbcTemplate.getJdbcTemplate().execute(
                                        "DROP FUNCTION IF EXISTS fail_exam_question_delete_for_test()");
                        examService.deleteDraftExam(draft.id(), teacherId);
                        jdbcTemplate.update(
                                        "DELETE FROM users WHERE id = :userId",
                                        Map.of("userId", teacherId));
                }
        }

        private int countRows(String tableName, String columnName, long value) {
                String sql = "SELECT COUNT(*) FROM " + tableName + " WHERE " + columnName + " = :value";
                Integer count = jdbcTemplate.queryForObject(sql, Map.of("value", value), Integer.class);
                return count == null ? 0 : count;
        }

        private long insertQuestion(long examId, String content, int points) {
                Long questionId = jdbcTemplate.queryForObject(
                                """
                                INSERT INTO questions (exam_id, content, points, display_order)
                                VALUES (:examId, :content, :points, 0)
                                RETURNING id
                                """,
                                Map.of(
                                                "examId", examId,
                                                "content", content,
                                                "points", points),
                                Long.class);

                if (questionId == null) {
                        throw new IllegalStateException("Test question ID was not returned.");
                }

                return questionId;
        }

        private void insertChoice(
                        long questionId,
                        String content,
                        boolean correct,
                        int displayOrder) {
                jdbcTemplate.update(
                                """
                                INSERT INTO choices (question_id, content, correct, display_order)
                                VALUES (:questionId, :content, :correct, :displayOrder)
                                """,
                                Map.of(
                                                "questionId", questionId,
                                                "content", content,
                                                "correct", correct,
                                                "displayOrder", displayOrder));
        }
}
