package vn.edu.hanu.exam.websocket.handler;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import tools.jackson.databind.json.JsonMapper;
import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.exception.QuestionManagementException;
import vn.edu.hanu.exam.protocol.ServerMessage;
import vn.edu.hanu.exam.service.LoggedInUser;
import vn.edu.hanu.exam.service.question.CreateQuestionCommand;
import vn.edu.hanu.exam.service.question.DeletedQuestionDetails;
import vn.edu.hanu.exam.service.question.QuestionManagementService;
import vn.edu.hanu.exam.service.question.TeacherQuestionDetails;
import vn.edu.hanu.exam.service.question.TeacherQuestionList;
import vn.edu.hanu.exam.service.question.UpdateQuestionCommand;
import vn.edu.hanu.exam.session.AuthenticatedSessionRegistry;

class QuestionManagementMessageHandlerTests {
    private static final String SESSION_ID =
            "teacher-question-session";

    private static final String REQUEST_ID =
            "question-request";

    private static final long TEACHER_ID = 20L;
    private static final long EXAM_ID = 12L;

    private QuestionManagementService questionService;
    private AuthenticatedSessionRegistry sessionRegistry;
    private QuestionManagementMessageHandler handler;

    @BeforeEach
    void setUp() {
        questionService =
                mock(QuestionManagementService.class);

        sessionRegistry =
                new AuthenticatedSessionRegistry();

        handler =
                new QuestionManagementMessageHandler(
                        questionService,
                        sessionRegistry,
                        JsonMapper.builder().build()
                );
    }

    @Test
    void authenticatedTeacherCanCreateQuestion() {
        authenticate(UserRole.TEACHER);

        TeacherQuestionDetails createdQuestion =
                sampleQuestion();

        when(questionService.createQuestion(
                eq(TEACHER_ID),
                any(CreateQuestionCommand.class)
        )).thenReturn(createdQuestion);

        ServerMessage response =
                handler.handleCreate(
                        SESSION_ID,
                        REQUEST_ID,
                        validCreatePayload()
                );

        assertSuccess(
                response,
                "QUESTION_CREATED",
                createdQuestion
        );

        ArgumentCaptor<CreateQuestionCommand> commandCaptor =
                ArgumentCaptor.forClass(
                        CreateQuestionCommand.class
                );

        verify(questionService).createQuestion(
                eq(TEACHER_ID),
                commandCaptor.capture()
        );

        CreateQuestionCommand command =
                commandCaptor.getValue();

        assertEquals(EXAM_ID, command.examId());
        assertEquals(
                "Which keyword extends a class?",
                command.content()
        );
        assertEquals(2, command.points());
        assertEquals(0, command.displayOrder());
        assertEquals(2, command.choices().size());
        assertEquals(
                true,
                command.choices().get(0).correct()
        );
    }

    @Test
    void authenticatedTeacherCanListExamQuestions() {
        authenticate(UserRole.TEACHER);

        TeacherQuestionList result =
                new TeacherQuestionList(
                        List.of(sampleQuestion())
                );

        when(questionService.findAllByExamId(
                TEACHER_ID,
                EXAM_ID
        )).thenReturn(result);

        ServerMessage response =
                handler.handleList(
                        SESSION_ID,
                        REQUEST_ID,
                        Map.of("examId", EXAM_ID)
                );

        assertSuccess(
                response,
                "EXAM_QUESTIONS",
                result
        );

        verify(questionService)
                .findAllByExamId(
                        TEACHER_ID,
                        EXAM_ID
                );
    }

    @Test
    void unauthenticatedSessionIsRejectedBeforeServiceCall() {
        ServerMessage response =
                handler.handleCreate(
                        "missing-session",
                        REQUEST_ID,
                        validCreatePayload()
                );

        assertError(
                response,
                "AUTHENTICATION_REQUIRED"
        );

        verify(
                questionService,
                never()
        ).createQuestion(
                anyLong(),
                any(CreateQuestionCommand.class)
        );
    }

    @Test
    void studentIsForbiddenBeforeServiceCall() {
        authenticate(UserRole.STUDENT);

        ServerMessage response =
                handler.handleList(
                        SESSION_ID,
                        REQUEST_ID,
                        Map.of("examId", EXAM_ID)
                );

        assertError(response, "FORBIDDEN");

        verify(
                questionService,
                never()
        ).findAllByExamId(
                anyLong(),
                anyLong()
        );
    }

    @Test
    void malformedPayloadsAreRejected() {
        authenticate(UserRole.TEACHER);

        assertError(
                handler.handleCreate(
                        SESSION_ID,
                        REQUEST_ID,
                        null
                ),
                "INVALID_PAYLOAD"
        );

        assertError(
                handler.handleCreate(
                        SESSION_ID,
                        REQUEST_ID,
                        Map.of(
                                "examId", "12",
                                "content", "Question",
                                "points", 1,
                                "displayOrder", 0,
                                "choices", List.of()
                        )
                ),
                "INVALID_PAYLOAD"
        );

        assertError(
                handler.handleCreate(
                        SESSION_ID,
                        REQUEST_ID,
                        Map.of(
                                "examId", EXAM_ID,
                                "content", "Question",
                                "points", 1.5,
                                "displayOrder", 0,
                                "choices", List.of()
                        )
                ),
                "INVALID_PAYLOAD"
        );

        assertError(
                handler.handleCreate(
                        SESSION_ID,
                        REQUEST_ID,
                        payloadWithMissingCorrectField()
                ),
                "INVALID_PAYLOAD"
        );

        assertError(
                handler.handleList(
                        SESSION_ID,
                        REQUEST_ID,
                        Map.of("examId", "12")
                ),
                "INVALID_PAYLOAD"
        );

        verify(
                questionService,
                never()
        ).createQuestion(
                anyLong(),
                any(CreateQuestionCommand.class)
        );
    }

    @Test
    void businessErrorCodeIsPreserved() {
        authenticate(UserRole.TEACHER);

        when(questionService.findAllByExamId(
                TEACHER_ID,
                EXAM_ID
        )).thenThrow(
                new QuestionManagementException(
                        "EXAM_NOT_FOUND",
                        "Exam was not found."
                )
        );

        ServerMessage response =
                handler.handleList(
                        SESSION_ID,
                        REQUEST_ID,
                        Map.of("examId", EXAM_ID)
                );

        assertError(response, "EXAM_NOT_FOUND");

        assertEquals(
                "Exam was not found.",
                response.error().message()
        );
    }

    @Test
    void unexpectedExceptionReturnsSafeInternalError() {
        authenticate(UserRole.TEACHER);

        when(questionService.findAllByExamId(
                TEACHER_ID,
                EXAM_ID
        )).thenThrow(
                new RuntimeException(
                        "secret internal information"
                )
        );

        ServerMessage response =
                handler.handleList(
                        SESSION_ID,
                        REQUEST_ID,
                        Map.of("examId", EXAM_ID)
                );

        assertError(
                response,
                "INTERNAL_SERVER_ERROR"
        );

        assertEquals(
                "An unexpected error occurred.",
                response.error().message()
        );
    }

    @Test
    void authenticatedTeacherCanUpdateQuestion() {
        authenticate(UserRole.TEACHER);

        TeacherQuestionDetails updatedQuestion = sampleQuestion();

        when(questionService.updateQuestion(
                eq(TEACHER_ID),
                any(UpdateQuestionCommand.class)
        )).thenReturn(updatedQuestion);

        ServerMessage response = handler.handleUpdate(
                SESSION_ID,
                REQUEST_ID,
                validUpdatePayload()
        );

        assertSuccess(
                response,
                "QUESTION_UPDATED",
                updatedQuestion
        );

        ArgumentCaptor<UpdateQuestionCommand> commandCaptor =
                ArgumentCaptor.forClass(UpdateQuestionCommand.class);

        verify(questionService).updateQuestion(
                eq(TEACHER_ID),
                commandCaptor.capture()
        );

        UpdateQuestionCommand command = commandCaptor.getValue();
        assertEquals(100L, command.questionId());
        assertEquals("Which keyword inherits a Java class?", command.content());
        assertEquals(3, command.points());
        assertEquals(0, command.displayOrder());
        assertEquals(2, command.choices().size());
        assertEquals(true, command.choices().get(0).correct());
    }

    @Test
    void authenticatedTeacherCanDeleteQuestion() {
        authenticate(UserRole.TEACHER);

        DeletedQuestionDetails deletedDetails = new DeletedQuestionDetails(100L);

        when(questionService.deleteQuestion(TEACHER_ID, 100L))
                .thenReturn(deletedDetails);

        ServerMessage response = handler.handleDelete(
                SESSION_ID,
                REQUEST_ID,
                validDeletePayload()
        );

        assertSuccess(
                response,
                "QUESTION_DELETED",
                deletedDetails
        );

        verify(questionService).deleteQuestion(TEACHER_ID, 100L);
    }

    @Test
    void unauthenticatedSessionCannotUpdateOrDeleteQuestion() {
        ServerMessage updateResponse = handler.handleUpdate(
                SESSION_ID,
                REQUEST_ID,
                validUpdatePayload()
        );
        assertError(updateResponse, "AUTHENTICATION_REQUIRED");

        ServerMessage deleteResponse = handler.handleDelete(
                SESSION_ID,
                REQUEST_ID,
                validDeletePayload()
        );
        assertError(deleteResponse, "AUTHENTICATION_REQUIRED");

        verifyNoInteractions(questionService);
    }

    @Test
    void studentCannotUpdateOrDeleteQuestion() {
        authenticate(UserRole.STUDENT);

        ServerMessage updateResponse = handler.handleUpdate(
                SESSION_ID,
                REQUEST_ID,
                validUpdatePayload()
        );
        assertError(updateResponse, "FORBIDDEN");

        ServerMessage deleteResponse = handler.handleDelete(
                SESSION_ID,
                REQUEST_ID,
                validDeletePayload()
        );
        assertError(deleteResponse, "FORBIDDEN");

        verifyNoInteractions(questionService);
    }

    @Test
    void invalidPayloadReturnsInvalidPayloadOnUpdateAndDelete() {
        authenticate(UserRole.TEACHER);

        ServerMessage updateNull = handler.handleUpdate(SESSION_ID, REQUEST_ID, null);
        assertError(updateNull, "INVALID_PAYLOAD");

        ServerMessage updateMissingChoices = handler.handleUpdate(
                SESSION_ID,
                REQUEST_ID,
                Map.of("questionId", 100L, "content", "Q", "points", 1, "displayOrder", 0)
        );
        assertError(updateMissingChoices, "INVALID_PAYLOAD");

        ServerMessage deleteNull = handler.handleDelete(SESSION_ID, REQUEST_ID, null);
        assertError(deleteNull, "INVALID_PAYLOAD");

        ServerMessage deleteMissingQuestionId = handler.handleDelete(
                SESSION_ID,
                REQUEST_ID,
                Map.of()
        );
        assertError(deleteMissingQuestionId, "INVALID_PAYLOAD");

        ServerMessage deleteInvalidType = handler.handleDelete(
                SESSION_ID,
                REQUEST_ID,
                Map.of("questionId", "not-a-number")
        );
        assertError(deleteInvalidType, "INVALID_PAYLOAD");

        verifyNoInteractions(questionService);
    }

    @Test
    void serviceExceptionPreservesErrorCodeOnUpdateAndDelete() {
        authenticate(UserRole.TEACHER);

        when(questionService.updateQuestion(eq(TEACHER_ID), any()))
                .thenThrow(new QuestionManagementException("QUESTION_NOT_FOUND", "Question not found."));

        ServerMessage updateResponse = handler.handleUpdate(
                SESSION_ID,
                REQUEST_ID,
                validUpdatePayload()
        );
        assertError(updateResponse, "QUESTION_NOT_FOUND");

        when(questionService.deleteQuestion(TEACHER_ID, 100L))
                .thenThrow(new QuestionManagementException("QUESTION_NOT_EDITABLE", "Cannot delete."));

        ServerMessage deleteResponse = handler.handleDelete(
                SESSION_ID,
                REQUEST_ID,
                validDeletePayload()
        );
        assertError(deleteResponse, "QUESTION_NOT_EDITABLE");
    }

    @Test
    void unexpectedExceptionReturnsInternalServerErrorOnUpdateAndDelete() {
        authenticate(UserRole.TEACHER);

        when(questionService.updateQuestion(eq(TEACHER_ID), any()))
                .thenThrow(new RuntimeException("Database timeout"));

        ServerMessage updateResponse = handler.handleUpdate(
                SESSION_ID,
                REQUEST_ID,
                validUpdatePayload()
        );
        assertError(updateResponse, "INTERNAL_SERVER_ERROR");

        when(questionService.deleteQuestion(TEACHER_ID, 100L))
                .thenThrow(new RuntimeException("Database timeout"));

        ServerMessage deleteResponse = handler.handleDelete(
                SESSION_ID,
                REQUEST_ID,
                validDeletePayload()
        );
        assertError(deleteResponse, "INTERNAL_SERVER_ERROR");
    }

    private void authenticate(UserRole role) {
        sessionRegistry.authenticate(
                SESSION_ID,
                new LoggedInUser(
                        TEACHER_ID,
                        "teacher",
                        "Question Teacher",
                        "teacher@example.com",
                        role
                )
        );
    }

    private static Map<String, Object> validCreatePayload() {
        return Map.of(
                "examId", EXAM_ID,
                "content",
                "Which keyword extends a class?",
                "points", 2,
                "displayOrder", 0,
                "choices", List.of(
                        Map.of(
                                "content", "extends",
                                "correct", true,
                                "displayOrder", 0
                        ),
                        Map.of(
                                "content", "implements",
                                "correct", false,
                                "displayOrder", 1
                        )
                )
        );
    }

    private static Map<String, Object> validUpdatePayload() {
        return Map.of(
                "questionId", 100L,
                "content", "Which keyword inherits a Java class?",
                "points", 3,
                "displayOrder", 0,
                "choices", List.of(
                        Map.of(
                                "content", "extends",
                                "correct", true,
                                "displayOrder", 0
                        ),
                        Map.of(
                                "content", "implements",
                                "correct", false,
                                "displayOrder", 1
                        )
                )
        );
    }

    private static Map<String, Object> validDeletePayload() {
        return Map.of("questionId", 100L);
    }

    private static Map<String, Object>
            payloadWithMissingCorrectField() {
        return Map.of(
                "examId", EXAM_ID,
                "content", "Question",
                "points", 1,
                "displayOrder", 0,
                "choices", List.of(
                        Map.of(
                                "content", "Choice A",
                                "displayOrder", 0
                        ),
                        Map.of(
                                "content", "Choice B",
                                "correct", false,
                                "displayOrder", 1
                        )
                )
        );
    }

    private static TeacherQuestionDetails sampleQuestion() {
        OffsetDateTime timestamp =
                OffsetDateTime.parse(
                        "2026-10-24T15:00:00+07:00"
                );

        return new TeacherQuestionDetails(
                100L,
                EXAM_ID,
                "Which keyword extends a class?",
                2,
                0,
                timestamp,
                timestamp,
                List.of(
                        new TeacherQuestionDetails
                                .TeacherChoiceDetails(
                                201L,
                                100L,
                                "extends",
                                true,
                                0
                        ),
                        new TeacherQuestionDetails
                                .TeacherChoiceDetails(
                                202L,
                                100L,
                                "implements",
                                false,
                                1
                        )
                )
        );
    }

    private static void assertSuccess(
            ServerMessage response,
            String expectedType,
            Object expectedData
    ) {
        assertEquals(
                REQUEST_ID,
                response.requestId()
        );

        assertEquals(
                expectedType,
                response.type()
        );

        assertEquals(
                expectedData,
                response.data()
        );

        assertNull(response.error());
    }

    private static void assertError(
            ServerMessage response,
            String expectedCode
    ) {
        assertEquals(
                REQUEST_ID,
                response.requestId()
        );

        assertEquals(
                "ERROR",
                response.type()
        );

        assertNull(response.data());
        assertNotNull(response.error());

        assertEquals(
                expectedCode,
                response.error().code()
        );
    }
}
