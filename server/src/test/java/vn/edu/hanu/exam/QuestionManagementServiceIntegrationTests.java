package vn.edu.hanu.exam;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.hanu.exam.exception.QuestionManagementException;
import vn.edu.hanu.exam.service.question.CreateQuestionCommand;
import vn.edu.hanu.exam.service.question.CreateQuestionCommand.ChoiceCommand;
import vn.edu.hanu.exam.service.question.QuestionManagementService;
import vn.edu.hanu.exam.service.question.TeacherQuestionDetails;
import vn.edu.hanu.exam.service.question.TeacherQuestionList;

@SpringBootTest
class QuestionManagementServiceIntegrationTests {
    private static final String FORCED_FAILURE_CONTENT =
            "FORCE_ROLLBACK_CHOICE";

    @Autowired
    private QuestionManagementService questionService;

    @Autowired
    private NamedParameterJdbcTemplate namedJdbcTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @Transactional
    void createPersistsNormalizedQuestionAndAllChoices() {
        long teacherId = insertTeacher("create");
        long examId = insertExam(
                teacherId,
                "Question creation exam",
                "DRAFT"
        );

        CreateQuestionCommand command =
                new CreateQuestionCommand(
                        examId,
                        "  Which keyword extends a class?  ",
                        3,
                        0,
                        List.of(
                                new ChoiceCommand(
                                        "  extends  ",
                                        true,
                                        0
                                ),
                                new ChoiceCommand(
                                        "  implements  ",
                                        false,
                                        1
                                )
                        )
                );

        TeacherQuestionDetails result =
                questionService.createQuestion(
                        teacherId,
                        command
                );

        assertTrue(result.id() > 0);
        assertEquals(examId, result.examId());

        assertEquals(
                "Which keyword extends a class?",
                result.content()
        );

        assertEquals(3, result.points());
        assertEquals(2, result.choices().size());

        assertEquals(
                "extends",
                result.choices().get(0).content()
        );

        assertEquals(
                true,
                result.choices().get(0).correct()
        );

        Long questionCount =
                namedJdbcTemplate.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM questions
                        WHERE id = :questionId
                          AND exam_id = :examId
                          AND content = :content
                          AND points = :points
                        """,
                        Map.of(
                                "questionId", result.id(),
                                "examId", examId,
                                "content",
                                "Which keyword extends a class?",
                                "points", 3
                        ),
                        Long.class
                );

        assertEquals(1L, questionCount);

        Long choiceCount =
                namedJdbcTemplate.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM choices
                        WHERE question_id = :questionId
                        """,
                        Map.of(
                                "questionId",
                                result.id()
                        ),
                        Long.class
                );

        assertEquals(2L, choiceCount);

        Long correctChoiceCount =
                namedJdbcTemplate.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM choices
                        WHERE question_id = :questionId
                          AND correct = TRUE
                        """,
                        Map.of(
                                "questionId",
                                result.id()
                        ),
                        Long.class
                );

        assertEquals(1L, correctChoiceCount);
    }

    @Test
    @Transactional
    void createChecksOwnershipAndDraftStatus() {
        long ownerId = insertTeacher("owner");
        long anotherTeacherId = insertTeacher("another");

        long draftExamId = insertExam(
                ownerId,
                "Owned draft",
                "DRAFT"
        );

        long publishedExamId = insertExam(
                ownerId,
                "Owned published",
                "PUBLISHED"
        );

        long closedExamId = insertExam(
                ownerId,
                "Owned closed",
                "CLOSED"
        );

        assertCode(
                QuestionManagementService.EXAM_NOT_FOUND,
                () -> questionService.createQuestion(
                        anotherTeacherId,
                        validCommand(draftExamId, 0)
                )
        );

        assertCode(
                QuestionManagementService.EXAM_NOT_EDITABLE,
                () -> questionService.createQuestion(
                        ownerId,
                        validCommand(publishedExamId, 0)
                )
        );

        assertCode(
                QuestionManagementService.EXAM_NOT_EDITABLE,
                () -> questionService.createQuestion(
                        ownerId,
                        validCommand(closedExamId, 0)
                )
        );

        assertEquals(
                0L,
                countQuestions(draftExamId)
        );

        assertEquals(
                0L,
                countQuestions(publishedExamId)
        );

        assertEquals(
                0L,
                countQuestions(closedExamId)
        );
    }

    @Test
    @Transactional
    void listReturnsQuestionsAndChoicesInDisplayOrder() {
        long teacherId = insertTeacher("list-owner");
        long anotherTeacherId =
                insertTeacher("list-other");

        long examId = insertExam(
                teacherId,
                "Question list exam",
                "DRAFT"
        );

        questionService.createQuestion(
                teacherId,
                new CreateQuestionCommand(
                        examId,
                        "Second displayed question",
                        2,
                        1,
                        List.of(
                                new ChoiceCommand(
                                        "Second B",
                                        false,
                                        1
                                ),
                                new ChoiceCommand(
                                        "Second A",
                                        true,
                                        0
                                )
                        )
                )
        );

        questionService.createQuestion(
                teacherId,
                new CreateQuestionCommand(
                        examId,
                        "First displayed question",
                        1,
                        0,
                        List.of(
                                new ChoiceCommand(
                                        "First B",
                                        false,
                                        1
                                ),
                                new ChoiceCommand(
                                        "First A",
                                        true,
                                        0
                                )
                        )
                )
        );

        TeacherQuestionList result =
                questionService.findAllByExamId(
                        teacherId,
                        examId
                );

        assertEquals(2, result.questions().size());

        TeacherQuestionDetails first =
                result.questions().get(0);

        TeacherQuestionDetails second =
                result.questions().get(1);

        assertEquals(
                "First displayed question",
                first.content()
        );

        assertEquals(
                "Second displayed question",
                second.content()
        );

        assertEquals(2, first.choices().size());
        assertEquals(2, second.choices().size());

        assertEquals(
                "First A",
                first.choices().get(0).content()
        );

        assertEquals(
                "First B",
                first.choices().get(1).content()
        );

        assertEquals(
                "Second A",
                second.choices().get(0).content()
        );

        assertEquals(
                "Second B",
                second.choices().get(1).content()
        );

        assertCode(
                QuestionManagementService.EXAM_NOT_FOUND,
                () -> questionService.findAllByExamId(
                        anotherTeacherId,
                        examId
                )
        );
    }

    @Test
    void choiceInsertFailureRollsBackQuestionAndEarlierChoices() {
        long teacherId = 0;
        long examId = 0;

        String suffix = UUID.randomUUID()
                .toString()
                .replace("-", "");

        String functionName =
                "test_fail_choice_" + suffix;

        String triggerName =
                "test_fail_choice_trigger_" + suffix;

        try {
            teacherId = insertTeacher("rollback-" + suffix);

            examId = insertExam(
                    teacherId,
                    "Question rollback exam " + suffix,
                    "DRAFT"
            );

            createFailureTrigger(
                    functionName,
                    triggerName
            );

            long finalTeacherId = teacherId;
            long finalExamId = examId;

            QuestionManagementException exception =
                    assertThrows(
                            QuestionManagementException.class,
                            () -> questionService.createQuestion(
                                    finalTeacherId,
                                    new CreateQuestionCommand(
                                            finalExamId,
                                            "Rollback question",
                                            5,
                                            0,
                                            List.of(
                                                    new ChoiceCommand(
                                                            "Inserted before failure",
                                                            true,
                                                            0
                                                    ),
                                                    new ChoiceCommand(
                                                            FORCED_FAILURE_CONTENT,
                                                            false,
                                                            1
                                                    )
                                            )
                                    )
                            )
                    );

            assertEquals(
                    QuestionManagementService.DATABASE_ERROR,
                    exception.code()
            );

            assertEquals(
                    0L,
                    countQuestions(examId)
            );

            Long choiceCount =
                    namedJdbcTemplate.queryForObject(
                            """
                            SELECT COUNT(*)
                            FROM choices c
                            INNER JOIN questions q
                                ON q.id = c.question_id
                            WHERE q.exam_id = :examId
                            """,
                            Map.of("examId", examId),
                            Long.class
                    );

            assertEquals(0L, choiceCount);
        } finally {
            dropFailureTrigger(
                    functionName,
                    triggerName
            );

            cleanupExamAndTeacher(
                    examId,
                    teacherId
            );
        }
    }

    private long insertTeacher(String label) {
        String suffix = UUID.randomUUID()
                .toString()
                .replace("-", "");

        String sql = """
                INSERT INTO users (
                    username,
                    password_hash,
                    full_name,
                    email,
                    role
                )
                VALUES (
                    :username,
                    :passwordHash,
                    :fullName,
                    :email,
                    'TEACHER'
                )
                RETURNING id
                """;

        Long id = namedJdbcTemplate.queryForObject(
                sql,
                Map.of(
                        "username",
                    "qt_" + suffix,
                    "passwordHash",
                    "test-password-hash",
                    "fullName",
                    "Question Teacher " + label,
                    "email",
                    "qt_" + suffix + "@example.com"
                ),
                Long.class
        );

        return requireId(id);
    }

    private long insertExam(
            long teacherId,
            String title,
            String status
    ) {
        String sql = """
                INSERT INTO exams (
                    title,
                    description,
                    duration_minutes,
                    status,
                    created_by
                )
                VALUES (
                    :title,
                    :description,
                    :durationMinutes,
                    :status,
                    :createdBy
                )
                RETURNING id
                """;

        MapSqlParameterSource parameters =
                new MapSqlParameterSource()
                        .addValue("title", title)
                        .addValue(
                                "description",
                                "Question integration test"
                        )
                        .addValue(
                                "durationMinutes",
                                60
                        )
                        .addValue("status", status)
                        .addValue(
                                "createdBy",
                                teacherId
                        );

        Long id = namedJdbcTemplate.queryForObject(
                sql,
                parameters,
                Long.class
        );

        return requireId(id);
    }

    private long countQuestions(long examId) {
        Long count = namedJdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM questions
                WHERE exam_id = :examId
                """,
                Map.of("examId", examId),
                Long.class
        );

        return count == null ? 0 : count;
    }

    private void createFailureTrigger(
            String functionName,
            String triggerName
    ) {
        String functionSql = """
                CREATE FUNCTION %s()
                RETURNS trigger
                AS $$
                BEGIN
                    IF NEW.content = '%s' THEN
                        RAISE EXCEPTION
                            'Forced choice insert failure';
                    END IF;

                    RETURN NEW;
                END;
                $$
                LANGUAGE plpgsql
                """.formatted(
                functionName,
                FORCED_FAILURE_CONTENT
        );

        String triggerSql = """
                CREATE TRIGGER %s
                BEFORE INSERT ON choices
                FOR EACH ROW
                EXECUTE FUNCTION %s()
                """.formatted(
                triggerName,
                functionName
        );

        jdbcTemplate.execute(functionSql);
        jdbcTemplate.execute(triggerSql);
    }

    private void dropFailureTrigger(
            String functionName,
            String triggerName
    ) {
        try {
            jdbcTemplate.execute(
                    "DROP TRIGGER IF EXISTS "
                            + triggerName
                            + " ON choices"
            );
        } finally {
            jdbcTemplate.execute(
                    "DROP FUNCTION IF EXISTS "
                            + functionName
                            + "()"
            );
        }
    }

    private void cleanupExamAndTeacher(
            long examId,
            long teacherId
    ) {
        if (examId > 0) {
            namedJdbcTemplate.update(
                    """
                    DELETE FROM choices
                    WHERE question_id IN (
                        SELECT id
                        FROM questions
                        WHERE exam_id = :examId
                    )
                    """,
                    Map.of("examId", examId)
            );

            namedJdbcTemplate.update(
                    """
                    DELETE FROM questions
                    WHERE exam_id = :examId
                    """,
                    Map.of("examId", examId)
            );

            namedJdbcTemplate.update(
                    """
                    DELETE FROM exams
                    WHERE id = :examId
                    """,
                    Map.of("examId", examId)
            );
        }

        if (teacherId > 0) {
            namedJdbcTemplate.update(
                    """
                    DELETE FROM users
                    WHERE id = :teacherId
                    """,
                    Map.of("teacherId", teacherId)
            );
        }
    }

    private static CreateQuestionCommand validCommand(
            long examId,
            int displayOrder
    ) {
        return new CreateQuestionCommand(
                examId,
                "Valid question",
                1,
                displayOrder,
                List.of(
                        new ChoiceCommand(
                                "Correct choice",
                                true,
                                0
                        ),
                        new ChoiceCommand(
                                "Incorrect choice",
                                false,
                                1
                        )
                )
        );
    }

    private static void assertCode(
            String expectedCode,
            Runnable operation
    ) {
        QuestionManagementException exception =
                assertThrows(
                        QuestionManagementException.class,
                        operation::run
                );

        assertEquals(
                expectedCode,
                exception.code()
        );
    }

    private static long requireId(Long id) {
        if (id == null) {
            throw new IllegalStateException(
                    "Database did not return an ID."
            );
        }

        return id;
    }
}