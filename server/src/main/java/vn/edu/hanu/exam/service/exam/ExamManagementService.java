package vn.edu.hanu.exam.service.exam;

import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

import vn.edu.hanu.exam.exception.ExamManagementException;
import vn.edu.hanu.exam.repository.ExamRepository;

@Service
public class ExamManagementService {
    public static final String INVALID_EXAM_TITLE = "INVALID_EXAM_TITLE";
    public static final String INVALID_EXAM_DURATION = "INVALID_EXAM_DURATION";
    public static final String EXAM_NOT_FOUND = "EXAM_NOT_FOUND";
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

    private String normalizeAndValidateTitle(String title) {
        String normalizedTitle = title == null ? null : title.strip();
        if (normalizedTitle == null || normalizedTitle.isEmpty() || normalizedTitle.length() > MAX_TITLE_LENGTH) {
            throw new ExamManagementException(
                    INVALID_EXAM_TITLE,
                    "Exam title is required and must not exceed 255 characters.");
        }
        return normalizedTitle;
    }

    private ExamManagementException databaseError(RuntimeException cause) {
        return new ExamManagementException(DATABASE_ERROR, "The exam data could not be processed.", cause);
    }
}
