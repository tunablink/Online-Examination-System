package vn.edu.hanu.exam.repository;

import java.util.List;
import java.util.Optional;

import vn.edu.hanu.exam.domain.Exam;

public interface ExamRepository {
    Exam create(String title, String description, int durationMinutes, long createdBy);

    List<Exam> findAllByCreatedBy(long createdBy);

    Optional<Exam> findByIdAndCreatedBy(long examId, long createdBy);
}
