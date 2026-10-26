package vn.edu.hanu.exam;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

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

import vn.edu.hanu.exam.exception.StudentExamCatalogException;
import vn.edu.hanu.exam.service.catalog.AvailableExamDetails;
import vn.edu.hanu.exam.service.catalog.StudentExamCatalogService;

@SpringBootTest
@Transactional
class StudentExamCatalogServiceIntegrationTests {
    @Autowired
    private StudentExamCatalogService catalogService;

    @Autowired
    private NamedParameterJdbcTemplate jdbcTemplate;

    @Test
    void listReturnsOnlyPublishedMetadataInStableOrderWithAggregates() {
        long teacherId = insertTeacher();
        OffsetDateTime baseTime = OffsetDateTime.parse("2026-10-23T10:00:00+07:00");
        long olderPublished = insertExam(teacherId, "Older published", "PUBLISHED", baseTime);
        long newerPublished = insertExam(teacherId, "Newer published", "PUBLISHED", baseTime.plusHours(1));
        long sameTimePublished = insertExam(teacherId, "Same-time published", "PUBLISHED", baseTime.plusHours(1));
        long draft = insertExam(teacherId, "Hidden draft", "DRAFT", baseTime.plusHours(2));
        long closed = insertExam(teacherId, "Hidden closed", "CLOSED", baseTime.plusHours(3));

        insertQuestion(olderPublished, 3);
        insertQuestion(olderPublished, 7);

        List<AvailableExamDetails> exams = catalogService.findAllAvailable().exams();
        List<Long> ids = exams.stream().map(AvailableExamDetails::id).toList();

        assertFalse(ids.contains(draft));
        assertFalse(ids.contains(closed));
        assertTrue(ids.indexOf(sameTimePublished) < ids.indexOf(newerPublished));
        assertTrue(ids.indexOf(newerPublished) < ids.indexOf(olderPublished));

        AvailableExamDetails aggregate = findById(exams, olderPublished);
        assertEquals(2, aggregate.questionCount());
        assertEquals(10, aggregate.totalPoints());

        AvailableExamDetails withoutQuestions = findById(exams, newerPublished);
        assertEquals(0, withoutQuestions.questionCount());
        assertEquals(0, withoutQuestions.totalPoints());
    }

    @Test
    void detailReturnsPublishedMetadataButHidesDraftClosedAndUnknownExams() {
        long teacherId = insertTeacher();
        OffsetDateTime createdAt = OffsetDateTime.parse("2026-10-23T12:00:00+07:00");
        long published = insertExam(teacherId, "Published detail", "PUBLISHED", createdAt);
        long draft = insertExam(teacherId, "Draft detail", "DRAFT", createdAt);
        long closed = insertExam(teacherId, "Closed detail", "CLOSED", createdAt);
        insertQuestion(published, 5);

        AvailableExamDetails details = catalogService.findAvailableById(published);

        assertEquals(published, details.id());
        assertEquals("Published detail", details.title());
        assertEquals("Catalog description", details.description());
        assertEquals(75, details.durationMinutes());
        assertEquals(1, details.questionCount());
        assertEquals(5, details.totalPoints());
        assertNotAvailable(draft);
        assertNotAvailable(closed);
        assertNotAvailable(Long.MAX_VALUE);
        assertNotAvailable(0);
        assertNotAvailable(-1);
    }

    private long insertTeacher() {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        String sql = """
                INSERT INTO users (username, password_hash, full_name, email, role)
                VALUES (:username, :passwordHash, :fullName, :email, 'TEACHER')
                RETURNING id
                """;
        Long id = jdbcTemplate.queryForObject(sql, Map.of(
                "username", "catalog_teacher_" + suffix,
                "passwordHash", "test-hash",
                "fullName", "Catalog Teacher",
                "email", suffix + "@catalog.example.com"), Long.class);
        return requireId(id);
    }

    private long insertExam(long teacherId, String title, String status, OffsetDateTime createdAt) {
        String sql = """
                INSERT INTO exams
                    (title, description, duration_minutes, status, created_by, created_at, updated_at)
                VALUES
                    (:title, :description, :durationMinutes, :status, :createdBy, :createdAt, :createdAt)
                RETURNING id
                """;
        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("title", title)
                .addValue("description", "Catalog description")
                .addValue("durationMinutes", 75)
                .addValue("status", status)
                .addValue("createdBy", teacherId)
                .addValue("createdAt", createdAt);
        return requireId(jdbcTemplate.queryForObject(sql, parameters, Long.class));
    }

    private void insertQuestion(long examId, int points) {
        String sql = """
                INSERT INTO questions (exam_id, content, points, display_order)
                VALUES (:examId, :content, :points, 0)
                """;
        jdbcTemplate.update(sql, Map.of(
                "examId", examId,
                "content", "Catalog aggregate question " + points,
                "points", points));
    }

    private static AvailableExamDetails findById(List<AvailableExamDetails> exams, long examId) {
        return exams.stream()
                .filter(exam -> exam.id() == examId)
                .findFirst()
                .orElseThrow();
    }

    private static long requireId(Long id) {
        if (id == null) {
            throw new IllegalStateException("Database did not return an ID.");
        }
        return id;
    }

    private void assertNotAvailable(long examId) {
        try {
            catalogService.findAvailableById(examId);
        } catch (StudentExamCatalogException exception) {
            assertEquals("EXAM_NOT_AVAILABLE", exception.code());
            return;
        }
        throw new AssertionError("Expected EXAM_NOT_AVAILABLE for exam ID " + examId);
    }
}
