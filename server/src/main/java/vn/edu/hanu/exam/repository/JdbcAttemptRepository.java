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
import vn.edu.hanu.exam.domain.Exam;
import vn.edu.hanu.exam.domain.ExamStatus;
import vn.edu.hanu.exam.domain.Question;
import vn.edu.hanu.exam.domain.attempt.AttemptChoice;
import vn.edu.hanu.exam.domain.attempt.AttemptHistoryEntry;
import vn.edu.hanu.exam.domain.attempt.AttemptQuestion;
import vn.edu.hanu.exam.domain.attempt.AttemptScore;
import vn.edu.hanu.exam.domain.attempt.AttemptStatus;
import vn.edu.hanu.exam.domain.attempt.ExamAttempt;
import vn.edu.hanu.exam.domain.attempt.SavedAnswer;
import vn.edu.hanu.exam.domain.attempt.StoredAttemptResult;

@Repository
public class JdbcAttemptRepository implements AttemptRepository {
        private static final String EXAM_COLUMNS = """
                        SELECT id, title, description, duration_minutes, status,
                               created_by, created_at, updated_at
                        FROM exams
                        """;

        private static final String ATTEMPT_COLUMNS = """
                        SELECT id, exam_id, student_id, status, started_at,
                               deadline_at AS deadline
                        FROM exam_attempts
                        """;

        private static final RowMapper<Exam> EXAM_ROW_MAPPER = JdbcAttemptRepository::mapExam;
        private static final RowMapper<ExamAttempt> ATTEMPT_ROW_MAPPER = JdbcAttemptRepository::mapAttempt;
        private static final RowMapper<AttemptHistoryEntry> ATTEMPT_HISTORY_ROW_MAPPER = JdbcAttemptRepository::mapAttemptHistoryEntry;

        private final NamedParameterJdbcTemplate jdbcTemplate;

        public JdbcAttemptRepository(NamedParameterJdbcTemplate jdbcTemplate) {
                this.jdbcTemplate = jdbcTemplate;
        }

        @Override
        public List<ExamAttempt> findDueAttempts(int limit) {
                return jdbcTemplate.query(
                                ATTEMPT_COLUMNS + """
                                    WHERE status = 'IN_PROGRESS'
                                      AND deadline_at <= CURRENT_TIMESTAMP
                                    ORDER BY deadline_at, id
                                    LIMIT :limit
                                    """,
                                Map.of("limit", limit),
                                ATTEMPT_ROW_MAPPER);
        }

        @Override
        public Optional<Exam> findExamById(long examId) {
                return queryExam(examId, false);
        }

        @Override
        public Optional<Exam> findExamByIdForUpdate(long examId) {
                return queryExam(examId, true);
        }

        private Optional<Exam> queryExam(long examId, boolean lockForUpdate) {
                String sql = EXAM_COLUMNS + """
                                WHERE id = :examId
                                """ + (lockForUpdate ? "FOR UPDATE" : "");
                return jdbcTemplate.query(sql, Map.of("examId", examId), EXAM_ROW_MAPPER)
                                .stream()
                                .findFirst();
        }

        @Override
        public Optional<ExamAttempt> findInProgressByExamAndStudent(long examId, long studentId) {
                String sql = ATTEMPT_COLUMNS + """
                                WHERE exam_id = :examId
                                  AND student_id = :studentId
                                  AND status = :status
                                """;
                return jdbcTemplate.query(
                                sql,
                                Map.of(
                                                "examId", examId,
                                                "studentId", studentId,
                                                "status", AttemptStatus.IN_PROGRESS.name()),
                                ATTEMPT_ROW_MAPPER)
                                .stream()
                                .findFirst();
        }

        @Override
        public Optional<ExamAttempt> findByIdAndStudent(long attemptId, long studentId) {
                return queryAttempt(attemptId, studentId, false);
        }

        @Override
        public Optional<ExamAttempt> findByIdAndStudentForUpdate(long attemptId, long studentId) {
                return queryAttempt(attemptId, studentId, true);
        }

        private Optional<ExamAttempt> queryAttempt(long attemptId, long studentId, boolean lockForUpdate) {
                String sql = ATTEMPT_COLUMNS + """
                                WHERE id = :attemptId
                                  AND student_id = :studentId
                                """ + (lockForUpdate ? "FOR UPDATE" : "");
                return jdbcTemplate.query(
                                sql,
                                Map.of("attemptId", attemptId, "studentId", studentId),
                                ATTEMPT_ROW_MAPPER)
                                .stream()
                                .findFirst();
        }

        @Override
        public ExamAttempt insertAttempt(
                        long examId,
                        long studentId,
                        OffsetDateTime startedAt,
                        OffsetDateTime deadline) {
                String sql = """
                                INSERT INTO exam_attempts (exam_id, student_id, status, started_at, deadline_at)
                                VALUES (:examId, :studentId, :status, :startedAt, :deadline)
                                """;
                MapSqlParameterSource parameters = new MapSqlParameterSource()
                                .addValue("examId", examId)
                                .addValue("studentId", studentId)
                                .addValue("status", AttemptStatus.IN_PROGRESS.name())
                                .addValue("startedAt", startedAt)
                                .addValue("deadline", deadline);
                KeyHolder keyHolder = new GeneratedKeyHolder();
                int affectedRows = jdbcTemplate.update(sql, parameters, keyHolder, new String[] { "id" });

                if (affectedRows != 1) {
                        throw new IllegalStateException(
                                        "Expected one inserted attempt, but affected " + affectedRows + " rows.");
                }
                Number generatedId = keyHolder.getKey();
                if (generatedId == null) {
                        throw new IllegalStateException("PostgreSQL did not return the generated attempt ID.");
                }
                return findByIdAndStudent(generatedId.longValue(), studentId)
                                .orElseThrow(() -> new IllegalStateException(
                                                "The inserted attempt could not be read back."));
        }

        @Override
        public List<Question> findQuestionsByExamId(long examId) {
                String sql = """
                                SELECT id, exam_id, content, points, display_order, created_at, updated_at
                                FROM questions
                                WHERE exam_id = :examId
                                ORDER BY display_order, id
                                """;
                return jdbcTemplate.query(sql, Map.of("examId", examId), JdbcAttemptRepository::mapQuestion);
        }

        @Override
        public List<Choice> findChoicesByExamId(long examId) {
                String sql = """
                                SELECT c.id, c.question_id, c.content, c.correct, c.display_order
                                FROM choices c
                                INNER JOIN questions q ON q.id = c.question_id
                                WHERE q.exam_id = :examId
                                ORDER BY q.display_order, q.id, c.display_order, c.id
                                """;
                return jdbcTemplate.query(sql, Map.of("examId", examId), JdbcAttemptRepository::mapChoice);
        }

        @Override
        public void insertAttemptQuestions(long attemptId, List<Long> orderedQuestionIds) {
                String sql = """
                                INSERT INTO attempt_questions (
                                    attempt_id,
                                    question_id,
                                    display_order,
                                    points_snapshot
                                )
                                SELECT :attemptId,
                                       q.id,
                                       :displayOrder,
                                       q.points
                                FROM questions q
                                WHERE q.id = :questionId
                                """;
                MapSqlParameterSource[] batch = new MapSqlParameterSource[orderedQuestionIds.size()];
                for (int index = 0; index < orderedQuestionIds.size(); index++) {
                        batch[index] = new MapSqlParameterSource()
                                        .addValue("attemptId", attemptId)
                                        .addValue("questionId", orderedQuestionIds.get(index))
                                        .addValue("displayOrder", index);
                }
                jdbcTemplate.batchUpdate(sql, batch);
        }

        @Override
        public void insertAttemptChoices(long attemptId, long questionId, List<Long> orderedChoiceIds) {
                String sql = """
                                INSERT INTO attempt_choices (attempt_id, question_id, choice_id, display_order)
                                VALUES (:attemptId, :questionId, :choiceId, :displayOrder)
                                """;
                MapSqlParameterSource[] batch = new MapSqlParameterSource[orderedChoiceIds.size()];
                for (int index = 0; index < orderedChoiceIds.size(); index++) {
                        batch[index] = new MapSqlParameterSource()
                                        .addValue("attemptId", attemptId)
                                        .addValue("questionId", questionId)
                                        .addValue("choiceId", orderedChoiceIds.get(index))
                                        .addValue("displayOrder", index);
                }
                jdbcTemplate.batchUpdate(sql, batch);
        }

        @Override
        public List<AttemptQuestion> findAttemptQuestions(long attemptId) {
                String sql = """
                                SELECT aq.attempt_id,
                                       aq.question_id,
                                       q.content,
                                       aq.points_snapshot AS points,
                                       aq.display_order
                                FROM attempt_questions aq
                                INNER JOIN questions q ON q.id = aq.question_id
                                WHERE aq.attempt_id = :attemptId
                                ORDER BY aq.display_order, aq.question_id
                                """;
                return jdbcTemplate.query(
                                sql,
                                Map.of("attemptId", attemptId),
                                (resultSet, rowNumber) -> new AttemptQuestion(
                                                resultSet.getLong("attempt_id"),
                                                resultSet.getLong("question_id"),
                                                resultSet.getString("content"),
                                                resultSet.getInt("points"),
                                                resultSet.getInt("display_order")));
        }

        @Override
        public List<AttemptChoice> findAttemptChoices(long attemptId) {
                String sql = """
                                SELECT ac.attempt_id,
                                       ac.question_id,
                                       ac.choice_id,
                                       c.content,
                                       ac.display_order
                                FROM attempt_choices ac
                                INNER JOIN choices c ON c.id = ac.choice_id
                                INNER JOIN attempt_questions aq
                                    ON aq.attempt_id = ac.attempt_id
                                   AND aq.question_id = ac.question_id
                                WHERE ac.attempt_id = :attemptId
                                ORDER BY aq.display_order, ac.display_order, ac.choice_id
                                """;
                return jdbcTemplate.query(
                                sql,
                                Map.of("attemptId", attemptId),
                                (resultSet, rowNumber) -> new AttemptChoice(
                                                resultSet.getLong("attempt_id"),
                                                resultSet.getLong("question_id"),
                                                resultSet.getLong("choice_id"),
                                                resultSet.getString("content"),
                                                resultSet.getInt("display_order")));
        }

        @Override
        public boolean containsAttemptChoice(long attemptId, long questionId, long choiceId) {
                String sql = """
                                SELECT EXISTS (
                                    SELECT 1
                                    FROM attempt_choices
                                    WHERE attempt_id = :attemptId
                                      AND question_id = :questionId
                                      AND choice_id = :choiceId
                                )
                                """;
                Boolean exists = jdbcTemplate.queryForObject(
                                sql,
                                Map.of(
                                                "attemptId", attemptId,
                                                "questionId", questionId,
                                                "choiceId", choiceId),
                                Boolean.class);
                return Boolean.TRUE.equals(exists);
        }

        @Override
        public SavedAnswer upsertAnswer(
                        long attemptId,
                        long questionId,
                        long choiceId,
                        OffsetDateTime savedAt) {
                String sql = """
                                INSERT INTO attempt_answers (
                                    attempt_id,
                                    question_id,
                                    choice_id,
                                    saved_at
                                )
                                VALUES (:attemptId, :questionId, :choiceId, :savedAt)
                                ON CONFLICT (attempt_id, question_id)
                                DO UPDATE SET
                                    choice_id = EXCLUDED.choice_id,
                                    saved_at = EXCLUDED.saved_at
                                RETURNING attempt_id, question_id, choice_id, saved_at
                                """;
                return jdbcTemplate.queryForObject(
                                sql,
                                new MapSqlParameterSource()
                                                .addValue("attemptId", attemptId)
                                                .addValue("questionId", questionId)
                                                .addValue("choiceId", choiceId)
                                                .addValue("savedAt", savedAt),
                                JdbcAttemptRepository::mapSavedAnswer);
        }

        @Override
        public List<SavedAnswer> findSavedAnswers(long attemptId) {
                String sql = """
                                SELECT attempt_id, question_id, choice_id, saved_at
                                FROM attempt_answers
                                WHERE attempt_id = :attemptId
                                ORDER BY question_id
                                """;
                return jdbcTemplate.query(
                                sql,
                                Map.of("attemptId", attemptId),
                                JdbcAttemptRepository::mapSavedAnswer);
        }

        @Override
        public AttemptScore calculateScore(long attemptId) {
                String sql = """
                                SELECT COALESCE(SUM(
                                           CASE WHEN c.correct IS TRUE THEN aq.points_snapshot ELSE 0 END
                                       ), 0) AS score,
                                       COALESCE(SUM(aq.points_snapshot), 0) AS max_score,
                                       COUNT(*) FILTER (WHERE c.correct IS TRUE) AS correct_answers,
                                       COUNT(*) AS total_questions
                                FROM attempt_questions aq
                                LEFT JOIN attempt_answers aa
                                  ON aa.attempt_id = aq.attempt_id
                                 AND aa.question_id = aq.question_id
                                LEFT JOIN choices c
                                  ON c.id = aa.choice_id
                                 AND c.question_id = aq.question_id
                                WHERE aq.attempt_id = :attemptId
                                """;
                return jdbcTemplate.queryForObject(
                                sql,
                                Map.of("attemptId", attemptId),
                                (resultSet, rowNumber) -> new AttemptScore(
                                                resultSet.getInt("score"),
                                                resultSet.getInt("max_score"),
                                                resultSet.getInt("correct_answers"),
                                                resultSet.getInt("total_questions")));
        }

        @Override
        public boolean finalizeAttempt(
                        long attemptId,
                        AttemptStatus status,
                        OffsetDateTime submittedAt,
                        AttemptScore score) {
                String sql = """
                                UPDATE exam_attempts
                                SET status = :status,
                                    submitted_at = :submittedAt,
                                    score = :score,
                                    max_score = :maxScore,
                                    correct_answers = :correctAnswers,
                                    total_questions = :totalQuestions
                                WHERE id = :attemptId
                                  AND status = :expectedStatus
                                """;
                int affectedRows = jdbcTemplate.update(
                                sql,
                                new MapSqlParameterSource()
                                                .addValue("attemptId", attemptId)
                                                .addValue("status", status.name())
                                                .addValue("submittedAt", submittedAt)
                                                .addValue("score", score.score())
                                                .addValue("maxScore", score.maxScore())
                                                .addValue("correctAnswers", score.correctAnswers())
                                                .addValue("totalQuestions", score.totalQuestions())
                                                .addValue("expectedStatus", AttemptStatus.IN_PROGRESS.name()));
                return affectedRows == 1;
        }

        @Override
        public Optional<StoredAttemptResult> findSubmissionResult(long attemptId, long studentId) {
                String sql = """
                                SELECT id,
                                       exam_id,
                                       status,
                                       submitted_at,
                                       score,
                                       max_score,
                                       correct_answers,
                                       total_questions
                                FROM exam_attempts
                                WHERE id = :attemptId
                                  AND student_id = :studentId
                                  AND status IN (:submittedStatus, :expiredStatus)
                                """;
                return jdbcTemplate.query(
                                sql,
                                new MapSqlParameterSource()
                                                .addValue("attemptId", attemptId)
                                                .addValue("studentId", studentId)
                                                .addValue("submittedStatus", AttemptStatus.SUBMITTED.name())
                                                .addValue("expiredStatus", AttemptStatus.EXPIRED.name()),
                                (resultSet, rowNumber) -> new StoredAttemptResult(
                                                resultSet.getLong("id"),
                                                resultSet.getLong("exam_id"),
                                                AttemptStatus.valueOf(resultSet.getString("status")),
                                                resultSet.getObject("submitted_at", OffsetDateTime.class),
                                                resultSet.getInt("score"),
                                                resultSet.getInt("max_score"),
                                                resultSet.getInt("correct_answers"),
                                                resultSet.getInt("total_questions")))
                                .stream()
                                .findFirst();
        }

        @Override
        public List<AttemptHistoryEntry> findHistoryByStudentId(
                        long studentId) {
                String sql = """
                                SELECT a.id AS attempt_id,
                                       a.exam_id,
                                       e.title AS exam_title,
                                       a.status,
                                       a.started_at,
                                       a.submitted_at,
                                       a.score,
                                       a.max_score,
                                       a.correct_answers,
                                       a.total_questions
                                FROM exam_attempts a
                                INNER JOIN exams e
                                        ON e.id = a.exam_id
                                WHERE a.student_id = :studentId
                                  AND a.status IN (
                                        :submittedStatus,
                                        :expiredStatus
                                  )
                                  AND a.submitted_at IS NOT NULL
                                ORDER BY a.submitted_at DESC,
                                         a.id DESC
                                """;

                return jdbcTemplate.query(
                                sql,
                                new MapSqlParameterSource()
                                                .addValue("studentId", studentId)
                                                .addValue(
                                                                "submittedStatus",
                                                                AttemptStatus.SUBMITTED.name())
                                                .addValue(
                                                                "expiredStatus",
                                                                AttemptStatus.EXPIRED.name()),
                                ATTEMPT_HISTORY_ROW_MAPPER);
        }

        @Override
        public Optional<AttemptHistoryEntry> findCompletedAttemptByIdAndStudent(
                        long attemptId,
                        long studentId) {
                String sql = """
                                SELECT a.id AS attempt_id,
                                       a.exam_id,
                                       e.title AS exam_title,
                                       a.status,
                                       a.started_at,
                                       a.submitted_at,
                                       a.score,
                                       a.max_score,
                                       a.correct_answers,
                                       a.total_questions
                                FROM exam_attempts a
                                INNER JOIN exams e
                                        ON e.id = a.exam_id
                                WHERE a.id = :attemptId
                                  AND a.student_id = :studentId
                                  AND a.status IN (
                                        :submittedStatus,
                                        :expiredStatus
                                  )
                                  AND a.submitted_at IS NOT NULL
                                """;

                return jdbcTemplate.query(
                                sql,
                                new MapSqlParameterSource()
                                                .addValue("attemptId", attemptId)
                                                .addValue("studentId", studentId)
                                                .addValue(
                                                                "submittedStatus",
                                                                AttemptStatus.SUBMITTED.name())
                                                .addValue(
                                                                "expiredStatus",
                                                                AttemptStatus.EXPIRED.name()),
                                ATTEMPT_HISTORY_ROW_MAPPER)
                                .stream()
                                .findFirst();
        }

        private static Exam mapExam(ResultSet resultSet, int rowNumber) throws SQLException {
                return new Exam(
                                resultSet.getLong("id"),
                                resultSet.getString("title"),
                                resultSet.getString("description"),
                                resultSet.getInt("duration_minutes"),
                                ExamStatus.valueOf(resultSet.getString("status")),
                                resultSet.getLong("created_by"),
                                resultSet.getObject("created_at", OffsetDateTime.class),
                                resultSet.getObject("updated_at", OffsetDateTime.class));
        }

        private static ExamAttempt mapAttempt(ResultSet resultSet, int rowNumber) throws SQLException {
                return new ExamAttempt(
                                resultSet.getLong("id"),
                                resultSet.getLong("exam_id"),
                                resultSet.getLong("student_id"),
                                AttemptStatus.valueOf(resultSet.getString("status")),
                                resultSet.getObject("started_at", OffsetDateTime.class),
                                resultSet.getObject("deadline", OffsetDateTime.class));
        }

        private static Question mapQuestion(ResultSet resultSet, int rowNumber) throws SQLException {
                return new Question(
                                resultSet.getLong("id"),
                                resultSet.getLong("exam_id"),
                                resultSet.getString("content"),
                                resultSet.getInt("points"),
                                resultSet.getInt("display_order"),
                                resultSet.getObject("created_at", OffsetDateTime.class),
                                resultSet.getObject("updated_at", OffsetDateTime.class));
        }

        private static Choice mapChoice(ResultSet resultSet, int rowNumber) throws SQLException {
                return new Choice(
                                resultSet.getLong("id"),
                                resultSet.getLong("question_id"),
                                resultSet.getString("content"),
                                resultSet.getBoolean("correct"),
                                resultSet.getInt("display_order"));
        }

        private static SavedAnswer mapSavedAnswer(ResultSet resultSet, int rowNumber) throws SQLException {
                return new SavedAnswer(
                                resultSet.getLong("attempt_id"),
                                resultSet.getLong("question_id"),
                                resultSet.getLong("choice_id"),
                                resultSet.getObject("saved_at", OffsetDateTime.class));
        }

        private static AttemptHistoryEntry mapAttemptHistoryEntry(
                        ResultSet resultSet,
                        int rowNumber) throws SQLException {
                return new AttemptHistoryEntry(
                                resultSet.getLong("attempt_id"),
                                resultSet.getLong("exam_id"),
                                resultSet.getString("exam_title"),
                                AttemptStatus.valueOf(
                                                resultSet.getString("status")),
                                resultSet.getObject(
                                                "started_at",
                                                OffsetDateTime.class),
                                resultSet.getObject(
                                                "submitted_at",
                                                OffsetDateTime.class),
                                resultSet.getInt("score"),
                                resultSet.getInt("max_score"),
                                resultSet.getInt("correct_answers"),
                                resultSet.getInt("total_questions"));
        }
}
