package vn.edu.hanu.exam.service.question;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.dao.DataAccessResourceFailureException;

import vn.edu.hanu.exam.domain.Choice;
import vn.edu.hanu.exam.domain.ExamStatus;
import vn.edu.hanu.exam.domain.Question;
import vn.edu.hanu.exam.exception.QuestionManagementException;
import vn.edu.hanu.exam.repository.QuestionExamContext;
import vn.edu.hanu.exam.repository.QuestionRepository;
import vn.edu.hanu.exam.service.question.CreateQuestionCommand.ChoiceCommand;

class QuestionManagementServiceTests {
    private static final long TEACHER_ID = 20L;
    private static final long EXAM_ID = 12L;
    private static final long QUESTION_ID = 100L;

    private QuestionRepository questionRepository;
    private QuestionManagementService questionService;

    @BeforeEach
    void setUp() {
        questionRepository = mock(QuestionRepository.class);
        questionService =
                new QuestionManagementService(questionRepository);
    }

    @Test
    void createQuestionLocksDraftExamNormalizesTextAndCreatesChoices() {
        CreateQuestionCommand command =
                new CreateQuestionCommand(
                        EXAM_ID,
                        "  Which keyword extends a class?  ",
                        2,
                        0,
                        List.of(
                                new ChoiceCommand(
                                        "  extends  ",
                                        true,
                                        0
                                ),
                                new ChoiceCommand(
                                        "  implements  ",
                                        false,
                                        1
                                )
                        )
                );

        OffsetDateTime timestamp =
                OffsetDateTime.parse(
                        "2026-10-24T15:00:00+07:00"
                );

        Question createdQuestion =
                new Question(
                        QUESTION_ID,
                        EXAM_ID,
                        "Which keyword extends a class?",
                        2,
                        0,
                        timestamp,
                        timestamp
                );

        Choice correctChoice =
                new Choice(
                        201L,
                        QUESTION_ID,
                        "extends",
                        true,
                        0
                );

        Choice incorrectChoice =
                new Choice(
                        202L,
                        QUESTION_ID,
                        "implements",
                        false,
                        1
                );

        when(questionRepository.findOwnedExamStatusForUpdate(
                EXAM_ID,
                TEACHER_ID
        )).thenReturn(Optional.of(ExamStatus.DRAFT));

        when(questionRepository.insertQuestion(
                EXAM_ID,
                "Which keyword extends a class?",
                2,
                0
        )).thenReturn(createdQuestion);

        when(questionRepository.insertChoice(
                QUESTION_ID,
                "extends",
                true,
                0
        )).thenReturn(correctChoice);

        when(questionRepository.insertChoice(
                QUESTION_ID,
                "implements",
                false,
                1
        )).thenReturn(incorrectChoice);

        TeacherQuestionDetails result =
                questionService.createQuestion(
                        TEACHER_ID,
                        command
                );

        assertEquals(QUESTION_ID, result.id());
        assertEquals(EXAM_ID, result.examId());
        assertEquals(
                "Which keyword extends a class?",
                result.content()
        );
        assertEquals(2, result.points());
        assertEquals(2, result.choices().size());

        assertEquals(
                "extends",
                result.choices().get(0).content()
        );

        assertEquals(
                true,
                result.choices().get(0).correct()
        );

        InOrder callOrder = inOrder(questionRepository);

        callOrder.verify(questionRepository)
                .findOwnedExamStatusForUpdate(
                        EXAM_ID,
                        TEACHER_ID
                );

        callOrder.verify(questionRepository)
                .insertQuestion(
                        EXAM_ID,
                        "Which keyword extends a class?",
                        2,
                        0
                );

        callOrder.verify(questionRepository)
                .insertChoice(
                        QUESTION_ID,
                        "extends",
                        true,
                        0
                );

        callOrder.verify(questionRepository)
                .insertChoice(
                        QUESTION_ID,
                        "implements",
                        false,
                        1
                );
    }

    @Test
    void anotherTeachersExamIsHiddenAsNotFound() {
        when(questionRepository.findOwnedExamStatusForUpdate(
                EXAM_ID,
                TEACHER_ID
        )).thenReturn(Optional.empty());

        QuestionManagementException exception =
                assertThrows(
                        QuestionManagementException.class,
                        () -> questionService.createQuestion(
                                TEACHER_ID,
                                validCommand()
                        )
                );

        assertEquals(
                QuestionManagementService.EXAM_NOT_FOUND,
                exception.code()
        );

        verify(
                questionRepository,
                never()
        ).insertQuestion(
                EXAM_ID,
                "Question",
                1,
                0
        );
    }

    @Test
    void publishedExamCannotReceiveNewQuestions() {
        when(questionRepository.findOwnedExamStatusForUpdate(
                EXAM_ID,
                TEACHER_ID
        )).thenReturn(Optional.of(ExamStatus.PUBLISHED));

        QuestionManagementException exception =
                assertThrows(
                        QuestionManagementException.class,
                        () -> questionService.createQuestion(
                                TEACHER_ID,
                                validCommand()
                        )
                );

        assertEquals(
                QuestionManagementService.EXAM_NOT_EDITABLE,
                exception.code()
        );

        verify(
                questionRepository,
                never()
        ).insertQuestion(
                EXAM_ID,
                "Question",
                1,
                0
        );
    }

    @Test
    void invalidQuestionFieldsAreRejectedBeforeRepositoryCall() {
        assertCode(
                QuestionManagementService.INVALID_QUESTION_CONTENT,
                () -> questionService.createQuestion(
                        TEACHER_ID,
                        null
                )
        );

        assertCode(
                QuestionManagementService.EXAM_NOT_FOUND,
                () -> questionService.createQuestion(
                        TEACHER_ID,
                        new CreateQuestionCommand(
                                0,
                                "Question",
                                1,
                                0,
                                validChoices()
                        )
                )
        );

        assertCode(
                QuestionManagementService.INVALID_QUESTION_CONTENT,
                () -> questionService.createQuestion(
                        TEACHER_ID,
                        new CreateQuestionCommand(
                                EXAM_ID,
                                "   ",
                                1,
                                0,
                                validChoices()
                        )
                )
        );

        assertCode(
                QuestionManagementService.INVALID_QUESTION_POINTS,
                () -> questionService.createQuestion(
                        TEACHER_ID,
                        new CreateQuestionCommand(
                                EXAM_ID,
                                "Question",
                                0,
                                0,
                                validChoices()
                        )
                )
        );

        assertCode(
                QuestionManagementService.INVALID_DISPLAY_ORDER,
                () -> questionService.createQuestion(
                        TEACHER_ID,
                        new CreateQuestionCommand(
                                EXAM_ID,
                                "Question",
                                1,
                                -1,
                                validChoices()
                        )
                )
        );

        verifyNoInteractions(questionRepository);
    }

    @Test
    void invalidChoiceCollectionIsRejectedBeforeRepositoryCall() {
        assertCode(
                QuestionManagementService.TOO_FEW_CHOICES,
                () -> questionService.createQuestion(
                        TEACHER_ID,
                        new CreateQuestionCommand(
                                EXAM_ID,
                                "Question",
                                1,
                                0,
                                List.of(
                                        new ChoiceCommand(
                                                "Only choice",
                                                true,
                                                0
                                        )
                                )
                        )
                )
        );

        assertCode(
                QuestionManagementService.INVALID_CHOICE_CONTENT,
                () -> questionService.createQuestion(
                        TEACHER_ID,
                        new CreateQuestionCommand(
                                EXAM_ID,
                                "Question",
                                1,
                                0,
                                List.of(
                                        new ChoiceCommand(
                                                "   ",
                                                true,
                                                0
                                        ),
                                        new ChoiceCommand(
                                                "B",
                                                false,
                                                1
                                        )
                                )
                        )
                )
        );

        assertCode(
                QuestionManagementService.INVALID_DISPLAY_ORDER,
                () -> questionService.createQuestion(
                        TEACHER_ID,
                        new CreateQuestionCommand(
                                EXAM_ID,
                                "Question",
                                1,
                                0,
                                List.of(
                                        new ChoiceCommand(
                                                "A",
                                                true,
                                                -1
                                        ),
                                        new ChoiceCommand(
                                                "B",
                                                false,
                                                1
                                        )
                                )
                        )
                )
        );

        assertCode(
                QuestionManagementService.DUPLICATE_CHOICE_ORDER,
                () -> questionService.createQuestion(
                        TEACHER_ID,
                        new CreateQuestionCommand(
                                EXAM_ID,
                                "Question",
                                1,
                                0,
                                List.of(
                                        new ChoiceCommand(
                                                "A",
                                                true,
                                                0
                                        ),
                                        new ChoiceCommand(
                                                "B",
                                                false,
                                                0
                                        )
                                )
                        )
                )
        );

        assertCode(
                QuestionManagementService
                        .INVALID_CORRECT_CHOICE_COUNT,
                () -> questionService.createQuestion(
                        TEACHER_ID,
                        new CreateQuestionCommand(
                                EXAM_ID,
                                "Question",
                                1,
                                0,
                                List.of(
                                        new ChoiceCommand(
                                                "A",
                                                false,
                                                0
                                        ),
                                        new ChoiceCommand(
                                                "B",
                                                false,
                                                1
                                        )
                                )
                        )
                )
        );

        assertCode(
                QuestionManagementService
                        .INVALID_CORRECT_CHOICE_COUNT,
                () -> questionService.createQuestion(
                        TEACHER_ID,
                        new CreateQuestionCommand(
                                EXAM_ID,
                                "Question",
                                1,
                                0,
                                List.of(
                                        new ChoiceCommand(
                                                "A",
                                                true,
                                                0
                                        ),
                                        new ChoiceCommand(
                                                "B",
                                                true,
                                                1
                                        )
                                )
                        )
                )
        );

        verifyNoInteractions(questionRepository);
    }

    @Test
    void databaseFailureIsMappedToSafeQuestionError() {
        when(questionRepository.findOwnedExamStatusForUpdate(
                EXAM_ID,
                TEACHER_ID
        )).thenThrow(
                new DataAccessResourceFailureException(
                        "secret database information"
                )
        );

        QuestionManagementException exception =
                assertThrows(
                        QuestionManagementException.class,
                        () -> questionService.createQuestion(
                                TEACHER_ID,
                                validCommand()
                        )
                );

        assertEquals(
                QuestionManagementService.DATABASE_ERROR,
                exception.code()
        );

        assertEquals(
                "The question data could not be processed.",
                exception.getMessage()
        );
    }

    @Test
    void listChecksOwnershipAndGroupsChoicesByQuestion() {
        OffsetDateTime timestamp =
                OffsetDateTime.parse(
                        "2026-10-24T15:00:00+07:00"
                );

        Question firstQuestion =
                new Question(
                        101L,
                        EXAM_ID,
                        "First question",
                        1,
                        0,
                        timestamp,
                        timestamp
                );

        Question secondQuestion =
                new Question(
                        102L,
                        EXAM_ID,
                        "Second question",
                        2,
                        1,
                        timestamp,
                        timestamp
                );

        Choice firstChoice =
                new Choice(
                        201L,
                        101L,
                        "Choice A",
                        true,
                        0
                );

        Choice secondChoice =
                new Choice(
                        202L,
                        101L,
                        "Choice B",
                        false,
                        1
                );

        when(questionRepository.findOwnedExamStatus(
                EXAM_ID,
                TEACHER_ID
        )).thenReturn(Optional.of(ExamStatus.DRAFT));

        when(questionRepository.findAllQuestionsByExamId(EXAM_ID))
                .thenReturn(List.of(
                        firstQuestion,
                        secondQuestion
                ));

        when(questionRepository.findAllChoicesByExamId(EXAM_ID))
                .thenReturn(List.of(
                        firstChoice,
                        secondChoice
                ));

        TeacherQuestionList result =
                questionService.findAllByExamId(
                        TEACHER_ID,
                        EXAM_ID
                );

        assertEquals(2, result.questions().size());

        assertEquals(
                "First question",
                result.questions().get(0).content()
        );

        assertEquals(
                2,
                result.questions().get(0).choices().size()
        );

        assertEquals(
                "Second question",
                result.questions().get(1).content()
        );

        assertEquals(
                List.of(),
                result.questions().get(1).choices()
        );

        verify(questionRepository)
                .findOwnedExamStatus(
                        EXAM_ID,
                        TEACHER_ID
                );

        verify(questionRepository)
                .findAllQuestionsByExamId(EXAM_ID);

        verify(questionRepository)
                .findAllChoicesByExamId(EXAM_ID);
    }

    @Test
    void updateQuestionLocksDraftExamReplacesChoicesAndReturnsDetails() {
        UpdateQuestionCommand command = new UpdateQuestionCommand(
                QUESTION_ID,
                "  Updated question content  ",
                3,
                1,
                List.of(
                        new UpdateQuestionCommand.ChoiceCommand("  Option A  ", true, 0),
                        new UpdateQuestionCommand.ChoiceCommand("  Option B  ", false, 1)
                )
        );

        when(questionRepository.findOwnedQuestionContextForUpdate(QUESTION_ID, TEACHER_ID))
                .thenReturn(Optional.of(new QuestionExamContext(QUESTION_ID, EXAM_ID, ExamStatus.DRAFT)));

        OffsetDateTime timestamp = OffsetDateTime.parse("2026-10-24T15:00:00+07:00");
        Question updatedQuestion = new Question(
                QUESTION_ID,
                EXAM_ID,
                "Updated question content",
                3,
                1,
                timestamp,
                timestamp
        );

        when(questionRepository.updateQuestion(QUESTION_ID, "Updated question content", 3, 1))
                .thenReturn(updatedQuestion);

        Choice choiceA = new Choice(201L, QUESTION_ID, "Option A", true, 0);
        Choice choiceB = new Choice(202L, QUESTION_ID, "Option B", false, 1);

        when(questionRepository.insertChoice(QUESTION_ID, "Option A", true, 0))
                .thenReturn(choiceA);
        when(questionRepository.insertChoice(QUESTION_ID, "Option B", false, 1))
                .thenReturn(choiceB);

        TeacherQuestionDetails result = questionService.updateQuestion(TEACHER_ID, command);

        assertEquals(QUESTION_ID, result.id());
        assertEquals(EXAM_ID, result.examId());
        assertEquals("Updated question content", result.content());
        assertEquals(3, result.points());
        assertEquals(1, result.displayOrder());
        assertEquals(2, result.choices().size());
        assertEquals("Option A", result.choices().get(0).content());
        assertEquals(true, result.choices().get(0).correct());

        InOrder inOrder = inOrder(questionRepository);
        inOrder.verify(questionRepository).findOwnedQuestionContextForUpdate(QUESTION_ID, TEACHER_ID);
        inOrder.verify(questionRepository).updateQuestion(QUESTION_ID, "Updated question content", 3, 1);
        inOrder.verify(questionRepository).deleteChoicesByQuestionId(QUESTION_ID);
        inOrder.verify(questionRepository).insertChoice(QUESTION_ID, "Option A", true, 0);
        inOrder.verify(questionRepository).insertChoice(QUESTION_ID, "Option B", false, 1);
    }

    @Test
    void updateQuestionRejectsInvalidIdOrData() {
        assertCode(
                QuestionManagementService.QUESTION_NOT_FOUND,
                () -> questionService.updateQuestion(TEACHER_ID, new UpdateQuestionCommand(0L, "Q", 1, 0, validUpdateChoices()))
        );

        assertCode(
                QuestionManagementService.INVALID_QUESTION_CONTENT,
                () -> questionService.updateQuestion(TEACHER_ID, new UpdateQuestionCommand(QUESTION_ID, "   ", 1, 0, validUpdateChoices()))
        );

        assertCode(
                QuestionManagementService.INVALID_QUESTION_POINTS,
                () -> questionService.updateQuestion(TEACHER_ID, new UpdateQuestionCommand(QUESTION_ID, "Q", 0, 0, validUpdateChoices()))
        );

        assertCode(
                QuestionManagementService.INVALID_DISPLAY_ORDER,
                () -> questionService.updateQuestion(TEACHER_ID, new UpdateQuestionCommand(QUESTION_ID, "Q", 1, -1, validUpdateChoices()))
        );
    }

    @Test
    void updateQuestionRejectsInvalidChoiceCount() {
        assertCode(
                QuestionManagementService.INVALID_CHOICE_COUNT,
                () -> questionService.updateQuestion(TEACHER_ID, new UpdateQuestionCommand(
                        QUESTION_ID, "Q", 1, 0,
                        List.of(new UpdateQuestionCommand.ChoiceCommand("A", true, 0))
                ))
        );

        assertCode(
                QuestionManagementService.INVALID_CHOICE_COUNT,
                () -> questionService.updateQuestion(TEACHER_ID, new UpdateQuestionCommand(
                        QUESTION_ID, "Q", 1, 0,
                        List.of(
                                new UpdateQuestionCommand.ChoiceCommand("A", true, 0),
                                new UpdateQuestionCommand.ChoiceCommand("B", false, 1),
                                new UpdateQuestionCommand.ChoiceCommand("C", false, 2),
                                new UpdateQuestionCommand.ChoiceCommand("D", false, 3),
                                new UpdateQuestionCommand.ChoiceCommand("E", false, 4),
                                new UpdateQuestionCommand.ChoiceCommand("F", false, 5),
                                new UpdateQuestionCommand.ChoiceCommand("G", false, 6)
                        )
                ))
        );
    }

    @Test
    void updateQuestionRejectsInvalidChoiceContentAndOrder() {
        assertCode(
                QuestionManagementService.INVALID_CHOICE_CONTENT,
                () -> questionService.updateQuestion(TEACHER_ID, new UpdateQuestionCommand(
                        QUESTION_ID, "Q", 1, 0,
                        List.of(
                                new UpdateQuestionCommand.ChoiceCommand("  ", true, 0),
                                new UpdateQuestionCommand.ChoiceCommand("B", false, 1)
                        )
                ))
        );

        assertCode(
                QuestionManagementService.INVALID_DISPLAY_ORDER,
                () -> questionService.updateQuestion(TEACHER_ID, new UpdateQuestionCommand(
                        QUESTION_ID, "Q", 1, 0,
                        List.of(
                                new UpdateQuestionCommand.ChoiceCommand("A", true, -1),
                                new UpdateQuestionCommand.ChoiceCommand("B", false, 1)
                        )
                ))
        );

        assertCode(
                QuestionManagementService.DUPLICATE_CHOICE_ORDER,
                () -> questionService.updateQuestion(TEACHER_ID, new UpdateQuestionCommand(
                        QUESTION_ID, "Q", 1, 0,
                        List.of(
                                new UpdateQuestionCommand.ChoiceCommand("A", true, 0),
                                new UpdateQuestionCommand.ChoiceCommand("B", false, 0)
                        )
                ))
        );
    }

    @Test
    void updateQuestionRejectsZeroOrMultipleCorrectChoices() {
        assertCode(
                QuestionManagementService.INVALID_CORRECT_CHOICE_COUNT,
                () -> questionService.updateQuestion(TEACHER_ID, new UpdateQuestionCommand(
                        QUESTION_ID, "Q", 1, 0,
                        List.of(
                                new UpdateQuestionCommand.ChoiceCommand("A", false, 0),
                                new UpdateQuestionCommand.ChoiceCommand("B", false, 1)
                        )
                ))
        );

        assertCode(
                QuestionManagementService.INVALID_CORRECT_CHOICE_COUNT,
                () -> questionService.updateQuestion(TEACHER_ID, new UpdateQuestionCommand(
                        QUESTION_ID, "Q", 1, 0,
                        List.of(
                                new UpdateQuestionCommand.ChoiceCommand("A", true, 0),
                                new UpdateQuestionCommand.ChoiceCommand("B", true, 1)
                        )
                ))
        );
    }

    @Test
    void updateQuestionRejectsWhenQuestionNotFoundOrNonDraft() {
        when(questionRepository.findOwnedQuestionContextForUpdate(QUESTION_ID, TEACHER_ID))
                .thenReturn(Optional.empty());

        assertCode(
                QuestionManagementService.QUESTION_NOT_FOUND,
                () -> questionService.updateQuestion(TEACHER_ID, validUpdateCommand())
        );

        when(questionRepository.findOwnedQuestionContextForUpdate(QUESTION_ID, TEACHER_ID))
                .thenReturn(Optional.of(new QuestionExamContext(QUESTION_ID, EXAM_ID, ExamStatus.PUBLISHED)));

        assertCode(
                QuestionManagementService.QUESTION_NOT_EDITABLE,
                () -> questionService.updateQuestion(TEACHER_ID, validUpdateCommand())
        );

        when(questionRepository.findOwnedQuestionContextForUpdate(QUESTION_ID, TEACHER_ID))
                .thenReturn(Optional.of(new QuestionExamContext(QUESTION_ID, EXAM_ID, ExamStatus.CLOSED)));

        assertCode(
                QuestionManagementService.QUESTION_NOT_EDITABLE,
                () -> questionService.updateQuestion(TEACHER_ID, validUpdateCommand())
        );
    }

    @Test
    void updateQuestionWrapsDataAccessException() {
        when(questionRepository.findOwnedQuestionContextForUpdate(QUESTION_ID, TEACHER_ID))
                .thenThrow(new DataAccessResourceFailureException("DB error"));

        assertCode(
                QuestionManagementService.DATABASE_ERROR,
                () -> questionService.updateQuestion(TEACHER_ID, validUpdateCommand())
        );
    }

    @Test
    void deleteQuestionDeletesChoicesThenQuestionInDraftExam() {
        when(questionRepository.findOwnedQuestionContextForUpdate(QUESTION_ID, TEACHER_ID))
                .thenReturn(Optional.of(new QuestionExamContext(QUESTION_ID, EXAM_ID, ExamStatus.DRAFT)));
        when(questionRepository.deleteChoicesByQuestionId(QUESTION_ID)).thenReturn(2);
        when(questionRepository.deleteQuestionById(QUESTION_ID)).thenReturn(true);

        DeletedQuestionDetails result = questionService.deleteQuestion(TEACHER_ID, QUESTION_ID);

        assertEquals(QUESTION_ID, result.questionId());

        InOrder inOrder = inOrder(questionRepository);
        inOrder.verify(questionRepository).findOwnedQuestionContextForUpdate(QUESTION_ID, TEACHER_ID);
        inOrder.verify(questionRepository).deleteChoicesByQuestionId(QUESTION_ID);
        inOrder.verify(questionRepository).deleteQuestionById(QUESTION_ID);
    }

    @Test
    void deleteQuestionRejectsInvalidIdOrNotFoundOrNonDraft() {
        assertCode(
                QuestionManagementService.QUESTION_NOT_FOUND,
                () -> questionService.deleteQuestion(TEACHER_ID, 0L)
        );

        when(questionRepository.findOwnedQuestionContextForUpdate(QUESTION_ID, TEACHER_ID))
                .thenReturn(Optional.empty());

        assertCode(
                QuestionManagementService.QUESTION_NOT_FOUND,
                () -> questionService.deleteQuestion(TEACHER_ID, QUESTION_ID)
        );

        when(questionRepository.findOwnedQuestionContextForUpdate(QUESTION_ID, TEACHER_ID))
                .thenReturn(Optional.of(new QuestionExamContext(QUESTION_ID, EXAM_ID, ExamStatus.PUBLISHED)));

        assertCode(
                QuestionManagementService.QUESTION_NOT_EDITABLE,
                () -> questionService.deleteQuestion(TEACHER_ID, QUESTION_ID)
        );

        when(questionRepository.findOwnedQuestionContextForUpdate(QUESTION_ID, TEACHER_ID))
                .thenReturn(Optional.of(new QuestionExamContext(QUESTION_ID, EXAM_ID, ExamStatus.CLOSED)));

        assertCode(
                QuestionManagementService.QUESTION_NOT_EDITABLE,
                () -> questionService.deleteQuestion(TEACHER_ID, QUESTION_ID)
        );
    }

    @Test
    void deleteQuestionWrapsDataAccessException() {
        when(questionRepository.findOwnedQuestionContextForUpdate(QUESTION_ID, TEACHER_ID))
                .thenThrow(new DataAccessResourceFailureException("DB error"));

        assertCode(
                QuestionManagementService.DATABASE_ERROR,
                () -> questionService.deleteQuestion(TEACHER_ID, QUESTION_ID)
        );
    }

    private static CreateQuestionCommand validCommand() {
        return new CreateQuestionCommand(
                EXAM_ID,
                "Question",
                1,
                0,
                validChoices()
        );
    }

    private static UpdateQuestionCommand validUpdateCommand() {
        return new UpdateQuestionCommand(
                QUESTION_ID,
                "Updated Question",
                2,
                0,
                validUpdateChoices()
        );
    }

    private static List<ChoiceCommand> validChoices() {
        return List.of(
                new ChoiceCommand(
                        "Choice A",
                        true,
                        0
                ),
                new ChoiceCommand(
                        "Choice B",
                        false,
                        1
                )
        );
    }

    private static List<UpdateQuestionCommand.ChoiceCommand> validUpdateChoices() {
        return List.of(
                new UpdateQuestionCommand.ChoiceCommand(
                        "Choice A",
                        true,
                        0
                ),
                new UpdateQuestionCommand.ChoiceCommand(
                        "Choice B",
                        false,
                        1
                )
        );
    }

    private static void assertCode(
            String expectedCode,
            Runnable operation
    ) {
        QuestionManagementException exception =
                assertThrows(
                        QuestionManagementException.class,
                        operation::run
                );

        assertEquals(
                expectedCode,
                exception.code()
        );
    }
}