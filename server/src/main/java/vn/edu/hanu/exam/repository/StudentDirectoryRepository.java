package vn.edu.hanu.exam.repository;

import java.util.List;
import java.util.Optional;

import vn.edu.hanu.exam.service.student.StudentDetails;

public interface StudentDirectoryRepository {
    List<StudentDetails> findAllStudents();

    Optional<StudentDetails> findStudentById(long studentId);
}
