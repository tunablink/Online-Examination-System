package vn.edu.hanu.exam.repository;

import java.util.List;
import java.util.Optional;

import vn.edu.hanu.exam.service.student.StudentDetails;

public interface StudentDirectoryRepository {
    List<StudentDetails> findAllStudents();

    Optional<StudentDetails> findStudentById(long studentId);

    Optional<StudentDetails> updateStudent(long studentId, String username, String fullName, String email,
            String department, String passwordHash);

    boolean deactivateStudent(long studentId);
}
