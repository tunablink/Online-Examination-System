package vn.edu.hanu.exam;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

import vn.edu.hanu.exam.exception.RegistrationException;
import vn.edu.hanu.exam.service.RegisterUserCommand;
import vn.edu.hanu.exam.service.course.CourseException;
import vn.edu.hanu.exam.service.course.CourseService;
import vn.edu.hanu.exam.service.exam.CreateExamCommand;
import vn.edu.hanu.exam.service.exam.ExamManagementService;
import vn.edu.hanu.exam.exception.ExamManagementException;
import vn.edu.hanu.exam.exception.QuestionManagementException;
import vn.edu.hanu.exam.service.question.CreateQuestionCommand;
import vn.edu.hanu.exam.service.student.StudentAccountService;
import vn.edu.hanu.exam.service.catalog.StudentExamCatalogService;
import java.util.List;

@SpringBootTest
@Transactional
class CourseFlowIntegrationTests {
    @Autowired private CourseService courses;
    @Autowired private StudentAccountService accounts;
    @Autowired private ExamManagementService exams;
    @Autowired private StudentExamCatalogService catalog;
    @Autowired private NamedParameterJdbcTemplate jdbc;

    @Test
    void studentCanBelongToMultipleCoursesAndExamHasCourseName() {
        long teacher = insertTeacher();
        var first = courses.create(teacher, "CS101", "Programming");
        var second = courses.create(teacher, "CS102", "Data Structures");
        var student = courses.createStudent(first.id(), teacher, studentCommand("multi"), "Computer Science");
        assertTrue(courses.enroll(second.id(), teacher, student.id()));
        assertFalse(courses.enroll(first.id(), teacher, student.id()));
        assertEquals(1, courses.students(first.id(), teacher).size());
        assertEquals(1, courses.students(second.id(), teacher).size());

        var exam = exams.createExamInCourse(teacher, first.id(),
                new CreateExamCommand("Midterm", "Course exam", 60, OffsetDateTime.now().plusDays(2)));
        assertEquals(first.id(), exam.courseId());
        assertEquals("Programming", exam.courseName());
        assertEquals("Programming", exams.findAllByCreatedBy(teacher).exams().getFirst().courseName());
        assertEquals("Programming", exams.findByIdAndCreatedBy(exam.id(), teacher).courseName());

        jdbc.update("UPDATE exams SET status = 'PUBLISHED' WHERE id = :id", Map.of("id", exam.id()));
        assertTrue(catalog.findAllAvailable(student.id()).exams().stream().anyMatch(item -> item.id() == exam.id()));
        assertEquals("Programming", catalog.findAvailableById(exam.id(), student.id()).courseName());
        long outsider = accounts.create(studentCommand("outside"), null).id();
        assertTrue(catalog.findAllAvailable(outsider).exams().stream().noneMatch(item -> item.id() == exam.id()));
    }

    @Test
    void courseFieldsCountsAndArchiveArePersisted() {
        long teacher = insertTeacher();
        var course = courses.createDetailed(teacher, "Advanced Algorithms", "Computer Science", "IT",
                "2026-2027", "Semester 1", "Algorithms and complexity.");
        assertEquals("Computer Science", course.subject());
        assertEquals("IT", course.department());
        assertEquals("2026-2027", course.academicYear());
        assertEquals("Semester 1", course.semester());
        assertEquals("Algorithms and complexity.", course.description());
        assertTrue(course.code().startsWith("COMPUT-26-"));

        var student = courses.createStudent(course.id(), teacher, studentCommand("count"), "IT");
        var exam = exams.createExamInCourse(teacher, course.id(),
                new CreateExamCommand("Course exam", null, 60, OffsetDateTime.now().plusDays(1)));
        jdbc.update("UPDATE exams SET status = 'PUBLISHED' WHERE id = :id", Map.of("id", exam.id()));
        var listed = courses.list(teacher).stream().filter(item -> item.id() == course.id()).findFirst().orElseThrow();
        assertEquals(1, listed.studentCount());
        assertEquals(1, listed.examCount());
        assertEquals(student.id(), courses.students(course.id(), teacher).getFirst().id());

        jdbc.update("""
                INSERT INTO questions (exam_id, content, points, display_order)
                VALUES (:examId, 'Question', 10, 0)
                """, Map.of("examId", exam.id()));
        jdbc.update("""
                INSERT INTO exam_attempts (exam_id, student_id, status, started_at, deadline_at,
                    submitted_at, score, max_score)
                VALUES (:examId, :studentId, 'SUBMITTED', CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP + INTERVAL '1 hour', CURRENT_TIMESTAMP, 8, 10)
                """, Map.of("examId", exam.id(), "studentId", student.id()));
        var statistics = courses.statistics(course.id(), teacher);
        assertEquals(80.0, statistics.averageScorePercent());
        assertEquals(1, statistics.exams().getFirst().questionCount());
        assertEquals(1, statistics.exams().getFirst().submissionCount());

        var edited = courses.update(course.id(), teacher, "Advanced Algorithms II", "Computer Science", "IT",
                "2026-2027", "Semester 2", "Updated description.");
        assertEquals("Advanced Algorithms II", edited.name());
        assertEquals("Semester 2", edited.semester());
        assertTrue(courses.setArchived(course.id(), teacher, true).archived());
        assertFalse(courses.setArchived(course.id(), teacher, false).archived());
    }

    @Test
    void draftRequiresQuestionsAndPersistsAssessmentTypeWithItsQuestions() {
        long teacher = insertTeacher();
        var course = courses.create(teacher, "EXAMTEST", "Exam test course");
        var command = new CreateExamCommand("Midterm", "Assessment description", 60,
                OffsetDateTime.now().plusDays(2));

        assertEquals("EXAM_HAS_NO_QUESTIONS", assertThrows(ExamManagementException.class,
                () -> exams.createExamWithQuestions(teacher, course.id(), command, "Midterm examination", List.of()))
                .code());
        assertEquals(0L, jdbc.queryForObject("SELECT COUNT(*) FROM exams WHERE course_id = :id",
                Map.of("id", course.id()), Long.class));

        var question = new CreateQuestionCommand(0, "Which answer is correct?", 1, 0, List.of(
                new CreateQuestionCommand.ChoiceCommand("First", true, 0),
                new CreateQuestionCommand.ChoiceCommand("Second", false, 1)));
        var exam = exams.createExamWithQuestions(teacher, course.id(), command,
                "Midterm examination", List.of(question));
        assertEquals("Midterm examination", exam.assessmentType());
        assertEquals("Midterm examination", exams.findByIdAndCreatedBy(exam.id(), teacher).assessmentType());
        assertEquals(1L, jdbc.queryForObject("SELECT COUNT(*) FROM questions WHERE exam_id = :id",
                Map.of("id", exam.id()), Long.class));
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void invalidQuestionRollsBackNewDraft() {
        long teacher = insertTeacher();
        var course = courses.create(teacher, "ROLLBACK-EXAM", "Exam rollback course");
        try {
            var invalid = new CreateQuestionCommand(0, "", 1, 0, List.of(
                    new CreateQuestionCommand.ChoiceCommand("First", true, 0),
                    new CreateQuestionCommand.ChoiceCommand("Second", false, 1)));
            assertThrows(QuestionManagementException.class, () -> exams.createExamWithQuestions(
                    teacher, course.id(), new CreateExamCommand("Invalid draft", null, 60,
                            OffsetDateTime.now().plusDays(2)), "Quiz", List.of(invalid)));
            assertEquals(0L, jdbc.queryForObject("SELECT COUNT(*) FROM exams WHERE course_id = :id",
                    Map.of("id", course.id()), Long.class));
        } finally {
            jdbc.update("DELETE FROM courses WHERE id = :id", Map.of("id", course.id()));
            jdbc.update("DELETE FROM users WHERE id = :id", Map.of("id", teacher));
        }
    }

    @Test
    void anotherTeacherCannotUseOrEnrollInCourse() {
        long owner = insertTeacher();
        long other = insertTeacher();
        var course = courses.create(owner, "OWN01", "Owner course");
        var student = accounts.create(studentCommand("owner"), null);
        assertEquals("COURSE_NOT_FOUND", assertThrows(CourseException.class,
                () -> courses.enroll(course.id(), other, student.id())).code());
        assertEquals("COURSE_NOT_FOUND", assertThrows(CourseException.class,
                () -> exams.createExamInCourse(other, course.id(),
                        new CreateExamCommand("Unauthorized", null, 30, OffsetDateTime.now().plusDays(1)))).code());
    }

    @Test
    void importCreatesNewStudentsAndReusesExistingStudent() throws IOException {
        long teacher = insertTeacher();
        var first = courses.create(teacher, "IMPORT1", "First");
        var second = courses.create(teacher, "IMPORT2", "Second");
        var existing = accounts.create(studentCommand("existing"), "Math");
        courses.enroll(first.id(), teacher, existing.id());
        String file = workbook(new String[][] {
                {"studentId", "fullName", "email", "password", "confirmPassword", "department"},
                {existing.username(), existing.fullName(), existing.email(), "StrongPassword123", "StrongPassword123", "Math"},
                {"new_student", "New Student", "new_student@example.com", "StrongPassword123", "StrongPassword123", "Science"}
        });

        var result = courses.importStudents(second.id(), teacher, file);
        assertEquals(1, result.createdCount());
        assertEquals(2, result.enrolledCount());
        assertEquals(2, courses.students(second.id(), teacher).size());
        assertEquals(1, courses.students(first.id(), teacher).size());
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void invalidImportSkipsBadRowAndKeepsValidRow() throws IOException {
        long teacher = insertTeacher();
        var course = courses.create(teacher, "ROLLBACK", "Rollback course");
        String username = "valid_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        String file = workbook(new String[][] {
                {"studentId", "fullName", "email", "password", "confirmPassword", "department"},
                {username, "Valid Student", username + "@example.com", "StrongPassword123", "StrongPassword123", "Science"},
                {"bad_student", "Bad Student", "not-an-email", "StrongPassword123", "StrongPassword123", "Science"}
        });

        try {
            var result = courses.importStudents(course.id(), teacher, file);
            assertEquals(1, result.createdCount());
            assertEquals(1, result.enrolledCount());
            assertEquals(1, result.skippedCount());
            assertEquals(1, courses.students(course.id(), teacher).size());
            Long count = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE username = :username",
                    Map.of("username", username), Long.class);
            assertEquals(1L, count);
        } finally {
            jdbc.update("DELETE FROM course_students WHERE course_id = :id", Map.of("id", course.id()));
            jdbc.update("DELETE FROM courses WHERE id = :id", Map.of("id", course.id()));
            jdbc.update("DELETE FROM users WHERE username = :username", Map.of("username", username));
            jdbc.update("DELETE FROM users WHERE id = :id", Map.of("id", teacher));
        }
    }

    private long insertTeacher() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        return jdbc.queryForObject("""
                INSERT INTO users (username, password_hash, full_name, email, role)
                VALUES (:username, 'test-hash', 'Teacher', :email, 'TEACHER') RETURNING id
                """, Map.of("username", "teacher_" + suffix, "email", "teacher_" + suffix + "@example.com"), Long.class);
    }

    private static RegisterUserCommand studentCommand(String suffix) {
        String random = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        return new RegisterUserCommand("student_" + suffix + random, "StrongPassword123",
                "Student " + suffix, "student_" + suffix + random + "@example.com");
    }

    private static String workbook(String[][] data) throws IOException {
        try (XSSFWorkbook book = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            var sheet = book.createSheet();
            for (int rowIndex = 0; rowIndex < data.length; rowIndex++) {
                var row = sheet.createRow(rowIndex);
                for (int column = 0; column < data[rowIndex].length; column++) {
                    row.createCell(column).setCellValue(data[rowIndex][column]);
                }
            }
            book.write(output);
            return Base64.getEncoder().encodeToString(output.toByteArray());
        }
    }
}
