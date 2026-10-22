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
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import tools.jackson.databind.json.JsonMapper;
import vn.edu.hanu.exam.domain.ExamStatus;
import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.exception.ExamManagementException;
import vn.edu.hanu.exam.protocol.ServerMessage;
import vn.edu.hanu.exam.service.LoggedInUser;
import vn.edu.hanu.exam.service.exam.CreateExamCommand;
import vn.edu.hanu.exam.service.exam.ExamDetails;
import vn.edu.hanu.exam.service.exam.ExamManagementService;
import vn.edu.hanu.exam.service.exam.TeacherExamList;
import vn.edu.hanu.exam.session.AuthenticatedSessionRegistry;

class ExamManagementMessageHandlerTests {
    private static final String SESSION_ID = "session-1";
    private static final String REQUEST_ID = "request-1";

    private ExamManagementService examService;
    private AuthenticatedSessionRegistry sessionRegistry;
    private ExamManagementMessageHandler handler;

    @BeforeEach
    void setUp() {
        examService = mock(ExamManagementService.class);
        sessionRegistry = new AuthenticatedSessionRegistry();
        handler = new ExamManagementMessageHandler(examService, sessionRegistry, JsonMapper.builder().build());
    }

    @Test
    void validCreateReturnsExamCreatedAndPreservesRequestId() {
        authenticate(UserRole.TEACHER);
        ExamDetails exam = sampleExam();
        when(examService.createExam(eq(10L), any(CreateExamCommand.class))).thenReturn(exam);

        ServerMessage response = handler.handleCreate(SESSION_ID, REQUEST_ID, Map.of(
                "title", "Java Midterm",
                "description", "Core Java",
                "durationMinutes", 60));

        assertEquals(REQUEST_ID, response.requestId());
        assertEquals("EXAM_CREATED", response.type());
        assertEquals(exam, response.data());
        assertNull(response.error());
    }

    @Test
    void missingTitleReturnsServiceValidationCode() {
        authenticate(UserRole.TEACHER);
        when(examService.createExam(eq(10L), any(CreateExamCommand.class)))
                .thenThrow(new ExamManagementException("INVALID_EXAM_TITLE", "Exam title is required."));

        assertError(handler.handleCreate(
                SESSION_ID, REQUEST_ID, Map.of("durationMinutes", 60)), "INVALID_EXAM_TITLE");
    }

    @Test
    void invalidDurationReturnsExpectedCode() {
        authenticate(UserRole.TEACHER);
        when(examService.createExam(eq(10L), any(CreateExamCommand.class)))
                .thenThrow(new ExamManagementException("INVALID_EXAM_DURATION", "Invalid duration."));

        assertError(handler.handleCreate(SESSION_ID, REQUEST_ID, Map.of(
                "title", "Exam", "durationMinutes", 0)), "INVALID_EXAM_DURATION");
    }

    @Test
    void unauthenticatedSessionIsRejected() {
        assertError(handler.handleList("missing", REQUEST_ID), "AUTHENTICATION_REQUIRED");
        verify(examService, never()).findAllByCreatedBy(anyLong());
    }

    @Test
    void studentIsForbidden() {
        authenticate(UserRole.STUDENT);
        assertError(handler.handleList(SESSION_ID, REQUEST_ID), "FORBIDDEN");
        verify(examService, never()).findAllByCreatedBy(anyLong());
    }

    @Test
    void listAndGetUseAuthenticatedTeacherId() {
        authenticate(UserRole.TEACHER);
        when(examService.findAllByCreatedBy(10L)).thenReturn(new TeacherExamList(List.of(sampleExam())));
        when(examService.findByIdAndCreatedBy(1L, 10L)).thenReturn(sampleExam());

        assertEquals("TEACHER_EXAMS", handler.handleList(SESSION_ID, REQUEST_ID).type());
        assertEquals("EXAM_DETAILS", handler.handleGet(
                SESSION_ID, REQUEST_ID, Map.of("examId", 1L)).type());
        verify(examService).findAllByCreatedBy(10L);
        verify(examService).findByIdAndCreatedBy(1L, 10L);
    }

    private void authenticate(UserRole role) {
        sessionRegistry.authenticate(
                SESSION_ID,
                new LoggedInUser(10L, "user", "Test User", "user@example.com", role));
    }

    private ExamDetails sampleExam() {
        OffsetDateTime timestamp = OffsetDateTime.parse("2026-10-22T10:00:00+07:00");
        return new ExamDetails(
                1L, "Java Midterm", "Core Java", 60, ExamStatus.DRAFT, 10L, timestamp, timestamp);
    }

    private void assertError(ServerMessage response, String expectedCode) {
        assertEquals(REQUEST_ID, response.requestId());
        assertEquals("ERROR", response.type());
        assertNull(response.data());
        assertNotNull(response.error());
        assertEquals(expectedCode, response.error().code());
    }
}
