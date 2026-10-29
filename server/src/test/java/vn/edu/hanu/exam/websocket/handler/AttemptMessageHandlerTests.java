package vn.edu.hanu.exam.websocket.handler;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import tools.jackson.databind.json.JsonMapper;
import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.domain.attempt.AttemptStatus;
import vn.edu.hanu.exam.exception.AttemptException;
import vn.edu.hanu.exam.protocol.ServerMessage;
import vn.edu.hanu.exam.service.LoggedInUser;
import vn.edu.hanu.exam.service.attempt.AttemptChoiceDetails;
import vn.edu.hanu.exam.service.attempt.AttemptHistoryResult;
import vn.edu.hanu.exam.service.attempt.AttemptQuestionDetails;
import vn.edu.hanu.exam.service.attempt.ExamAttemptDetails;
import vn.edu.hanu.exam.service.attempt.ExamAttemptService;
import vn.edu.hanu.exam.service.attempt.ExamSubmissionResult;
import vn.edu.hanu.exam.service.attempt.SavedAnswerDetails;
import vn.edu.hanu.exam.service.attempt.StudentAttemptResult;
import vn.edu.hanu.exam.session.AuthenticatedSessionRegistry;

class AttemptMessageHandlerTests {
    private static final String SESSION_ID = "student-session";
    private static final String REQUEST_ID = "attempt-request";

    private ExamAttemptService attemptService;
    private AuthenticatedSessionRegistry sessionRegistry;
    private JsonMapper jsonMapper;
    private AttemptMessageHandler handler;

    @BeforeEach
    void setUp() {
        attemptService = mock(ExamAttemptService.class);
        sessionRegistry = new AuthenticatedSessionRegistry();
        jsonMapper = JsonMapper.builder().build();
        handler = new AttemptMessageHandler(attemptService, sessionRegistry, jsonMapper);
    }

    @Test
    void authenticatedStudentCanStartExamAndRequestIdIsPreserved() throws Exception {
        authenticate(UserRole.STUDENT, 20L);
        ExamAttemptDetails details = sampleAttempt();
        when(attemptService.startExam(12L, 20L, "ExamTestKey123!")).thenReturn(details);

        ServerMessage response = handler.handleStart(
                SESSION_ID,
                REQUEST_ID,
                Map.of("examId", 12L, "enrollmentKey", "ExamTestKey123!"));

        assertSuccess(response, "EXAM_STARTED", details);
        verify(attemptService).startExam(12L, 20L, "ExamTestKey123!");
        assertFalse(jsonMapper.writeValueAsString(response).contains("\"correct\""));
    }

    @Test
    void authenticatedStudentCanRecoverOwnAttempt() {
        authenticate(UserRole.STUDENT, 20L);
        ExamAttemptDetails details = sampleAttempt();
        when(attemptService.getAttempt(31L, 20L)).thenReturn(details);

        ServerMessage response = handler.handleGet(
                SESSION_ID,
                REQUEST_ID,
                Map.of("attemptId", 31L));

        assertSuccess(response, "EXAM_ATTEMPT_DETAILS", details);
        verify(attemptService).getAttempt(31L, 20L);
    }

    @Test
    void authenticatedStudentCanSaveAnAnswer() {
        authenticate(UserRole.STUDENT, 20L);
        OffsetDateTime savedAt = OffsetDateTime.parse("2026-10-27T01:15:00Z");
        SavedAnswerDetails details = new SavedAnswerDetails(41L, 51L, savedAt);
        when(attemptService.saveAnswer(31L, 41L, 51L, 20L)).thenReturn(details);

        ServerMessage response = handler.handleSaveAnswer(
                SESSION_ID,
                REQUEST_ID,
                Map.of("attemptId", 31L, "questionId", 41L, "choiceId", 51L));

        assertSuccess(response, "ANSWER_SAVED", details);
        verify(attemptService).saveAnswer(31L, 41L, 51L, 20L);
    }

    @Test
    void authenticatedStudentCanSubmitAnAttempt() {
        authenticate(UserRole.STUDENT, 20L);
        OffsetDateTime submittedAt = OffsetDateTime.parse("2026-10-27T01:30:00Z");
        ExamSubmissionResult result = new ExamSubmissionResult(
                31L,
                12L,
                AttemptStatus.SUBMITTED,
                submittedAt,
                8,
                10,
                4,
                5);
        when(attemptService.submitExam(31L, 20L)).thenReturn(result);

        ServerMessage response = handler.handleSubmit(
                SESSION_ID,
                REQUEST_ID,
                Map.of("attemptId", 31L));

        assertSuccess(response, "EXAM_SUBMITTED", result);
        verify(attemptService).submitExam(31L, 20L);
    }

    @Test
    void authenticatedStudentCanLoadAttemptHistory() {
        authenticate(UserRole.STUDENT, 20L);
        StudentAttemptResult item = sampleResult();
        AttemptHistoryResult history = new AttemptHistoryResult(List.of(item));
        when(attemptService.getAttemptHistory(20L)).thenReturn(history);

        ServerMessage response = handler.handleHistory(SESSION_ID, REQUEST_ID);

        assertSuccess(response, "ATTEMPT_HISTORY", history);
        verify(attemptService).getAttemptHistory(20L);
    }

    @Test
    void authenticatedStudentCanLoadOwnCompletedResult() {
        authenticate(UserRole.STUDENT, 20L);
        StudentAttemptResult result = sampleResult();
        when(attemptService.getAttemptResult(31L, 20L)).thenReturn(result);

        ServerMessage response = handler.handleResult(
                SESSION_ID,
                REQUEST_ID,
                Map.of("attemptId", 31L));

        assertSuccess(response, "ATTEMPT_RESULT", result);
        verify(attemptService).getAttemptResult(31L, 20L);
    }

    @Test
    void unauthenticatedSessionIsRejectedBeforeCallingService() {
        ServerMessage response = handler.handleStart(
                "missing-session",
                REQUEST_ID,
                Map.of("examId", 12L));

        assertError(response, "AUTHENTICATION_REQUIRED");
        verify(attemptService, never()).startExam(12L, 20L);
    }

    @Test
    void teacherIsForbiddenBeforeCallingService() {
        authenticate(UserRole.TEACHER, 20L);

        ServerMessage response = handler.handleStart(
                SESSION_ID,
                REQUEST_ID,
                Map.of("examId", 12L));

        assertError(response, "FORBIDDEN");
        verify(attemptService, never()).startExam(12L, 20L);
    }

    @Test
    void invalidPayloadTypesAreRejected() {
        authenticate(UserRole.STUDENT, 20L);

        assertError(handler.handleStart(SESSION_ID, REQUEST_ID, null), "INVALID_PAYLOAD");
        assertError(handler.handleStart(SESSION_ID, REQUEST_ID, Map.of()), "INVALID_PAYLOAD");
        assertError(
                handler.handleStart(SESSION_ID, REQUEST_ID, Map.of("examId", "12")),
                "INVALID_PAYLOAD");
        assertError(
                handler.handleGet(SESSION_ID, REQUEST_ID, Map.of("attemptId", 31.5)),
                "INVALID_PAYLOAD");
        assertError(
                handler.handleSaveAnswer(
                        SESSION_ID,
                        REQUEST_ID,
                        Map.of("attemptId", 31L, "questionId", 41L, "choiceId", "51")),
                "INVALID_PAYLOAD");
        assertError(
                handler.handleSubmit(SESSION_ID, REQUEST_ID, Map.of("attemptId", "31")),
                "INVALID_PAYLOAD");
        assertError(
                handler.handleResult(SESSION_ID, REQUEST_ID, Map.of("attemptId", 0L)),
                "INVALID_PAYLOAD");
    }

    @Test
    void ownershipBusinessErrorIsReturnedWithoutLeakingInternals() {
        authenticate(UserRole.STUDENT, 20L);
        when(attemptService.getAttempt(31L, 20L)).thenThrow(
                new AttemptException("ATTEMPT_NOT_FOUND", "Attempt was not found."));

        ServerMessage response = handler.handleGet(
                SESSION_ID,
                REQUEST_ID,
                Map.of("attemptId", 31L));

        assertError(response, "ATTEMPT_NOT_FOUND");
        assertEquals("Attempt was not found.", response.error().message());
    }

    private void authenticate(UserRole role, long userId) {
        sessionRegistry.authenticate(
                SESSION_ID,
                new LoggedInUser(userId, "attempt-user", "Attempt User", "attempt@example.com", role));
    }

    private static StudentAttemptResult sampleResult() {
        OffsetDateTime startedAt = OffsetDateTime.parse("2026-10-27T01:00:00Z");
        return new StudentAttemptResult(
                31L,
                12L,
                "Java Final",
                AttemptStatus.SUBMITTED,
                startedAt,
                startedAt.plusMinutes(30),
                8,
                10,
                4,
                5);
    }

    private static ExamAttemptDetails sampleAttempt() {
        OffsetDateTime startedAt = OffsetDateTime.parse("2026-10-27T01:00:00Z");
        return new ExamAttemptDetails(
                31L,
                12L,
                "Java Final",
                AttemptStatus.IN_PROGRESS,
                startedAt,
                startedAt.plusMinutes(60),
                List.of(new AttemptQuestionDetails(
                        41L,
                        "Which collection rejects duplicates?",
                        2,
                        0,
                        List.of(
                                new AttemptChoiceDetails(51L, "Set", 0),
                                new AttemptChoiceDetails(52L, "List", 1)))),
                List.of(),
                null);
    }

    private static void assertSuccess(ServerMessage response, String type, Object data) {
        assertEquals(REQUEST_ID, response.requestId());
        assertEquals(type, response.type());
        assertEquals(data, response.data());
        assertNull(response.error());
    }

    private static void assertError(ServerMessage response, String code) {
        assertEquals(REQUEST_ID, response.requestId());
        assertEquals("ERROR", response.type());
        assertNull(response.data());
        assertNotNull(response.error());
        assertEquals(code, response.error().code());
    }
}
