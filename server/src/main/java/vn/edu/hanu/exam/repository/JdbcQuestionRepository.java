package vn.edu.hanu.exam.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import vn.edu.hanu.exam.domain.Choice;
import vn.edu.hanu.exam.domain.ExamStatus;
import vn.edu.hanu.exam.domain.Question;


@Repository
public class JdbcQuestionRepository implements QuestionRepository {
    private static final String QUESTION_COLUMNS = """
            SELECT id,
                   exam_id,
                   content,
                   points,
                   display_order,
                   created_at,
                   updated_at
            FROM questions
            """;

    private static final String CHOICE_COLUMNS = """
            SELECT id,
                   question_id,
                   content,
                   correct,
                   display_order
            FROM choices
            """;

    // Shared row mappers keep question and choice reads consistent.
    private static final RowMapper<Question> QUESTION_ROW_MAPPER = JdbcQuestionRepository::mapQuestion;

    private static final RowMapper<Choice> CHOICE_ROW_MAPPER = JdbcQuestionRepository::mapChoice;

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public JdbcQuestionRepository(NamedParameterJdbcTemplate jdbcTemplate){
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Optional<ExamStatus> findOwnedExamStatus(long examId, long teacherId) {
        return queryOwnedExamStatus(examId, teacherId, false);
    }

    @Override
    public Optional<ExamStatus> findOwnedExamStatusForUpdate(long examId, long teacherId) {
        return queryOwnedExamStatus(examId, teacherId, true);
    }

    @Override
    public Optional<QuestionExamContext> findOwnedQuestionContext(long questionId, long teacherId) {
        return queryOwnedQuestionContext(questionId, teacherId, false);
    }

    @Override
    public Optional<QuestionExamContext> findOwnedQuestionContextForUpdate(long questionId, long teacherId) {
        return queryOwnedQuestionContext(questionId, teacherId, true);
    }

    private Optional<ExamStatus> queryOwnedExamStatus(long examId, long teacherId, boolean lockForUpdate) {
        String sql = """
            SELECT status
            FROM exams
            WHERE id = :examId
              AND created_by = :teacherId
            """
            + (lockForUpdate ? "FOR UPDATE" : "");

    Map<String, Object> parameters = Map.of(
            "examId", examId,
            "teacherId", teacherId
    );

    List<ExamStatus> statuses = jdbcTemplate.query(
            sql,
            parameters,
            (resultSet, rowNumber) ->
                    ExamStatus.valueOf(
                            resultSet.getString("status")
                    )
    );

    return statuses.stream().findFirst();
}

    private Optional<QuestionExamContext> queryOwnedQuestionContext(
            long questionId,
            long teacherId,
            boolean lockForUpdate
    ) {
        String sql = """
                SELECT q.id AS question_id,
                       q.exam_id,
                       e.status AS exam_status
                FROM questions q
                INNER JOIN exams e
                    ON e.id = q.exam_id
                WHERE q.id = :questionId
                  AND e.created_by = :teacherId
                """
                + (lockForUpdate ? "FOR UPDATE OF e, q" : "");

        Map<String, Object> parameters = Map.of(
                "questionId", questionId,
                "teacherId", teacherId
        );

        List<QuestionExamContext> results = jdbcTemplate.query(
                sql,
                parameters,
                (resultSet, rowNumber) -> new QuestionExamContext(
                        resultSet.getLong("question_id"),
                        resultSet.getLong("exam_id"),
                        ExamStatus.valueOf(resultSet.getString("exam_status"))
                )
        );

        return results.stream().findFirst();
    }

    @Override
    public Question insertQuestion(long examId, String content, int points, int displayOrder) {
        String sql = """
                INSERT INTO questions (
                    exam_id,
                    content,
                    points,
                    display_order
                )
                VALUES (
                    :examId,
                    :content,
                    :points,
                    :displayOrder
                )
                """;

        MapSqlParameterSource parameters = new MapSqlParameterSource().addValue("examId", examId)
                .addValue("content", content)
                .addValue("points", points)
                .addValue("displayOrder", displayOrder);

        KeyHolder keyHolder = new GeneratedKeyHolder();

        int affectedRows = jdbcTemplate.update(sql, parameters, keyHolder, new String[] {"id"});

        if(affectedRows != 1){
            throw new IllegalStateException("Expected one inserted question, but affected " + affectedRows + " rows.");
        }

        Number generatedId = keyHolder.getKey();

        if (generatedId == null) {
            throw new IllegalStateException("PostgreSQL did not return the generated question ID.");
        }

        return findQuestionById(generatedId.longValue())
                .orElseThrow(() -> new IllegalStateException("The inserted question could not be read back."));

    }

    @Override
    public Choice insertChoice(long questionId, String content, boolean correct, int displayOrder) {
        String sql = """
                INSERT INTO choices (
                    question_id,
                    content,
                    correct,
                    display_order
                )
                VALUES (
                    :questionId,
                    :content,
                    :correct,
                    :displayOrder
                )
                """;

        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("questionId", questionId)
                .addValue("content", content)
                .addValue("correct", correct)
                .addValue("displayOrder", displayOrder);

        KeyHolder keyHolder = new GeneratedKeyHolder();

        int affectedRows = jdbcTemplate.update(
                sql,
                parameters,
                keyHolder,
                new String[] {"id"}
        );

        if (affectedRows != 1) {
            throw new IllegalStateException(
                    "Expected one inserted choice, but affected "
                            + affectedRows
                            + " rows."
            );
        }

        Number generatedId = keyHolder.getKey();

        if (generatedId == null) {
            throw new IllegalStateException(
                    "PostgreSQL did not return the generated choice ID."
            );
        }

        return findChoiceById(generatedId.longValue())
                .orElseThrow(() -> new IllegalStateException(
                        "The inserted choice could not be read back."
                ));
    }

    @Override
    public List<Question> findAllQuestionsByExamId(long examId) {
        String sql = QUESTION_COLUMNS + """
                WHERE exam_id = :examId
                ORDER BY display_order ASC, id ASC
                """;

        return jdbcTemplate.query(sql, Map.of("examId", examId), QUESTION_ROW_MAPPER);
    }

    @Override
    public List<Choice> findAllChoicesByExamId(long examId) {
        String sql = """
                SELECT c.id,
                       c.question_id,
                       c.content,
                       c.correct,
                       c.display_order
                FROM choices c
                INNER JOIN questions q
                    ON q.id = c.question_id
                WHERE q.exam_id = :examId
                ORDER BY q.display_order ASC,
                         q.id ASC,
                         c.display_order ASC,
                         c.id ASC
                """;

        return jdbcTemplate.query(
                sql,
                Map.of("examId", examId),
                CHOICE_ROW_MAPPER
        );
    }

    @Override
    public Optional<Question> findQuestionById(long questionId) {
        String sql = QUESTION_COLUMNS + """
                WHERE id = :questionId
                """;

        List<Question> questions = jdbcTemplate.query(
                sql,
                Map.of("questionId", questionId),
                QUESTION_ROW_MAPPER
        );

        return questions.stream().findFirst();
    }

    @Override
    public List<Choice> findChoicesByQuestionId(long questionId) {
        String sql = CHOICE_COLUMNS + """
                WHERE question_id = :questionId
                ORDER BY display_order ASC, id ASC
                """;

        return jdbcTemplate.query(
                sql,
                Map.of("questionId", questionId),
                CHOICE_ROW_MAPPER
        );
    }

    @Override
    public Question updateQuestion(long questionId, String content, int points, int displayOrder) {
        String sql = """
                UPDATE questions
                SET content = :content,
                    points = :points,
                    display_order = :displayOrder,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :questionId
                """;

        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("questionId", questionId)
                .addValue("content", content)
                .addValue("points", points)
                .addValue("displayOrder", displayOrder);

        int affectedRows = jdbcTemplate.update(sql, parameters);

        if (affectedRows != 1) {
            throw new IllegalStateException("Expected one updated question, but affected " + affectedRows + " rows.");
        }

        return findQuestionById(questionId)
                .orElseThrow(() -> new IllegalStateException("The updated question could not be read back."));
    }

    @Override
    public int deleteChoicesByQuestionId(long questionId) {
        String sql = """
                DELETE FROM choices
                WHERE question_id = :questionId
                """;

        return jdbcTemplate.update(sql, Map.of("questionId", questionId));
    }

    @Override
    public boolean deleteQuestionById(long questionId) {
        String sql = """
                DELETE FROM questions
                WHERE id = :questionId
                """;

        int affectedRows = jdbcTemplate.update(sql, Map.of("questionId", questionId));
        return affectedRows == 1;
    }

    private Optional<Choice> findChoiceById(long choiceId) {
        String sql = CHOICE_COLUMNS + """
                WHERE id = :choiceId
                """;

        List<Choice> choices = jdbcTemplate.query(
                sql,
                Map.of("choiceId", choiceId),
                CHOICE_ROW_MAPPER
        );

        return choices.stream().findFirst();
    }

    private static Question mapQuestion(ResultSet resultSet, int rowNumber) throws SQLException {
        return new Question(
                resultSet.getLong("id"),
                resultSet.getLong("exam_id"),
                resultSet.getString("content"),
                resultSet.getInt("points"),
                resultSet.getInt("display_order"),
                resultSet.getObject(
                        "created_at",
                        OffsetDateTime.class
                ),
                resultSet.getObject(
                        "updated_at",
                        OffsetDateTime.class
                )
        );
    }

    private static Choice mapChoice(ResultSet resultSet, int rowNumber) throws SQLException {
        return new Choice(
                resultSet.getLong("id"),
                resultSet.getLong("question_id"),
                resultSet.getString("content"),
                resultSet.getBoolean("correct"),
                resultSet.getInt("display_order")
        );
    }
}
