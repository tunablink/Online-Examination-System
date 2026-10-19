package vn.edu.hanu.exam;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Integration test kiểm tra schema exams/questions/choices.
 *
 * <p>Mỗi test dùng {@code @Transactional} để tự động rollback dữ liệu sau khi
 * chạy, giữ database sạch và test có thể chạy lặp lại nhiều lần.</p>
 *
 * <p>{@code @Sql} chạy {@code schema.sql} trong cùng transaction của mỗi test,
 * đảm bảo bảng luôn tồn tại kể cả trên DB chưa có schema.</p>
 *
 * <p>Nếu PostgreSQL không khả dụng, toàn bộ test class sẽ được
 * <strong>bỏ qua (SKIPPED)</strong> thay vì báo lỗi – build vẫn thành công.</p>
 */
@SpringBootTest
@Transactional
@Sql(scripts = "classpath:schema.sql")
public class ExamSchemaIntegrationTests {

    @Autowired
    private JdbcClient jdbcClient;

    /**
     * Kiểm tra kết nối PostgreSQL trước khi chạy bất kỳ test nào.
     * Nếu không kết nối được, toàn bộ test class bị SKIP – không phải ERROR.
     */
    @BeforeAll
    static void assumePostgresAvailable(@Autowired DataSource dataSource) {
        try (Connection ignored = dataSource.getConnection()) {
            // Kết nối thành công – tiếp tục chạy test
        } catch (Exception e) {
            assumeTrue(false,
                "PostgreSQL không khả dụng – ExamSchemaIntegrationTests bị bỏ qua. " +
                "Đặt DB_PASSWORD và đảm bảo PostgreSQL đang chạy để chạy test này.");
        }
    }

    // ----------------------------------------------------------------
    // Helper: tạo teacher ngẫu nhiên, trả về id đã được generate
    // ----------------------------------------------------------------
    private long insertTeacher() {
        String suffix   = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        String username = "teacher_" + suffix;
        String email    = username + "@example.com";

        return jdbcClient.sql("""
                INSERT INTO users (username, password_hash, full_name, email, role)
                VALUES (:username, :hash, :fullName, :email, 'TEACHER')
                RETURNING id
                """)
            .param("username", username)
            .param("hash",     "$2a$10$fakehashfortest")
            .param("fullName", "Integration Teacher")
            .param("email",    email)
            .query(Long.class)
            .single();
    }

    // ----------------------------------------------------------------
    // Helper: tạo exam thuộc teacher, trả về id
    // ----------------------------------------------------------------
    private long insertExam(long teacherId) {
        return jdbcClient.sql("""
                INSERT INTO exams (title, description, duration_minutes, status, created_by)
                VALUES (:title, :desc, :duration, 'DRAFT', :createdBy)
                RETURNING id
                """)
            .param("title",     "Sample Exam")
            .param("desc",      "A test exam")
            .param("duration",  60)
            .param("createdBy", teacherId)
            .query(Long.class)
            .single();
    }

    // ----------------------------------------------------------------
    // Helper: tạo question thuộc exam, trả về id
    // ----------------------------------------------------------------
    private long insertQuestion(long examId) {
        return jdbcClient.sql("""
                INSERT INTO questions (exam_id, content, points, display_order)
                VALUES (:examId, :content, :points, :order)
                RETURNING id
                """)
            .param("examId",  examId)
            .param("content", "What is 2 + 2?")
            .param("points",  10)
            .param("order",   0)
            .query(Long.class)
            .single();
    }

    // ================================================================
    // Test 1: Insert đầy đủ teacher → exam → question → choices
    // ================================================================
    @Test
    void insertFullHierarchy_shouldPersistAllRows() {
        long teacherId  = insertTeacher();
        long examId     = insertExam(teacherId);
        long questionId = insertQuestion(examId);

        jdbcClient.sql("""
                INSERT INTO choices (question_id, content, correct, display_order)
                VALUES (:qid, 'Four', TRUE, 0),
                       (:qid, 'Five', FALSE, 1)
                """)
            .param("qid", questionId)
            .update();

        int choiceCount = jdbcClient.sql(
                "SELECT COUNT(*) FROM choices WHERE question_id = :qid")
            .param("qid", questionId)
            .query(Integer.class)
            .single();

        assertEquals(2, choiceCount, "Phải có đúng 2 choices được insert");
    }

    // ================================================================
    // Test 2: FK exams.created_by → users.id hoạt động
    // ================================================================
    @Test
    void insertExam_withNonExistentTeacher_shouldViolateForeignKey() {
        long nonExistentTeacherId = Long.MAX_VALUE;

        assertThrows(Exception.class, () ->
            jdbcClient.sql("""
                    INSERT INTO exams (title, duration_minutes, status, created_by)
                    VALUES ('Bad Exam', 30, 'DRAFT', :createdBy)
                    """)
                .param("createdBy", nonExistentTeacherId)
                .update(),
            "FK exams.created_by phải từ chối teacher_id không tồn tại"
        );
    }

    // ================================================================
    // Test 3: FK questions.exam_id → exams.id hoạt động
    // ================================================================
    @Test
    void insertQuestion_withNonExistentExam_shouldViolateForeignKey() {
        long nonExistentExamId = Long.MAX_VALUE;

        assertThrows(Exception.class, () ->
            jdbcClient.sql("""
                    INSERT INTO questions (exam_id, content, points, display_order)
                    VALUES (:examId, 'Q?', 5, 0)
                    """)
                .param("examId", nonExistentExamId)
                .update(),
            "FK questions.exam_id phải từ chối exam_id không tồn tại"
        );
    }

    // ================================================================
    // Test 4: FK choices.question_id → questions.id hoạt động
    // ================================================================
    @Test
    void insertChoice_withNonExistentQuestion_shouldViolateForeignKey() {
        long nonExistentQuestionId = Long.MAX_VALUE;

        assertThrows(Exception.class, () ->
            jdbcClient.sql("""
                    INSERT INTO choices (question_id, content, correct, display_order)
                    VALUES (:qid, 'Answer', FALSE, 0)
                    """)
                .param("qid", nonExistentQuestionId)
                .update(),
            "FK choices.question_id phải từ chối question_id không tồn tại"
        );
    }

    // ================================================================
    // Test 5: duration_minutes <= 0 bị từ chối (check constraint)
    // ================================================================
    @Test
    void insertExam_withZeroDuration_shouldViolateCheckConstraint() {
        long teacherId = insertTeacher();

        assertThrows(Exception.class, () ->
            jdbcClient.sql("""
                    INSERT INTO exams (title, duration_minutes, status, created_by)
                    VALUES ('Zero Duration Exam', 0, 'DRAFT', :createdBy)
                    """)
                .param("createdBy", teacherId)
                .update(),
            "ck_exams_duration_positive phải từ chối duration_minutes = 0"
        );
    }

    // ================================================================
    // Test 6: points <= 0 bị từ chối (check constraint)
    // ================================================================
    @Test
    void insertQuestion_withZeroPoints_shouldViolateCheckConstraint() {
        long teacherId = insertTeacher();
        long examId    = insertExam(teacherId);

        assertThrows(Exception.class, () ->
            jdbcClient.sql("""
                    INSERT INTO questions (exam_id, content, points, display_order)
                    VALUES (:examId, 'Question?', 0, 0)
                    """)
                .param("examId", examId)
                .update(),
            "ck_questions_points_positive phải từ chối points = 0"
        );
    }

    // ================================================================
    // Test 7: status không hợp lệ bị từ chối (check constraint)
    // ================================================================
    @Test
    void insertExam_withInvalidStatus_shouldViolateCheckConstraint() {
        long teacherId = insertTeacher();

        assertThrows(Exception.class, () ->
            jdbcClient.sql("""
                    INSERT INTO exams (title, duration_minutes, status, created_by)
                    VALUES ('Bad Status Exam', 30, 'INVALID_STATUS', :createdBy)
                    """)
                .param("createdBy", teacherId)
                .update(),
            "ck_exams_status phải từ chối status không thuộc DRAFT/PUBLISHED/CLOSED"
        );
    }

    // ================================================================
    // Test 8: choices.correct mặc định FALSE khi không truyền giá trị
    // ================================================================
    @Test
    void insertChoice_withoutCorrectField_shouldDefaultToFalse() {
        long teacherId  = insertTeacher();
        long examId     = insertExam(teacherId);
        long questionId = insertQuestion(examId);

        jdbcClient.sql("""
                INSERT INTO choices (question_id, content, display_order)
                VALUES (:qid, 'Default false choice', 0)
                """)
            .param("qid", questionId)
            .update();

        boolean correct = jdbcClient.sql("""
                SELECT correct FROM choices
                WHERE question_id = :qid
                ORDER BY id DESC
                LIMIT 1
                """)
            .param("qid", questionId)
            .query(Boolean.class)
            .single();

        assertFalse(correct, "choices.correct phải mặc định là FALSE");
    }
}
