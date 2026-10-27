package vn.edu.hanu.exam.service.attempt;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.hanu.exam.domain.Choice;
import vn.edu.hanu.exam.domain.Exam;
import vn.edu.hanu.exam.domain.ExamStatus;
import vn.edu.hanu.exam.domain.Question;
import vn.edu.hanu.exam.domain.attempt.AttemptChoice;
import vn.edu.hanu.exam.domain.attempt.AttemptQuestion;
import vn.edu.hanu.exam.domain.attempt.ExamAttempt;
import vn.edu.hanu.exam.exception.AttemptException;
import vn.edu.hanu.exam.repository.AttemptRepository;

@Service
public class ExamAttemptService {
    public static final String EXAM_NOT_AVAILABLE = "EXAM_NOT_AVAILABLE";
    public static final String EXAM_NOT_READY = "EXAM_NOT_READY";
    public static final String ATTEMPT_NOT_FOUND = "ATTEMPT_NOT_FOUND";
    public static final String DATABASE_ERROR = "DATABASE_ERROR";

    private final AttemptRepository attemptRepository;

    public ExamAttemptService(AttemptRepository attemptRepository) {
        this.attemptRepository = attemptRepository;
    }

    @Transactional
    public ExamAttemptDetails startExam(long examId, long studentId) {
        if (examId <= 0) {
            throw examNotAvailable();
        }

        try {
            Exam exam = attemptRepository.findExamByIdForUpdate(examId)
                    .orElseThrow(ExamAttemptService::examNotAvailable);
            if (exam.status() != ExamStatus.PUBLISHED) {
                throw examNotAvailable();
            }

            ExamAttempt existingAttempt = attemptRepository
                    .findInProgressByExamAndStudent(examId, studentId)
                    .orElse(null);
            if (existingAttempt != null) {
                return buildDetails(existingAttempt, exam);
            }

            List<Question> questions = new ArrayList<>(attemptRepository.findQuestionsByExamId(examId));
            List<Choice> choices = attemptRepository.findChoicesByExamId(examId);
            validateExamContent(questions, choices);
            Collections.shuffle(questions);

            OffsetDateTime startedAt = OffsetDateTime.now(ZoneOffset.UTC);
            OffsetDateTime deadline = startedAt.plusMinutes(exam.durationMinutes());
            ExamAttempt attempt = attemptRepository.insertAttempt(
                    examId,
                    studentId,
                    startedAt,
                    deadline);

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
            return buildDetails(attempt, exam);
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

        return new ExamAttemptDetails(
                attempt.id(),
                attempt.examId(),
                exam.title(),
                attempt.status(),
                attempt.startedAt(),
                attempt.deadline(),
                questionDetails);
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

    private static AttemptException databaseError(RuntimeException cause) {
        return new AttemptException(DATABASE_ERROR, "The exam attempt could not be processed.", cause);
    }
}
