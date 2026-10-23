package vn.edu.hanu.exam.service.exam;

import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

import vn.edu.hanu.exam.exception.ExamManagementException;
import vn.edu.hanu.exam.repository.ExamRepository;
import vn.edu.hanu.exam.domain.Exam;
import vn.edu.hanu.exam.domain.ExamStatus;

@Service
public class ExamManagementService {
    public static final String INVALID_EXAM_TITLE = "INVALID_EXAM_TITLE";
    public static final String INVALID_EXAM_DURATION = "INVALID_EXAM_DURATION";
    public static final String EXAM_NOT_FOUND = "EXAM_NOT_FOUND";
    public static final String EXAM_NOT_EDITABLE = "EXAM_NOT_EDITABLE";
    public static final String EXAM_HAS_NO_QUESTIONS = "EXAM_HAS_NO_QUESTIONS";
    public static final String QUESTION_HAS_TOO_FEW_CHOICES = "QUESTION_HAS_TOO_FEW_CHOICES";
    public static final String QUESTION_HAS_INVALID_CORRECT_CHOICE_COUNT =
            "QUESTION_HAS_INVALID_CORRECT_CHOICE_COUNT";
    public static final String DATABASE_ERROR = "DATABASE_ERROR";

    private static final int MAX_TITLE_LENGTH = 255;
    private final ExamRepository examRepository;

    public ExamManagementService(ExamRepository examRepository) {
        this.examRepository = examRepository;
    }

    public ExamDetails createExam(long teacherId, CreateExamCommand command) {
        if (command == null) {
            throw new ExamManagementException(INVALID_EXAM_TITLE, "Exam data is required.");
        }
        String title = normalizeAndValidateTitle(command.title());
        if (command.durationMinutes() <= 0) {
            throw new ExamManagementException(INVALID_EXAM_DURATION, "Exam duration must be greater than zero.");
        }
        try {
            return ExamDetails.from(examRepository.create(
                    title, command.description(), command.durationMinutes(), teacherId));
        } catch (DataAccessException | IllegalStateException exception) {
            throw databaseError(exception);
        }
    }

    public TeacherExamList findAllByCreatedBy(long teacherId) {
        try {
            return new TeacherExamList(examRepository.findAllByCreatedBy(teacherId).stream()
                    .map(ExamDetails::from)
                    .toList());
        } catch (DataAccessException | IllegalStateException exception) {
            throw databaseError(exception);
        }
    }

    public ExamDetails findByIdAndCreatedBy(long examId, long teacherId) {
        if (examId <= 0) {
            throw new ExamManagementException(EXAM_NOT_FOUND, "Exam was not found.");
        }
        try {
            return examRepository.findByIdAndCreatedBy(examId, teacherId)
                    .map(ExamDetails::from)
                    .orElseThrow(() -> new ExamManagementException(EXAM_NOT_FOUND, "Exam was not found."));
        } catch (DataAccessException | IllegalStateException exception) {
            throw databaseError(exception);
        }
    }

    public ExamDetails updateExam(long teacherId, UpdateExamCommand command) {
        if (command == null || command.examId() <= 0) {
            throw notFound();
        }
        String title = normalizeAndValidateTitle(command.title());
        validateDuration(command.durationMinutes());
        Exam current = requireOwnedExam(command.examId(), teacherId);
        requireStatus(current, ExamStatus.DRAFT);
        try {
            return examRepository.updateDraft(
                            command.examId(),
                            teacherId,
                            title,
                            command.description(),
                            command.durationMinutes())
                    .map(ExamDetails::from)
                    .orElseThrow(this::notEditable);
        } catch (DataAccessException exception) {
            throw databaseError(exception);
        }
    }

    public ExamDetails publishExam(long examId, long teacherId) {
        Exam current = requireOwnedExam(examId, teacherId);
        requireStatus(current, ExamStatus.DRAFT);
        try {
            ExamPublishReadiness readiness = examRepository.getPublishReadiness(examId, teacherId);
            validatePublishReadiness(readiness);
            return examRepository.publish(examId, teacherId)
                    .map(ExamDetails::from)
                    .orElseThrow(this::notEditable);
        } catch (DataAccessException exception) {
            throw databaseError(exception);
        }
    }

    public ExamDetails closeExam(long examId, long teacherId) {
        Exam current = requireOwnedExam(examId, teacherId);
        requireStatus(current, ExamStatus.PUBLISHED);
        try {
            return examRepository.close(examId, teacherId)
                    .map(ExamDetails::from)
                    .orElseThrow(this::notEditable);
        } catch (DataAccessException exception) {
            throw databaseError(exception);
        }
    }

    public void deleteExam(long examId, long teacherId) {
        Exam current = requireOwnedExam(examId, teacherId);
        requireStatus(current, ExamStatus.DRAFT);
        try {
            examRepository.deleteDraft(examId, teacherId);
        } catch (DataAccessException exception) {
            throw databaseError(exception);
        } catch (IllegalStateException exception) {
            throw notEditable();
        }
    }

    private String normalizeAndValidateTitle(String title) {
        String normalizedTitle = title == null ? null : title.strip();
        if (normalizedTitle == null || normalizedTitle.isEmpty() || normalizedTitle.length() > MAX_TITLE_LENGTH) {
            throw new ExamManagementException(
                    INVALID_EXAM_TITLE,
                    "Exam title is required and must not exceed 255 characters.");
        }
        return normalizedTitle;
    }

    private void validateDuration(int durationMinutes) {
        if (durationMinutes <= 0) {
            throw new ExamManagementException(
                    INVALID_EXAM_DURATION,
                    "Exam duration must be greater than zero.");
        }
    }

    private Exam requireOwnedExam(long examId, long teacherId) {
        if (examId <= 0) {
            throw notFound();
        }
        try {
            return examRepository.findByIdAndCreatedBy(examId, teacherId).orElseThrow(this::notFound);
        } catch (DataAccessException | IllegalStateException exception) {
            throw databaseError(exception);
        }
    }

    private void requireStatus(Exam exam, ExamStatus expectedStatus) {
        if (exam.status() != expectedStatus) {
            throw notEditable();
        }
    }

    private void validatePublishReadiness(ExamPublishReadiness readiness) {
        if (readiness.questionCount() == 0) {
            throw new ExamManagementException(EXAM_HAS_NO_QUESTIONS, "Exam must contain at least one question.");
        }
        if (readiness.invalidChoiceCount() > 0) {
            throw new ExamManagementException(
                    QUESTION_HAS_TOO_FEW_CHOICES,
                    "Every question must contain at least two choices.");
        }
        if (readiness.invalidCorrectChoiceCount() > 0) {
            throw new ExamManagementException(
                    QUESTION_HAS_INVALID_CORRECT_CHOICE_COUNT,
                    "Every question must contain exactly one correct choice.");
        }
    }

    private ExamManagementException notFound() {
        return new ExamManagementException(EXAM_NOT_FOUND, "Exam was not found.");
    }

    private ExamManagementException notEditable() {
        return new ExamManagementException(
                EXAM_NOT_EDITABLE,
                "Exam is not in the required state for this operation.");
    }

    private ExamManagementException databaseError(RuntimeException cause) {
        return new ExamManagementException(DATABASE_ERROR, "The exam data could not be processed.", cause);
    }
}
