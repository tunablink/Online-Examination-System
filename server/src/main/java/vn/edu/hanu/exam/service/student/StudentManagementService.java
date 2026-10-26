package vn.edu.hanu.exam.service.student;

import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

import vn.edu.hanu.exam.exception.StudentManagementException;
import vn.edu.hanu.exam.repository.StudentDirectoryRepository;

@Service
public class StudentManagementService {
    public static final String STUDENT_NOT_FOUND = "STUDENT_NOT_FOUND";
    public static final String DATABASE_ERROR = "DATABASE_ERROR";

    private final StudentDirectoryRepository studentRepository;

    public StudentManagementService(StudentDirectoryRepository studentRepository) {
        this.studentRepository = studentRepository;
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
