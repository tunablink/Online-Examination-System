package vn.edu.hanu.exam;

import static org.junit.jupiter.api.Assertions.*;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hanu.exam.service.attempt.ExamAttemptService;
import vn.edu.hanu.exam.service.catalog.StudentExamCatalogService;
import vn.edu.hanu.exam.service.course.CourseException;
import vn.edu.hanu.exam.service.course.CourseService;

@SpringBootTest(properties = "exam.deadline.enabled=false")
@Transactional
class CourseUnenrollmentIntegrationTests {
    @Autowired private CourseService courses;
    @Autowired private NamedParameterJdbcTemplate jdbc;
    @Autowired private ExamAttemptService attempts;
    @Autowired private StudentExamCatalogService catalog;

    @Test
    void removesOnlyOneCourseMembershipAndPreservesAccountResultsAndReEnrollment() {
        long teacher = user("TEACHER");
        long student = user("STUDENT");
        var first = courses.create(teacher, code(), "First course");
        var second = courses.create(teacher, code(), "Second course");
        courses.enroll(first.id(), teacher, student);
        courses.enroll(second.id(), teacher, student);
        long exam = exam(first.id(), teacher);
        long attempt = attempt(exam, student, "SUBMITTED");
        var result = attempts.getAttemptResult(attempt, student);
        assertEquals(1, catalog.findAllAvailable(student).exams().stream().filter(item -> item.id() == exam).count());
        assertTrue(courses.unenroll(first.id(), teacher, student));
        assertFalse(courses.unenroll(first.id(), teacher, student));
        assertTrue(courses.students(first.id(), teacher).isEmpty());
        assertEquals(student, courses.students(second.id(), teacher).getFirst().id());
        assertEquals(1L, jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE id=:id AND active=TRUE", Map.of("id", student), Long.class));
        assertEquals(result, attempts.getAttemptResult(attempt, student));
        assertTrue(catalog.findAllAvailable(student).exams().stream().noneMatch(item -> item.id() == exam));
        assertTrue(courses.enroll(first.id(), teacher, student));
        assertTrue(catalog.findAllAvailable(student).exams().stream().anyMatch(item -> item.id() == exam));
    }

    @Test
    void anotherTeacherCannotRemoveMembershipAndInvalidStudentIsRejected() {
        long teacher = user("TEACHER");
        long student = user("STUDENT");
        var course = courses.create(teacher, code(), "Owned course");
        courses.enroll(course.id(), teacher, student);
        long otherTeacher = user("TEACHER");
        assertEquals("COURSE_NOT_FOUND", assertThrows(CourseException.class,
                () -> courses.unenroll(course.id(), otherTeacher, student)).code());
        assertEquals("INVALID_STUDENT", assertThrows(CourseException.class,
                () -> courses.unenroll(course.id(), teacher, 0)).code());
        assertEquals(student, courses.students(course.id(), teacher).getFirst().id());
    }

    @Test
    void activeAttemptBlocksRemovalUntilFinalized() {
        long teacher = user("TEACHER");
        long student = user("STUDENT");
        var course = courses.create(teacher, code(), "Active course");
        courses.enroll(course.id(), teacher, student);
        long attempt = attempt(exam(course.id(), teacher), student, "IN_PROGRESS");
        assertEquals("STUDENT_HAS_ACTIVE_ATTEMPT", assertThrows(CourseException.class,
                () -> courses.unenroll(course.id(), teacher, student)).code());
        assertEquals(student, courses.students(course.id(), teacher).getFirst().id());
        jdbc.update("UPDATE exam_attempts SET status='EXPIRED', submitted_at=CURRENT_TIMESTAMP WHERE id=:id", Map.of("id", attempt));
        assertTrue(courses.unenroll(course.id(), teacher, student));
        assertEquals("EXPIRED", attempts.getAttemptResult(attempt, student).status().name());
    }

    private long exam(long course, long teacher) {
        long id = jdbc.queryForObject("""
                INSERT INTO exams(title,duration_minutes,status,created_by,course_id)
                VALUES('Removal test exam',60,'PUBLISHED',:teacher,:course) RETURNING id
                """, Map.of("teacher", teacher, "course", course), Long.class);
        jdbc.update("INSERT INTO questions(exam_id,content,points,display_order) VALUES(:id,'Question',1,0)", Map.of("id", id));
        return id;
    }

    private long attempt(long exam, long student, String status) {
        var now = OffsetDateTime.now();
        return jdbc.queryForObject("""
                INSERT INTO exam_attempts(exam_id,student_id,status,started_at,deadline_at,submitted_at,
                    score,max_score,correct_answers,total_questions)
                VALUES(:exam,:student,:status,:started,:deadline,
                    CASE WHEN :status='IN_PROGRESS' THEN NULL ELSE CURRENT_TIMESTAMP END,1,1,1,1) RETURNING id
                """, Map.of("exam", exam, "student", student, "status", status,
                "started", now.minusMinutes(1), "deadline", now.plusHours(1)), Long.class);
    }

    private long user(String role) {
        String name = "remove_" + UUID.randomUUID().toString().replace("-", "");
        return jdbc.queryForObject("""
                INSERT INTO users(institutional_id,password_hash,full_name,email,role)
                VALUES(:name,'test-hash','Removal test user',:email,:role) RETURNING id
                """, Map.of("name", name, "email", name + "@example.com", "role", role), Long.class);
    }

    private String code() { return "RM-" + UUID.randomUUID().toString().substring(0, 8); }
}
