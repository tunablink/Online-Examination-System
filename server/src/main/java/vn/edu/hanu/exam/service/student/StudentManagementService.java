package vn.edu.hanu.exam.service.student;

import java.util.Locale;
import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import vn.edu.hanu.exam.exception.StudentManagementException;
import vn.edu.hanu.exam.repository.StudentDirectoryRepository;

@Service
public class StudentManagementService {
    public static final String STUDENT_NOT_FOUND = "STUDENT_NOT_FOUND";
    public static final String DATABASE_ERROR = "DATABASE_ERROR";
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Pattern INSTITUTIONAL_ID_PATTERN = Pattern.compile("^[a-zA-Z0-9._-]{3,50}$");

    private final StudentDirectoryRepository studentRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public StudentManagementService(StudentDirectoryRepository studentRepository, PasswordEncoder passwordEncoder) {
        this.studentRepository = studentRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public StudentManagementService(StudentDirectoryRepository studentRepository) {
        this(studentRepository, null);
    }

    public StudentList findAllStudents() {
        try {
            return new StudentList(studentRepository.findAllStudents());
        } catch (DataAccessException | IllegalStateException exception) {
            throw databaseError(exception);
        }
    }

    public StudentDetails findStudentById(long studentId) {
        if (studentId <= 0) {
            throw notFound();
        }

        try {
            return studentRepository.findStudentById(studentId)
                    .orElseThrow(StudentManagementService::notFound);
        } catch (DataAccessException | IllegalStateException exception) {
            throw databaseError(exception);
        }
    }

    public StudentDetails updateStudent(long studentId, String institutionalId, String fullName, String email,
            String department, String password, String confirmPassword) {
        if (studentId <= 0) throw notFound();
        String normalizedInstitutionalId = institutionalId == null ? "" : institutionalId.trim().toLowerCase(Locale.ROOT);
        String name = fullName == null ? "" : fullName.trim();
        String normalizedEmail = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        String normalizedDepartment = department == null ? "" : department.trim();
        if (!INSTITUTIONAL_ID_PATTERN.matcher(normalizedInstitutionalId).matches()) {
            throw new StudentManagementException("INVALID_INSTITUTIONAL_ID", "Student ID must contain 3 to 50 letters, numbers, dots, underscores or hyphens.");
        }
        if (name.length() < 2 || name.length() > 100) {
            throw new StudentManagementException("INVALID_FULL_NAME", "Full name must contain 2 to 100 characters.");
        }
        if (normalizedEmail.length() > 255 || !EMAIL_PATTERN.matcher(normalizedEmail).matches()) {
            throw new StudentManagementException("INVALID_EMAIL", "Email format is invalid.");
        }
        if (normalizedDepartment.isBlank() || normalizedDepartment.length() > 120) {
            throw new StudentManagementException("INVALID_DEPARTMENT", "Department is required and must be at most 120 characters.");
        }
        String passwordHash = null;
        if (password != null && !password.isEmpty()) {
            if (password.length() < 8 || password.getBytes(StandardCharsets.UTF_8).length > 72) {
                throw new StudentManagementException("INVALID_PASSWORD", "Password must contain at least 8 characters and at most 72 UTF-8 bytes.");
            }
            if (!password.equals(confirmPassword)) {
                throw new StudentManagementException("PASSWORD_MISMATCH", "Password confirmation does not match.");
            }
            passwordHash = passwordEncoder.encode(password);
        } else if (confirmPassword != null && !confirmPassword.isEmpty()) {
            throw new StudentManagementException("PASSWORD_MISMATCH", "Enter a new password before confirming it.");
        }
        try {
            return studentRepository.updateStudent(studentId, normalizedInstitutionalId, name, normalizedEmail,
                    normalizedDepartment, passwordHash)
                    .orElseThrow(StudentManagementService::notFound);
        } catch (DuplicateKeyException exception) {
            throw new StudentManagementException("USER_ALREADY_EXISTS", "Student ID or email already exists.", exception);
        } catch (DataAccessException | IllegalStateException exception) {
            throw databaseError(exception);
        }
    }

    public void deactivateStudent(long studentId) {
        if (studentId <= 0) throw notFound();
        try {
            if (!studentRepository.deactivateStudent(studentId)) throw notFound();
        } catch (DataAccessException | IllegalStateException exception) {
            throw databaseError(exception);
        }
    }

    private static StudentManagementException notFound() {
        return new StudentManagementException(STUDENT_NOT_FOUND, "Student was not found.");
    }

    private static StudentManagementException databaseError(RuntimeException cause) {
        return new StudentManagementException(
                DATABASE_ERROR,
                "The student directory could not be read.",
                cause);
    }
}
