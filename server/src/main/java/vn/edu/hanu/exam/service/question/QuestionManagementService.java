package vn.edu.hanu.exam.service.question;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.hanu.exam.domain.Choice;
import vn.edu.hanu.exam.domain.ExamStatus;
import vn.edu.hanu.exam.domain.Question;
import vn.edu.hanu.exam.exception.QuestionManagementException;
import vn.edu.hanu.exam.repository.QuestionRepository;
import vn.edu.hanu.exam.service.question.CreateQuestionCommand.ChoiceCommand;

@Service
public class QuestionManagementService {
    public static final String EXAM_NOT_FOUND =
            "EXAM_NOT_FOUND";

    public static final String EXAM_NOT_EDITABLE =
            "EXAM_NOT_EDITABLE";

    public static final String INVALID_QUESTION_CONTENT =
            "INVALID_QUESTION_CONTENT";

    public static final String INVALID_QUESTION_POINTS =
            "INVALID_QUESTION_POINTS";

    public static final String INVALID_DISPLAY_ORDER =
            "INVALID_DISPLAY_ORDER";

    public static final String TOO_FEW_CHOICES =
            "TOO_FEW_CHOICES";

    public static final String INVALID_CHOICE_CONTENT =
            "INVALID_CHOICE_CONTENT";

    public static final String DUPLICATE_CHOICE_ORDER =
            "DUPLICATE_CHOICE_ORDER";

    public static final String INVALID_CORRECT_CHOICE_COUNT =
            "INVALID_CORRECT_CHOICE_COUNT";

    public static final String DATABASE_ERROR =
            "DATABASE_ERROR";

    private static final int MINIMUM_CHOICE_COUNT = 2;

    private final QuestionRepository questionRepository;

    public QuestionManagementService(
            QuestionRepository questionRepository
    ) {
        this.questionRepository = questionRepository;
    }

    @Transactional
    public TeacherQuestionDetails createQuestion(
            long teacherId,
            CreateQuestionCommand command
    ) {
        ValidatedQuestion validated =
                validateCreateCommand(command);

        try {
            ExamStatus examStatus = questionRepository
                    .findOwnedExamStatusForUpdate(
                            validated.examId(),
                            teacherId
                    )
                    .orElseThrow(
                            QuestionManagementService::examNotFound
                    );

            if (examStatus != ExamStatus.DRAFT) {
                throw new QuestionManagementException(
                        EXAM_NOT_EDITABLE,
                        "Questions can only be added to a draft exam."
                );
            }

            Question question =
                    questionRepository.insertQuestion(
                            validated.examId(),
                            validated.content(),
                            validated.points(),
                            validated.displayOrder()
                    );

            List<Choice> createdChoices =
                    new ArrayList<>();

            for (ChoiceCommand choice : validated.choices()) {
                Choice createdChoice =
                        questionRepository.insertChoice(
                                question.id(),
                                choice.content(),
                                choice.correct(),
                                choice.displayOrder()
                        );

                createdChoices.add(createdChoice);
            }

            return TeacherQuestionDetails.from(
                    question,
                    createdChoices
            );
        } catch (DataAccessException | IllegalStateException exception) {
            throw databaseError(exception);
        }
    }

    @Transactional(readOnly = true)
    public TeacherQuestionList findAllByExamId(
            long teacherId,
            long examId
    ) {
        validateExamId(examId);

        try {
            questionRepository.findOwnedExamStatus(
                    examId,
                    teacherId
            ).orElseThrow(
                    QuestionManagementService::examNotFound
            );

            List<Question> questions =
                    questionRepository
                            .findAllQuestionsByExamId(examId);

            List<Choice> choices =
                    questionRepository
                            .findAllChoicesByExamId(examId);

            Map<Long, List<Choice>> choicesByQuestionId =
                    groupChoicesByQuestionId(choices);

            List<TeacherQuestionDetails> details =
                    questions.stream()
                            .map(question ->
                                    TeacherQuestionDetails.from(
                                            question,
                                            choicesByQuestionId
                                                    .getOrDefault(
                                                            question.id(),
                                                            List.of()
                                                    )
                                    )
                            )
                            .toList();

            return new TeacherQuestionList(details);
        } catch (DataAccessException | IllegalStateException exception) {
            throw databaseError(exception);
        }
    }

    private ValidatedQuestion validateCreateCommand(
            CreateQuestionCommand command
    ) {
        if (command == null) {
            throw new QuestionManagementException(
                    INVALID_QUESTION_CONTENT,
                    "Question data is required."
            );
        }

        validateExamId(command.examId());

        String normalizedContent =
                normalizeRequiredText(
                        command.content(),
                        INVALID_QUESTION_CONTENT,
                        "Question content is required."
                );

        if (command.points() <= 0) {
            throw new QuestionManagementException(
                    INVALID_QUESTION_POINTS,
                    "Question points must be greater than zero."
            );
        }

        if (command.displayOrder() < 0) {
            throw new QuestionManagementException(
                    INVALID_DISPLAY_ORDER,
                    "Question display order must not be negative."
            );
        }

        List<ChoiceCommand> normalizedChoices =
                validateChoices(command.choices());

        return new ValidatedQuestion(
                command.examId(),
                normalizedContent,
                command.points(),
                command.displayOrder(),
                normalizedChoices
        );
    }

    private List<ChoiceCommand> validateChoices(
            List<ChoiceCommand> choices
    ) {
        if (choices == null
                || choices.size() < MINIMUM_CHOICE_COUNT) {
            throw new QuestionManagementException(
                    TOO_FEW_CHOICES,
                    "A question must have at least two choices."
            );
        }

        List<ChoiceCommand> normalizedChoices =
                new ArrayList<>();

        Set<Integer> displayOrders =
                new HashSet<>();

        int correctChoiceCount = 0;

        for (ChoiceCommand choice : choices) {
            if (choice == null) {
                throw new QuestionManagementException(
                        INVALID_CHOICE_CONTENT,
                        "Choice data is required."
                );
            }

            String normalizedContent =
                    normalizeRequiredText(
                            choice.content(),
                            INVALID_CHOICE_CONTENT,
                            "Choice content is required."
                    );

            if (choice.displayOrder() < 0) {
                throw new QuestionManagementException(
                        INVALID_DISPLAY_ORDER,
                        "Choice display order must not be negative."
                );
            }

            if (!displayOrders.add(choice.displayOrder())) {
                throw new QuestionManagementException(
                        DUPLICATE_CHOICE_ORDER,
                        "Choice display orders must be unique."
                );
            }

            if (choice.correct()) {
                correctChoiceCount++;
            }

            normalizedChoices.add(
                    new ChoiceCommand(
                            normalizedContent,
                            choice.correct(),
                            choice.displayOrder()
                    )
            );
        }

        if (correctChoiceCount != 1) {
            throw new QuestionManagementException(
                    INVALID_CORRECT_CHOICE_COUNT,
                    "A question must have exactly one correct choice."
            );
        }

        return List.copyOf(normalizedChoices);
    }

    private void validateExamId(long examId) {
        if (examId <= 0) {
            throw examNotFound();
        }
    }

    private String normalizeRequiredText(
            String value,
            String errorCode,
            String errorMessage
    ) {
        String normalized =
                value == null ? null : value.strip();

        if (normalized == null || normalized.isEmpty()) {
            throw new QuestionManagementException(
                    errorCode,
                    errorMessage
            );
        }

        return normalized;
    }

    private Map<Long, List<Choice>>
            groupChoicesByQuestionId(List<Choice> choices) {
        Map<Long, List<Choice>> groupedChoices =
                new HashMap<>();

        for (Choice choice : choices) {
            groupedChoices
                    .computeIfAbsent(
                            choice.questionId(),
                            ignored -> new ArrayList<>()
                    )
                    .add(choice);
        }

        return groupedChoices;
    }

    private static QuestionManagementException examNotFound() {
        return new QuestionManagementException(
                EXAM_NOT_FOUND,
                "Exam was not found."
        );
    }

    private static QuestionManagementException databaseError(
            RuntimeException cause
    ) {
        return new QuestionManagementException(
                DATABASE_ERROR,
                "The question data could not be processed.",
                cause
        );
    }

    private record ValidatedQuestion(
            long examId,
            String content,
            int points,
            int displayOrder,
            List<ChoiceCommand> choices
    ) {
    }
}