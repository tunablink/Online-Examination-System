package vn.edu.hanu.exam.service.course;

import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import vn.edu.hanu.exam.domain.User;
import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.exception.RegistrationException;
import vn.edu.hanu.exam.repository.CourseRepository;
import vn.edu.hanu.exam.repository.UserRepository;
import vn.edu.hanu.exam.service.RegisterUserCommand;
import vn.edu.hanu.exam.service.RegisteredUser;
import vn.edu.hanu.exam.service.student.StudentAccountService;
import vn.edu.hanu.exam.service.student.StudentDetails;

@Service
public class CourseService {
    private static final Pattern CODE = Pattern.compile("[A-Za-z0-9._-]{2,50}");
    private static final Pattern YEAR = Pattern.compile("(\\d{4})-(\\d{4})");
    private final CourseRepository courses;
    private final UserRepository users;
    private final StudentAccountService accounts;
    private final TransactionTemplate importTransaction;

    @Autowired
    public CourseService(CourseRepository courses, UserRepository users, StudentAccountService accounts,
            PlatformTransactionManager transactionManager) {
        this.courses = courses;
        this.users = users;
        this.accounts = accounts;
        this.importTransaction = new TransactionTemplate(transactionManager);
        this.importTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_NESTED);
    }

    public CourseDetails create(long teacherId, String code, String name) {
        if (code == null || !CODE.matcher(code.trim()).matches()) {
            throw new CourseException("INVALID_COURSE_CODE", "Course code must contain 2 to 50 letters, digits, dots, underscores, or hyphens.");
        }
        if (name == null || name.trim().isEmpty() || name.trim().length() > 255) {
            throw new CourseException("INVALID_COURSE_NAME", "Course name must contain 1 to 255 characters.");
        }
        try {
            return courses.create(teacherId, code.trim().toUpperCase(Locale.ROOT), name.trim());
        } catch (DuplicateKeyException exception) {
            throw new CourseException("COURSE_CODE_ALREADY_EXISTS", "You already have a course with this code.");
        }
    }

    public CourseDetails createDetailed(long teacherId, String name, String subject, String department,
            String academicYear, String semester, String description) {
        CourseFields fields = validateFields(name, subject, department, academicYear, semester, description);
        String prefix = fields.subject().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
        if (prefix.isBlank()) prefix = "CRS";
        prefix = prefix.substring(0, Math.min(prefix.length(), 6));
        for (int attempt = 0; attempt < 3; attempt++) {
            String code = prefix + "-" + fields.academicYear().substring(2, 4)
                    + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
            try {
                return courses.create(teacherId, code, fields.name(), fields.subject(), fields.department(),
                        fields.academicYear(), fields.semester(), fields.description());
            } catch (DuplicateKeyException exception) {
                if (attempt == 2) throw new CourseException("COURSE_CODE_ALREADY_EXISTS", "Could not assign a unique course code.");
            }
        }
        throw new IllegalStateException("Course code generation failed.");
    }

    public CourseDetails update(long courseId, long teacherId, String name, String subject, String department,
            String academicYear, String semester, String description) {
        CourseFields fields = validateFields(name, subject, department, academicYear, semester, description);
        CourseDetails updated = courses.update(courseId, teacherId, fields.name(), fields.subject(),
                fields.department(), fields.academicYear(), fields.semester(), fields.description());
        if (updated == null) throw new CourseException("COURSE_NOT_FOUND", "Course was not found.");
        return updated;
    }

    public CourseDetails setArchived(long courseId, long teacherId, boolean archived) {
        if (!courses.setArchived(courseId, teacherId, archived)) {
            throw new CourseException("COURSE_NOT_FOUND", "Course was not found.");
        }
        return requireOwned(courseId, teacherId);
    }

    private static CourseFields validateFields(String name, String subject, String department,
            String academicYear, String semester, String description) {
        String title = name == null ? "" : name.trim();
        String topic = subject == null ? "" : subject.trim();
        String faculty = department == null ? "" : department.trim();
        String year = academicYear == null ? "" : academicYear.trim();
        String term = semester == null || semester.isBlank() ? "Semester 1" : semester.trim();
        String summary = description == null ? "" : description.trim();
        if (title.isEmpty() || title.length() > 255) throw new CourseException("INVALID_COURSE_NAME", "Course name is required (up to 255 characters).");
        if (topic.isEmpty() || topic.length() > 120) throw new CourseException("INVALID_SUBJECT", "Subject is required (up to 120 characters).");
        if (faculty.length() > 120) throw new CourseException("INVALID_DEPARTMENT", "Department must be at most 120 characters.");
        var match = YEAR.matcher(year);
        if (!match.matches() || Integer.parseInt(match.group(2)) != Integer.parseInt(match.group(1)) + 1) {
            throw new CourseException("INVALID_ACADEMIC_YEAR", "Academic year must use consecutive years, for example 2026-2027.");
        }
        if (!List.of("Semester 1", "Semester 2", "Summer").contains(term)) {
            throw new CourseException("INVALID_SEMESTER", "Select a valid semester.");
        }
        if (summary.length() > 2000) throw new CourseException("INVALID_DESCRIPTION", "Description must be at most 2000 characters.");
        return new CourseFields(title, topic, faculty.isBlank() ? null : faculty, year, term,
                summary.isBlank() ? null : summary);
    }

    private record CourseFields(String name, String subject, String department, String academicYear,
            String semester, String description) {}

    public List<CourseDetails> list(long teacherId) { return courses.findByTeacher(teacherId); }

    public CourseDetails requireOwned(long courseId, long teacherId) {
        return courses.findOwned(courseId, teacherId)
                .orElseThrow(() -> new CourseException("COURSE_NOT_FOUND", "Course was not found."));
    }

    public List<StudentDetails> students(long courseId, long teacherId) {
        requireOwned(courseId, teacherId);
        return courses.findStudents(courseId);
    }

    public CourseStatistics statistics(long courseId, long teacherId) {
        requireOwned(courseId, teacherId);
        return courses.statistics(courseId);
    }

    public boolean enroll(long courseId, long teacherId, long studentId) {
        requireOwned(courseId, teacherId);
        User student = users.findById(studentId)
                .filter(user -> user.role() == UserRole.STUDENT && user.active())
                .orElseThrow(() -> new CourseException("STUDENT_NOT_FOUND", "Student was not found."));
        return courses.enroll(courseId, student.id());
    }

    @Transactional
    public RegisteredUser createStudent(long courseId, long teacherId, RegisterUserCommand command, String department) {
        requireOwned(courseId, teacherId);
        RegisteredUser student = accounts.create(command, department);
        courses.enroll(courseId, student.id());
        return student;
    }

    public ImportResult importStudents(long courseId, long teacherId, String contentBase64) {
        requireOwned(courseId, teacherId);
        StudentAccountService.AccountRows parsed = accounts.parseCompleteAccountRows(contentBase64);
        int created = 0;
        int enrolled = 0;
        int skipped = parsed.skippedCount();
        for (var row : parsed.rows()) {
            try {
                RowResult result = importTransaction.execute(status -> importRow(courseId, row));
                if (result == null || !result.enrolled()) skipped++;
                else {
                    if (result.created()) created++;
                    enrolled++;
                }
            } catch (RegistrationException | CourseException exception) {
                skipped++;
            }
        }
        return new ImportResult(created, enrolled, skipped);
    }

    private RowResult importRow(long courseId, StudentAccountService.NewStudentRow row) {
        RegisterUserCommand command = row.command();
        User existing = users.findByUsername(command.username().trim()).orElse(null);
        long studentId;
        boolean created = false;
        if (existing == null) {
            studentId = accounts.create(command, row.department()).id();
            created = true;
        } else {
            if (existing.role() != UserRole.STUDENT || !existing.active()
                    || !existing.email().equalsIgnoreCase(command.email().trim())
                    || !existing.fullName().equalsIgnoreCase(command.fullName().trim())
                    || existing.department() == null
                    || !existing.department().equalsIgnoreCase(row.department().trim())) {
                throw new CourseException("STUDENT_IDENTITY_CONFLICT", "Existing account does not match this student's name and email.");
            }
            studentId = existing.id();
        }
        return new RowResult(created, courses.enroll(courseId, studentId));
    }

    private record RowResult(boolean created, boolean enrolled) {}
    public record ImportResult(int createdCount, int enrolledCount, int skippedCount) {}
}
