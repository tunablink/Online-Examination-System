package vn.edu.hanu.exam.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import vn.edu.hanu.exam.domain.Exam;

public interface ExamRepository {
    Exam create(
            String title,
            String description,
            int durationMinutes,
            long createdBy);

    Exam create(
            String title,
            String description,
            int durationMinutes,
            OffsetDateTime scheduledAt,
            long createdBy);

    Exam createInCourse(String title, String description, int durationMinutes,
            OffsetDateTime scheduledAt, long createdBy, long courseId);

    Exam createInCourse(String title, String description, int durationMinutes,
            OffsetDateTime scheduledAt, long createdBy, long courseId, String assessmentType);

    List<Exam> findAllByCreatedBy(long createdBy);

    Optional<Exam> findByIdAndCreatedBy(
            long examId,
            long createdBy);

    Optional<Exam> updateDraft(
            long examId,
            long teacherId,
            String title,
            String description,
            int durationMinutes);

    Optional<Exam> updateDraft(
            long examId,
            long teacherId,
            String title,
            String description,
            int durationMinutes,
            OffsetDateTime scheduledAt);

    boolean updateDraftAssessmentType(long examId, long teacherId, String assessmentType);

    ExamPublishReadiness getPublishReadiness(long examId);

    Optional<Exam> publishDraft(long examId, long teacherId);

    Optional<Exam> closePublished(long examId, long teacherId);

    int deleteChoicesByExamId(long examId);

    int deleteQuestionsByExamId(long examId);

    boolean deleteDraft(long examId, long teacherId);
}
