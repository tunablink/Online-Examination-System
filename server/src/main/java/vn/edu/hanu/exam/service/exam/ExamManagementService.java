package vn.edu.hanu.exam.service.exam;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.dao.DataAccessException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.hanu.exam.domain.Exam;
import vn.edu.hanu.exam.domain.ExamStatus;
import vn.edu.hanu.exam.exception.ExamManagementException;
import vn.edu.hanu.exam.repository.ExamPublishReadiness;
import vn.edu.hanu.exam.repository.ExamRepository;
import vn.edu.hanu.exam.service.course.CourseService;
import vn.edu.hanu.exam.service.question.CreateQuestionCommand;
import vn.edu.hanu.exam.service.question.QuestionManagementService;

@Service
public class ExamManagementService {
    public static final String INVALID_EXAM_TITLE = "INVALID_EXAM_TITLE";
    public static final String INVALID_EXAM_DURATION = "INVALID_EXAM_DURATION";
    public static final String INVALID_EXAM_SCHEDULE = "INVALID_EXAM_SCHEDULE";
    public static final String EXAM_NOT_FOUND = "EXAM_NOT_FOUND";
    public static final String DATABASE_ERROR = "DATABASE_ERROR";
    public static final String EXAM_NOT_EDITABLE = "EXAM_NOT_EDITABLE";
    public static final String EXAM_HAS_NO_QUESTIONS = "EXAM_HAS_NO_QUESTIONS";
    public static final String QUESTION_HAS_TOO_FEW_CHOICES = "QUESTION_HAS_TOO_FEW_CHOICES";
    public static final String QUESTION_HAS_INVALID_CORRECT_CHOICE_COUNT =
            "QUESTION_HAS_INVALID_CORRECT_CHOICE_COUNT";
    public static final String EXAM_NOT_CLOSABLE = "EXAM_NOT_CLOSABLE";
    public static final String EXAM_NOT_DELETABLE = "EXAM_NOT_DELETABLE";
    public static final String EXAM_HAS_NO_QUESTIONS_ON_CREATE = "EXAM_HAS_NO_QUESTIONS";
    public static final String INVALID_ASSESSMENT_TYPE = "INVALID_ASSESSMENT_TYPE";

    private static final int MAX_TITLE_LENGTH = 255;
    private final ExamRepository examRepository;
    private final CourseService courseService;
    private final QuestionManagementService questionService;
    private ExamEnrollmentKeyService enrollmentKeys;

    @Autowired
    void setEnrollmentKeys(ExamEnrollmentKeyService enrollmentKeys) { this.enrollmentKeys = enrollmentKeys; }

    public ExamManagementService(ExamRepository examRepository, CourseService courseService,
            QuestionManagementService questionService) {
        this.examRepository = examRepository;
        this.courseService = courseService;
        this.questionService = questionService;
    }

    @Transactional
    public ExamDetails createExam(long teacherId, CreateExamCommand command) {
        return createExamInternal(teacherId, null, command);
    }

    @Transactional
    public ExamDetails createExamInCourse(long teacherId, long courseId, CreateExamCommand command) {
        courseService.requireOwned(courseId, teacherId);
        return createExamInternal(teacherId, courseId, command);
    }

    @Transactional
    public ExamDetails createExamWithQuestions(long teacherId, long courseId, CreateExamCommand command,
            String assessmentType, List<CreateQuestionCommand> questions) {
        if (questions == null || questions.isEmpty()) {
            throw new ExamManagementException(EXAM_HAS_NO_QUESTIONS_ON_CREATE,
                    "Add at least one question before creating the draft.");
        }
        courseService.requireOwned(courseId, teacherId);
        ExamDetails created = createExamInternal(teacherId, courseId, command,
                normalizeAndValidateAssessmentType(assessmentType));
        for (CreateQuestionCommand question : questions) {
            questionService.createQuestion(teacherId, new CreateQuestionCommand(created.id(), question.content(),
                    question.points(), question.displayOrder(), question.choices()));
        }
        return created;
    }

    private ExamDetails createExamInternal(long teacherId, Long courseId, CreateExamCommand command) {
        return createExamInternal(teacherId, courseId, command, "Examination");
    }

    private ExamDetails createExamInternal(long teacherId, Long courseId, CreateExamCommand command,
            String assessmentType) {
        if (command == null) {
            throw new ExamManagementException(INVALID_EXAM_TITLE, "Exam data is required.");
        }
        String title = normalizeAndValidateTitle(command.title());
        if (command.durationMinutes() <= 0) {
            throw new ExamManagementException(INVALID_EXAM_DURATION, "Exam duration must be greater than zero.");
        }
        if (command.scheduledAt() == null || !command.scheduledAt().isAfter(OffsetDateTime.now())) {
            throw new ExamManagementException(
                    INVALID_EXAM_SCHEDULE,
                    "Exam date and time must be in the future.");
        }
        validateEntryWindow(command.scheduledAt(), command.entryClosesAt(), false);
        try {
            Exam created = courseId == null
                    ? examRepository.create(title, command.description(), command.durationMinutes(), command.scheduledAt(), teacherId)
                    : examRepository.createInCourse(title, command.description(), command.durationMinutes(),
                            command.scheduledAt(), teacherId, courseId, assessmentType);
            if (command.entryClosesAt() != null) {
                if (!examRepository.updateDraftEntryClosesAt(created.id(), teacherId, command.entryClosesAt())) {
                    throw new IllegalStateException("The draft entry window could not be saved.");
                }
                created = examRepository.findByIdAndCreatedBy(created.id(), teacherId).orElseThrow();
            }
            if (command.enrollmentKey() != null) {
                enrollmentKeys.configureDraft(created.id(), teacherId, command.enrollmentKey());
            }
            return ExamDetails.from(created);
        } catch (DataAccessException | IllegalStateException exception) {
            throw databaseError(exception);
        }
    }

    @Transactional
    public ExamDetails updateDraftExam(
            long examId,
            long teacherId,
            UpdateExamCommand command) {
        if (examId <= 0) {
            throw new ExamManagementException(
                    EXAM_NOT_FOUND,
                    "Exam was not found.");
        }

        if (command == null) {
            throw new ExamManagementException(
                    INVALID_EXAM_TITLE,
                    "Exam data is required.");
        }

        String title = normalizeAndValidateTitle(command.title());
        String assessmentType = command.assessmentType() == null ? null
                : normalizeAndValidateAssessmentType(command.assessmentType());

        if (command.durationMinutes() <= 0) {
            throw new ExamManagementException(
                    INVALID_EXAM_DURATION,
                    "Exam duration must be greater than zero.");
        }
        if (command.scheduledAt() != null
                && !command.scheduledAt().isAfter(OffsetDateTime.now())) {
            throw new ExamManagementException(
                    INVALID_EXAM_SCHEDULE,
                    "Exam date and time must be in the future.");
        }

        try {
            Exam currentExam = examRepository
                    .findByIdAndCreatedBy(examId, teacherId)
                    .orElseThrow(() -> new ExamManagementException(
                            EXAM_NOT_FOUND,
                            "Exam was not found."));

            if (currentExam.status() != ExamStatus.DRAFT) {
                throw new ExamManagementException(
                        EXAM_NOT_EDITABLE,
                        "Only a draft exam can be updated.");
            }

            validateEntryWindow(command.scheduledAt() == null ? currentExam.scheduledAt() : command.scheduledAt(),
                    command.entryClosesAt() == null ? currentExam.entryClosesAt() : command.entryClosesAt(), false);
            if (command.entryClosesAt() != null && !command.entryClosesAt().isAfter(OffsetDateTime.now())) {
                throw new ExamManagementException("INVALID_ENTRY_WINDOW", "Entry closing time must be in the future.");
            }
            var updated = command.scheduledAt() == null
                    ? examRepository.updateDraft(
                            examId,
                            teacherId,
                            title,
                            command.description(),
                            command.durationMinutes())
                    : examRepository.updateDraft(
                            examId,
                            teacherId,
                            title,
                            command.description(),
                            command.durationMinutes(),
                            command.scheduledAt());

            Exam saved = updated
                    .orElseThrow(() -> new ExamManagementException(
                            EXAM_NOT_EDITABLE,
                            "The exam is no longer editable."));
            if (assessmentType != null) {
                if (!examRepository.updateDraftAssessmentType(examId, teacherId, assessmentType)) {
                    throw new ExamManagementException(EXAM_NOT_EDITABLE, "The exam is no longer editable.");
                }
                saved = examRepository.findByIdAndCreatedBy(examId, teacherId).orElseThrow();
            }
            if (command.enrollmentKey() != null && !command.enrollmentKey().isEmpty()) {
                enrollmentKeys.configureDraft(examId, teacherId, command.enrollmentKey());
            }
            if (command.entryClosesAt() != null) {
                if (!examRepository.updateDraftEntryClosesAt(examId, teacherId, command.entryClosesAt())) {
                    throw new ExamManagementException(EXAM_NOT_EDITABLE, "The exam is no longer editable.");
                }
                saved = examRepository.findByIdAndCreatedBy(examId, teacherId).orElseThrow();
            }
            return ExamDetails.from(saved);
        } catch (DataAccessException | IllegalStateException exception) {
            throw databaseError(exception);
        }
    }

    public static void validateEntryWindow(OffsetDateTime opensAt, OffsetDateTime closesAt, boolean required) {
        if ((required && closesAt == null)
                || (closesAt != null && opensAt != null && !closesAt.isAfter(opensAt))) {
            throw new ExamManagementException("INVALID_ENTRY_WINDOW",
                    "Entry closing time is required and must be later than the opening time.");
        }
    }

    @Transactional
    public ExamDetails publishExam(long examId, long teacherId) {
        if (examId <= 0) {
            throw new ExamManagementException(EXAM_NOT_FOUND, "Exam was not found.");
        }

        try {
            Exam exam = examRepository.findByIdAndCreatedBy(examId, teacherId)
                    .orElseThrow(() -> new ExamManagementException(
                            EXAM_NOT_FOUND,
                            "Exam was not found."));

            if (exam.status() != ExamStatus.DRAFT) {
                throw new ExamManagementException(
                        EXAM_NOT_EDITABLE,
                        "Only a draft exam can be published.");
            }

            ExamPublishReadiness readiness = examRepository.getPublishReadiness(examId);

            if (readiness.questionCount() == 0) {
                throw new ExamManagementException(
                        EXAM_HAS_NO_QUESTIONS,
                        "The exam must contain at least one question before publication.");
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

            return examRepository.publishDraft(examId, teacherId)
                    .map(ExamDetails::from)
                    .orElseThrow(() -> new ExamManagementException(
                            EXAM_NOT_EDITABLE,
                            "The exam is no longer publishable."));
        } catch (DataAccessException | IllegalStateException exception) {
            throw databaseError(exception);
        }
    }

    @Transactional
    public ExamDetails closeExam(long examId, long teacherId) {
        if (examId <= 0) {
            throw new ExamManagementException(EXAM_NOT_FOUND, "Exam was not found.");
        }

        try {
            Exam exam = examRepository.findByIdAndCreatedBy(examId, teacherId)
                    .orElseThrow(() -> new ExamManagementException(
                            EXAM_NOT_FOUND,
                            "Exam was not found."));

            if (exam.status() != ExamStatus.PUBLISHED) {
                throw new ExamManagementException(
                        EXAM_NOT_CLOSABLE,
                        "Only a published exam can be closed.");
            }

            return examRepository.closePublished(examId, teacherId)
                    .map(ExamDetails::from)
                    .orElseThrow(() -> new ExamManagementException(
                            EXAM_NOT_CLOSABLE,
                            "The exam is no longer closable."));
        } catch (DataAccessException | IllegalStateException exception) {
            throw databaseError(exception);
        }
    }

    @Transactional
    public DeletedExamDetails deleteDraftExam(long examId, long teacherId) {
        if (examId <= 0) {
            throw new ExamManagementException(EXAM_NOT_FOUND, "Exam was not found.");
        }

        try {
            Exam exam = examRepository.findByIdAndCreatedBy(examId, teacherId)
                    .orElseThrow(() -> new ExamManagementException(
                            EXAM_NOT_FOUND,
                            "Exam was not found."));

            if (exam.status() != ExamStatus.DRAFT) {
                throw new ExamManagementException(
                        EXAM_NOT_DELETABLE,
                        "Only a draft exam can be deleted.");
            }

            examRepository.deleteChoicesByExamId(examId);
            examRepository.deleteQuestionsByExamId(examId);

            if (!examRepository.deleteDraft(examId, teacherId)) {
                throw new ExamManagementException(
                        EXAM_NOT_DELETABLE,
                        "The exam is no longer deletable.");
            }

            return new DeletedExamDetails(examId);
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

    private String normalizeAndValidateAssessmentType(String assessmentType) {
        String normalized = assessmentType == null ? null : assessmentType.strip();
        if (normalized == null || normalized.isEmpty() || normalized.length() > 60) {
            throw new ExamManagementException(INVALID_ASSESSMENT_TYPE,
                    "Assessment type is required and must not exceed 60 characters.");
        }
        return normalized;
    }

    private ExamManagementException databaseError(RuntimeException cause) {
        return new ExamManagementException(DATABASE_ERROR, "The exam data could not be processed.", cause);
    }
}
