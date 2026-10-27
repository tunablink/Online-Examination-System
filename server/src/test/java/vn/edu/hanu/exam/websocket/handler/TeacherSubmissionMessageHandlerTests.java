package vn.edu.hanu.exam.websocket.handler;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.anyLong;
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
import vn.edu.hanu.exam.domain.submission.TeacherSubmission;
import vn.edu.hanu.exam.exception.TeacherSubmissionException;
import vn.edu.hanu.exam.protocol.ServerMessage;
import vn.edu.hanu.exam.service.LoggedInUser;
import vn.edu.hanu.exam.service.submission.TeacherSubmissionList;
import vn.edu.hanu.exam.service.submission.TeacherSubmissionService;
import vn.edu.hanu.exam.session.AuthenticatedSessionRegistry;

class TeacherSubmissionMessageHandlerTests {
    private static final String SESSION_ID = "teacher-session";
    private static final String REQUEST_ID = "submission-request";

    private TeacherSubmissionService service;
    private AuthenticatedSessionRegistry registry;
    private TeacherSubmissionMessageHandler handler;

    @BeforeEach
    void setUp() {
        service = mock(TeacherSubmissionService.class);
        registry = new AuthenticatedSessionRegistry();
        handler = new TeacherSubmissionMessageHandler(service, registry, JsonMapper.builder().build());
    }

    @Test
    void teacherIdentityComesFromSessionForBothOperations() {
        authenticate(UserRole.TEACHER);
        TeacherSubmission submission = sampleSubmission();
        TeacherSubmissionList list = new TeacherSubmissionList(List.of(submission));
        when(service.findExamSubmissions(7L, 10L)).thenReturn(list);
        when(service.findSubmissionResult(11L, 10L)).thenReturn(submission);

        assertSuccess(handler.handleList(
                SESSION_ID, REQUEST_ID, Map.of("examId", 7L, "teacherId", 999L)),
                "EXAM_SUBMISSIONS", list);
        assertSuccess(handler.handleResult(
                SESSION_ID, REQUEST_ID, Map.of("attemptId", 11L, "teacherId", 999L)),
                "SUBMISSION_RESULT", submission);
        verify(service).findExamSubmissions(7L, 10L);
        verify(service).findSubmissionResult(11L, 10L);
    }

    @Test
    void unauthenticatedAndStudentSessionsAreRejectedBeforeService() {
        assertError(handler.handleList("missing", REQUEST_ID, Map.of("examId", 7L)),
                "AUTHENTICATION_REQUIRED");
        authenticate(UserRole.STUDENT);
        assertError(handler.handleResult(SESSION_ID, REQUEST_ID, Map.of("attemptId", 11L)), "FORBIDDEN");
        verify(service, never()).findExamSubmissions(anyLong(), anyLong());
        verify(service, never()).findSubmissionResult(anyLong(), anyLong());
    }

    @Test
    void invalidPayloadTypesAreRejected() {
        authenticate(UserRole.TEACHER);
        assertError(handler.handleList(SESSION_ID, REQUEST_ID, null), "INVALID_PAYLOAD");
        assertError(handler.handleList(SESSION_ID, REQUEST_ID, Map.of()), "INVALID_PAYLOAD");
        assertError(handler.handleList(SESSION_ID, REQUEST_ID, Map.of("examId", "7")), "INVALID_PAYLOAD");
        assertError(handler.handleResult(SESSION_ID, REQUEST_ID, Map.of("attemptId", 1.5)), "INVALID_PAYLOAD");
    }

    @Test
    void businessAndUnexpectedErrorsAreSafe() {
        authenticate(UserRole.TEACHER);
        when(service.findExamSubmissions(7L, 10L)).thenThrow(
                new TeacherSubmissionException("EXAM_NOT_FOUND", "Examination was not found."));
        assertError(handler.handleList(SESSION_ID, REQUEST_ID, Map.of("examId", 7L)), "EXAM_NOT_FOUND");

        when(service.findSubmissionResult(11L, 10L)).thenThrow(new RuntimeException("secret"));
        ServerMessage response = handler.handleResult(
                SESSION_ID, REQUEST_ID, Map.of("attemptId", 11L));
        assertError(response, "INTERNAL_SERVER_ERROR");
        assertEquals("An unexpected error occurred.", response.error().message());
    }

    private void authenticate(UserRole role) {
        registry.authenticate(
                SESSION_ID,
                new LoggedInUser(10L, "teacher", "Teacher", "teacher@example.com", role));
    }

    private static TeacherSubmission sampleSubmission() {
        OffsetDateTime started = OffsetDateTime.parse("2026-10-27T08:00:00Z");
        return new TeacherSubmission(
                11L, 7L, "Java", 5L, "student", "Student One", AttemptStatus.SUBMITTED,
                started, started.plusHours(1), started.plusMinutes(30), 8, 10, 4, 5);
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
