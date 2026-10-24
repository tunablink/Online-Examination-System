package vn.edu.hanu.exam.repository;

import java.util.List;
import java.util.Optional;

import vn.edu.hanu.exam.domain.Exam;
import vn.edu.hanu.exam.service.exam.ExamPublishReadiness;

public interface ExamRepository {
    Exam create(String title, String description, int durationMinutes, long createdBy);

    List<Exam> findAllByCreatedBy(long createdBy);

    Optional<Exam> findByIdAndCreatedBy(long examId, long createdBy);

    Optional<Exam> updateDraft(long examId, long teacherId, String title, String description, int durationMinutes);

    ExamPublishReadiness getPublishReadiness(long examId, long teacherId);

    Optional<Exam> publish(long examId, long teacherId);

    Optional<Exam> close(long examId, long teacherId);

    void deleteDraft(long examId, long teacherId);
}
