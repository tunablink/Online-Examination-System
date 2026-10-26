package vn.edu.hanu.exam.websocket.handler;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import tools.jackson.databind.json.JsonMapper;
import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.exception.StudentExamCatalogException;
import vn.edu.hanu.exam.protocol.ServerMessage;
import vn.edu.hanu.exam.service.LoggedInUser;
import vn.edu.hanu.exam.service.catalog.AvailableExamDetails;
import vn.edu.hanu.exam.service.catalog.AvailableExamList;
import vn.edu.hanu.exam.service.catalog.StudentExamCatalogService;
import vn.edu.hanu.exam.session.AuthenticatedSessionRegistry;

class StudentExamCatalogMessageHandlerTests {
    private static final String SESSION_ID = "student-session";
    private static final String REQUEST_ID = "catalog-request";

    private StudentExamCatalogService catalogService;
    private AuthenticatedSessionRegistry sessionRegistry;
    private StudentExamCatalogMessageHandler handler;

    @BeforeEach
    void setUp() {
        catalogService = mock(StudentExamCatalogService.class);
        sessionRegistry = new AuthenticatedSessionRegistry();
        handler = new StudentExamCatalogMessageHandler(
                catalogService,
                sessionRegistry,
                JsonMapper.builder().build());
    }

    @Test
    void authenticatedStudentCanListPublishedExamsAndRequestIdIsPreserved() {
        authenticate(UserRole.STUDENT);
        AvailableExamList list = new AvailableExamList(List.of(sampleExam()));
        when(catalogService.findAllAvailable()).thenReturn(list);

        ServerMessage response = handler.handleList(SESSION_ID, REQUEST_ID);

        assertSuccess(response, "AVAILABLE_EXAMS", list);
    }

    @Test
    void authenticatedStudentCanGetPublishedExamDetails() {
        authenticate(UserRole.STUDENT);
        AvailableExamDetails details = sampleExam();
        when(catalogService.findAvailableById(12L)).thenReturn(details);

        ServerMessage response = handler.handleGet(
                SESSION_ID,
                REQUEST_ID,
                Map.of("examId", 12L));

        assertSuccess(response, "AVAILABLE_EXAM_DETAILS", details);
        verify(catalogService).findAvailableById(12L);
    }

    @Test
    void unauthenticatedSessionIsRejectedBeforeCallingService() {
        assertError(handler.handleList("missing-session", REQUEST_ID), "AUTHENTICATION_REQUIRED");
        verify(catalogService, never()).findAllAvailable();
    }

    @Test
    void teacherIsForbiddenBeforeCallingService() {
        authenticate(UserRole.TEACHER);

        assertError(handler.handleList(SESSION_ID, REQUEST_ID), "FORBIDDEN");
        verify(catalogService, never()).findAllAvailable();
    }

    @Test
    void nullMissingAndWrongTypeDetailPayloadsAreRejected() {
        authenticate(UserRole.STUDENT);

        assertError(handler.handleGet(SESSION_ID, REQUEST_ID, null), "INVALID_PAYLOAD");
        assertError(handler.handleGet(SESSION_ID, REQUEST_ID, Map.of()), "INVALID_PAYLOAD");
        assertError(handler.handleGet(
                SESSION_ID, REQUEST_ID, Map.of("examId", "12")), "INVALID_PAYLOAD");
        assertError(handler.handleGet(
                SESSION_ID, REQUEST_ID, Map.of("examId", 12.5)), "INVALID_PAYLOAD");
        verify(catalogService, never()).findAvailableById(anyLong());
    }

    @Test
    void unavailableExamKeepsBusinessErrorCode() {
        authenticate(UserRole.STUDENT);
        when(catalogService.findAvailableById(12L)).thenThrow(
                new StudentExamCatalogException("EXAM_NOT_AVAILABLE", "Exam is not available."));

        assertError(handler.handleGet(
                SESSION_ID, REQUEST_ID, Map.of("examId", 12L)), "EXAM_NOT_AVAILABLE");
    }

    @Test
    void databaseErrorKeepsSafeBusinessErrorCode() {
        authenticate(UserRole.STUDENT);
        when(catalogService.findAllAvailable()).thenThrow(
                new StudentExamCatalogException("DATABASE_ERROR", "The exam catalog could not be read."));

        assertError(handler.handleList(SESSION_ID, REQUEST_ID), "DATABASE_ERROR");
    }

    @Test
    void unexpectedExceptionReturnsInternalServerError() {
        authenticate(UserRole.STUDENT);
        when(catalogService.findAllAvailable()).thenThrow(new RuntimeException("internal secret"));

        ServerMessage response = handler.handleList(SESSION_ID, REQUEST_ID);

        assertError(response, "INTERNAL_SERVER_ERROR");
        assertEquals("An unexpected error occurred.", response.error().message());
    }

    private void authenticate(UserRole role) {
        sessionRegistry.authenticate(
                SESSION_ID,
                new LoggedInUser(20L, "student", "Catalog User", "catalog@example.com", role));
    }

    private static AvailableExamDetails sampleExam() {
        return new AvailableExamDetails(12L, "Java Final", "Core Java", 90, 30, 30);
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
