package vn.edu.hanu.exam.service.attempt;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.dao.DataAccessException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.hanu.exam.domain.Choice;
import vn.edu.hanu.exam.domain.Exam;
import vn.edu.hanu.exam.domain.ExamStatus;
import vn.edu.hanu.exam.domain.Question;
import vn.edu.hanu.exam.domain.attempt.AttemptChoice;
import vn.edu.hanu.exam.domain.attempt.AttemptHistoryEntry;
import vn.edu.hanu.exam.domain.attempt.AttemptQuestion;
import vn.edu.hanu.exam.domain.attempt.AttemptScore;
import vn.edu.hanu.exam.domain.attempt.AttemptStatus;
import vn.edu.hanu.exam.domain.attempt.ExamAttempt;
import vn.edu.hanu.exam.domain.attempt.SavedAnswer;
import vn.edu.hanu.exam.domain.attempt.StoredAttemptResult;
import vn.edu.hanu.exam.exception.AttemptException;
import vn.edu.hanu.exam.repository.AttemptRepository;
import vn.edu.hanu.exam.repository.CourseRepository;
import vn.edu.hanu.exam.service.exam.ExamEnrollmentKeyService;

@Service
public class ExamAttemptService {
    public static final String EXAM_NOT_AVAILABLE = "EXAM_NOT_AVAILABLE";
    public static final String EXAM_NOT_READY = "EXAM_NOT_READY";
    public static final String ATTEMPT_NOT_FOUND = "ATTEMPT_NOT_FOUND";
    public static final String ATTEMPT_NOT_ACTIVE = "ATTEMPT_NOT_ACTIVE";
    public static final String ATTEMPT_EXPIRED = "ATTEMPT_EXPIRED";
    public static final String INVALID_ANSWER = "INVALID_ANSWER";
    public static final String ATTEMPT_RESULT_NOT_FOUND = "ATTEMPT_RESULT_NOT_FOUND";
    public static final String DATABASE_ERROR = "DATABASE_ERROR";

    private final AttemptRepository attemptRepository;
    private final CourseRepository courseRepository;
    private ApplicationEventPublisher events;
    private ExamEnrollmentKeyService enrollmentKeys;

    @Autowired
    void setEnrollmentKeys(ExamEnrollmentKeyService enrollmentKeys) {
        this.enrollmentKeys = enrollmentKeys;
    }

    @Autowired
    void setEventPublisher(ApplicationEventPublisher events) { this.events = events; }

    private void notifyMonitoring(long examId) {
        if (events != null) events.publishEvent(
                new vn.edu.hanu.exam.service.monitoring.MonitoringChanged(examId));
    }

    @Autowired
    public ExamAttemptService(AttemptRepository attemptRepository, CourseRepository courseRepository) {
        this.attemptRepository = attemptRepository;
        this.courseRepository = courseRepository;
    }

    public ExamAttemptService(AttemptRepository attemptRepository) {
        this(attemptRepository, null);
    }

    @Transactional
    public ExamAttemptDetails startExam(long examId, long studentId) {
        return startExam(examId, studentId, null);
    }

    @Transactional
    public ExamAttemptDetails startExam(long examId, long studentId, String enrollmentKey) {
        if (examId <= 0) {
            throw examNotAvailable();
        }

        try {
            Exam exam = attemptRepository.findExamByIdForUpdate(examId)
                    .orElseThrow(ExamAttemptService::examNotAvailable);
            if (exam.status() != ExamStatus.PUBLISHED) {
                throw examNotAvailable();
            }
            if (exam.courseId() != null) {
                if (courseRepository == null) throw examNotAvailable();
                // Serialize starting an attempt against removing its membership.
                courseRepository.lockEnrollment(exam.courseId(), studentId);
                if (!courseRepository.isEnrolled(exam.courseId(), studentId)) throw examNotAvailable();
            }
            requireExamOpen(exam);

            ExamAttempt existingAttempt = attemptRepository
                    .findInProgressByExamAndStudent(examId, studentId)
                    .orElse(null);
            if (existingAttempt != null) {
                if (!attemptRepository.isEnrollmentVerified(existingAttempt.id(), studentId)) {
                    requireAdmissionOpen(exam, OffsetDateTime.now(ZoneOffset.UTC));
                    verifyEnrollment(examId, enrollmentKey);
                    requireAdmissionOpen(exam, OffsetDateTime.now(ZoneOffset.UTC));
                    if (!attemptRepository.markEnrollmentVerified(existingAttempt.id(), studentId)) {
                        throw new AttemptException(ATTEMPT_NOT_ACTIVE, "The attempt is no longer active.");
                    }
                } else if (enrollmentKey != null && !enrollmentKey.isEmpty()) {
                    // Only an explicitly keyless resume skips validation. A key
                    // supplied by the entry popup must never be silently ignored.
                    verifyEnrollment(examId, enrollmentKey);
                }
                return buildDetails(existingAttempt, exam);
            }

            requireAdmissionOpen(exam, OffsetDateTime.now(ZoneOffset.UTC));
            List<Question> questions = new ArrayList<>(attemptRepository.findQuestionsByExamId(examId));
            List<Choice> choices = attemptRepository.findChoicesByExamId(examId);
            validateExamContent(questions, choices);
            verifyEnrollment(examId, enrollmentKey);
            Collections.shuffle(questions);

            OffsetDateTime startedAt = OffsetDateTime.now(ZoneOffset.UTC);
            requireAdmissionOpen(exam, startedAt);
            OffsetDateTime deadline = startedAt.plusMinutes(exam.durationMinutes());
            ExamAttempt attempt = attemptRepository.insertAttempt(
                    examId,
                    studentId,
                    startedAt,
                    deadline);
            if (!attemptRepository.markEnrollmentVerified(attempt.id(), studentId)) {
                throw new IllegalStateException("The attempt's enrollment verification could not be saved.");
            }

            attemptRepository.insertAttemptQuestions(
                    attempt.id(),
                    questions.stream().map(Question::id).toList());

            Map<Long, List<Choice>> choicesByQuestion = groupChoicesByQuestion(choices);
            for (Question question : questions) {
                List<Choice> shuffledChoices = new ArrayList<>(choicesByQuestion.get(question.id()));
                Collections.shuffle(shuffledChoices);
                attemptRepository.insertAttemptChoices(
                        attempt.id(),
                        question.id(),
                        shuffledChoices.stream().map(Choice::id).toList());
            }

            notifyMonitoring(examId);
            return buildDetails(attempt, exam);
        } catch (DataAccessException | IllegalStateException exception) {
            throw databaseError(exception);
        }
    }

    @Transactional(readOnly = true)
    public ExamAttemptDetails getAttempt(long attemptId, long studentId) {
        if (attemptId <= 0) {
            throw attemptNotFound();
        }

        try {
            ExamAttempt attempt = attemptRepository.findByIdAndStudent(attemptId, studentId)
                    .orElseThrow(ExamAttemptService::attemptNotFound);
            Exam exam = attemptRepository.findExamById(attempt.examId())
                    .orElseThrow(() -> new IllegalStateException("Attempt references a missing exam."));
            requireExamOpen(exam);
            if (attempt.status() == AttemptStatus.IN_PROGRESS) requireVerifiedAccess(exam, attempt, studentId);
            return buildDetails(attempt, exam);
        } catch (DataAccessException | IllegalStateException exception) {
            throw databaseError(exception);
        }
    }

    @Transactional
    public SavedAnswerDetails saveAnswer(
            long attemptId,
            long questionId,
            long choiceId,
            long studentId) {
        if (attemptId <= 0 || questionId <= 0 || choiceId <= 0) {
            throw invalidAnswer();
        }

        try {
            ExamAttempt attempt = attemptRepository
                    .findByIdAndStudentForUpdate(attemptId, studentId)
                    .orElseThrow(ExamAttemptService::attemptNotFound);
            if (attempt.status() != AttemptStatus.IN_PROGRESS) {
                throw new AttemptException(
                        ATTEMPT_NOT_ACTIVE,
                        "The examination attempt is no longer active.");
            }

            OffsetDateTime savedAt = OffsetDateTime.now(ZoneOffset.UTC);
            if (!savedAt.isBefore(attempt.deadline())) {
                throw new AttemptException(
                        ATTEMPT_EXPIRED,
                        "The examination deadline has passed.");
            }
            Exam exam = attemptRepository.findExamById(attempt.examId())
                    .orElseThrow(() -> new IllegalStateException("Attempt references a missing exam."));
            requireVerifiedAccess(exam, attempt, studentId);
            if (!attemptRepository.containsAttemptChoice(attemptId, questionId, choiceId)) {
                throw invalidAnswer();
            }

            SavedAnswer answer = attemptRepository.upsertAnswer(
                    attemptId,
                    questionId,
                    choiceId,
                    savedAt);
            return toDetails(answer);
        } catch (DataAccessException | IllegalStateException exception) {
            throw databaseError(exception);
        }
    }

    @Transactional
    public ExamSubmissionResult submitExam(long attemptId, long studentId) {
        return completeAttempt(attemptId, studentId, false);
    }

    private ExamSubmissionResult completeAttempt(long attemptId, long studentId, boolean deadlineWorker) {
        if (attemptId <= 0) {
            throw attemptNotFound();
        }

        try {
            ExamAttempt attempt = attemptRepository
                    .findByIdAndStudentForUpdate(attemptId, studentId)
                    .orElseThrow(ExamAttemptService::attemptNotFound);

            if (attempt.status() != AttemptStatus.IN_PROGRESS) {
                return attemptRepository.findSubmissionResult(attemptId, studentId)
                        .map(ExamAttemptService::toResult)
                        .orElseThrow(() -> new IllegalStateException(
                                "A terminal attempt does not contain a stored result."));
            }

            if (!deadlineWorker) {
                Exam exam = attemptRepository.findExamById(attempt.examId())
                        .orElseThrow(() -> new IllegalStateException("Attempt references a missing exam."));
                requireVerifiedAccess(exam, attempt, studentId);
            }
            OffsetDateTime submittedAt = OffsetDateTime.now(ZoneOffset.UTC);
            AttemptStatus finalStatus = submittedAt.isBefore(attempt.deadline())
                    ? AttemptStatus.SUBMITTED
                    : AttemptStatus.EXPIRED;
            AttemptScore score = attemptRepository.calculateScore(attemptId);
            if (!attemptRepository.finalizeAttempt(
                    attemptId,
                    finalStatus,
                    submittedAt,
                    score)) {
                throw new IllegalStateException("The active attempt could not be finalized.");
            }

            notifyMonitoring(attempt.examId());
            return attemptRepository.findSubmissionResult(attemptId, studentId)
                    .map(ExamAttemptService::toResult)
                    .orElseThrow(() -> new IllegalStateException(
                            "The finalized attempt result could not be read back."));
        } catch (DataAccessException | IllegalStateException exception) {
            throw databaseError(exception);
        }
    }

    /** Called by the deadline worker, never from a client-supplied student ID. */
    @Transactional
    public boolean expireAttempt(long attemptId, long studentId) {
        ExamAttempt attempt = attemptRepository
                .findByIdAndStudentForUpdate(attemptId, studentId)
                .orElse(null);
        if (attempt == null || attempt.status() != AttemptStatus.IN_PROGRESS
                || OffsetDateTime.now(ZoneOffset.UTC).isBefore(attempt.deadline())) {
            return false;
        }

        // The transaction above owns the row lock. Reuse the same grading and
        // conditional update path as manual submit while retaining that lock.
        completeAttempt(attemptId, studentId, true);
        return true;
    }

    private void verifyEnrollment(long examId, String key) {
        if (enrollmentKeys == null) throw new IllegalStateException("Enrollment key validation is unavailable.");
        enrollmentKeys.requireValid(examId, key);
    }

    private static void requireExamOpen(Exam exam) {
        if (exam.scheduledAt() != null && OffsetDateTime.now(ZoneOffset.UTC).isBefore(exam.scheduledAt())) {
            throw new AttemptException("EXAM_NOT_OPEN", "This examination has not opened yet.");
        }
    }

    private static void requireAdmissionOpen(Exam exam, OffsetDateTime now) {
        if (exam.entryClosesAt() != null && !now.isBefore(exam.entryClosesAt())) {
            throw new AttemptException("EXAM_ENTRY_CLOSED",
                    "The entry window has closed. New attempts can no longer be started.");
        }
    }

    private void requireVerifiedAccess(Exam exam, ExamAttempt attempt, long studentId) {
        requireExamOpen(exam);
        if (exam.courseId() != null && (courseRepository == null || !courseRepository.isEnrolled(exam.courseId(), studentId))) {
            throw examNotAvailable();
        }
        if (!attemptRepository.isEnrollmentVerified(attempt.id(), studentId)) {
            throw new AttemptException("ENROLLMENT_KEY_REQUIRED",
                    "Return to the exam details and enter the enrollment key before continuing this attempt.");
        }
    }

    @Transactional(readOnly = true)
    public AttemptHistoryResult getAttemptHistory(long studentId) {
        if (studentId <= 0) {
            throw new IllegalArgumentException("A valid student ID is required.");
        }

        try {
            List<StudentAttemptResult> attempts = attemptRepository
                    .findHistoryByStudentId(studentId)
                    .stream()
                    .map(ExamAttemptService::toStudentResult)
                    .toList();
            return new AttemptHistoryResult(attempts);
        } catch (DataAccessException | IllegalStateException exception) {
            throw databaseError(exception);
        }
    }

    @Transactional(readOnly = true)
    public StudentAttemptResult getAttemptResult(long attemptId, long studentId) {
        if (attemptId <= 0 || studentId <= 0) {
            throw attemptResultNotFound();
        }

        try {
            return attemptRepository
                    .findCompletedAttemptByIdAndStudent(attemptId, studentId)
                    .map(ExamAttemptService::toStudentResult)
                    .orElseThrow(ExamAttemptService::attemptResultNotFound);
        } catch (DataAccessException | IllegalStateException exception) {
            throw databaseError(exception);
        }
    }

    private ExamAttemptDetails buildDetails(ExamAttempt attempt, Exam exam) {
        List<AttemptQuestion> questions = attemptRepository.findAttemptQuestions(attempt.id());
        Map<Long, List<AttemptChoiceDetails>> choicesByQuestion = new LinkedHashMap<>();

        for (AttemptChoice choice : attemptRepository.findAttemptChoices(attempt.id())) {
            choicesByQuestion.computeIfAbsent(choice.questionId(), ignored -> new ArrayList<>())
                    .add(new AttemptChoiceDetails(
                            choice.choiceId(),
                            choice.content(),
                            choice.displayOrder()));
        }

        List<AttemptQuestionDetails> questionDetails = questions.stream()
                .map(question -> new AttemptQuestionDetails(
                        question.questionId(),
                        question.content(),
                        question.points(),
                        question.displayOrder(),
                        choicesByQuestion.getOrDefault(question.questionId(), List.of())))
                .toList();

        List<SavedAnswerDetails> answers = attemptRepository.findSavedAnswers(attempt.id())
                .stream()
                .map(ExamAttemptService::toDetails)
                .toList();
        ExamSubmissionResult result = attempt.status() == AttemptStatus.IN_PROGRESS
                ? null
                : attemptRepository.findSubmissionResult(attempt.id(), attempt.studentId())
                        .map(ExamAttemptService::toResult)
                        .orElse(null);

        return new ExamAttemptDetails(
                attempt.id(),
                attempt.examId(),
                exam.title(),
                attempt.status(),
                attempt.startedAt(),
                attempt.deadline(),
                questionDetails,
                answers,
                result);
    }

    private static SavedAnswerDetails toDetails(SavedAnswer answer) {
        return new SavedAnswerDetails(
                answer.questionId(),
                answer.choiceId(),
                answer.savedAt());
    }

    private static ExamSubmissionResult toResult(StoredAttemptResult result) {
        return new ExamSubmissionResult(
                result.attemptId(),
                result.examId(),
                result.status(),
                result.submittedAt(),
                result.score(),
                result.maxScore(),
                result.correctAnswers(),
                result.totalQuestions());
    }

    private static StudentAttemptResult toStudentResult(AttemptHistoryEntry entry) {
        return new StudentAttemptResult(
                entry.attemptId(),
                entry.examId(),
                entry.examTitle(),
                entry.status(),
                entry.startedAt(),
                entry.submittedAt(),
                entry.score(),
                entry.maxScore(),
                entry.correctAnswers(),
                entry.totalQuestions(),
                entry.courseName(),
                entry.description());
    }

    private static void validateExamContent(List<Question> questions, List<Choice> choices) {
        if (questions.isEmpty()) {
            throw new AttemptException(EXAM_NOT_READY, "Exam does not contain any questions.");
        }

        Map<Long, List<Choice>> choicesByQuestion = groupChoicesByQuestion(choices);
        boolean invalidQuestion = questions.stream()
                .anyMatch(question -> choicesByQuestion.getOrDefault(question.id(), List.of()).size() < 2);
        if (invalidQuestion) {
            throw new AttemptException(
                    EXAM_NOT_READY,
                    "Every exam question must contain at least two choices.");
        }
    }

    private static Map<Long, List<Choice>> groupChoicesByQuestion(List<Choice> choices) {
        Map<Long, List<Choice>> choicesByQuestion = new LinkedHashMap<>();
        for (Choice choice : choices) {
            choicesByQuestion.computeIfAbsent(choice.questionId(), ignored -> new ArrayList<>())
                    .add(choice);
        }
        return choicesByQuestion;
    }

    private static AttemptException examNotAvailable() {
        return new AttemptException(EXAM_NOT_AVAILABLE, "Exam is not available.");
    }

    private static AttemptException attemptNotFound() {
        return new AttemptException(ATTEMPT_NOT_FOUND, "Attempt was not found.");
    }

    private static AttemptException invalidAnswer() {
        return new AttemptException(
                INVALID_ANSWER,
                "The selected choice does not belong to this attempt question.");
    }

    private static AttemptException attemptResultNotFound() {
        return new AttemptException(
                ATTEMPT_RESULT_NOT_FOUND,
                "The completed attempt result was not found.");
    }

    private static AttemptException databaseError(RuntimeException cause) {
        return new AttemptException(DATABASE_ERROR, "The exam attempt could not be processed.", cause);
    }
}
