package vn.edu.hanu.exam.websocket.handler;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.exception.TeacherDashboardException;
import vn.edu.hanu.exam.protocol.ServerMessage;
import vn.edu.hanu.exam.service.LoggedInUser;
import vn.edu.hanu.exam.service.dashboard.TeacherDashboardService;
import vn.edu.hanu.exam.service.dashboard.TeacherDashboardSummary;
import vn.edu.hanu.exam.session.AuthenticatedSessionRegistry;

class TeacherDashboardMessageHandlerTests {
    private static final String SESSION_ID = "teacher-session";
    private static final String REQUEST_ID = "dashboard-request";

    private TeacherDashboardService dashboardService;
    private AuthenticatedSessionRegistry sessionRegistry;
    private TeacherDashboardMessageHandler handler;

    @BeforeEach
    void setUp() {
        dashboardService = mock(TeacherDashboardService.class);
        sessionRegistry = new AuthenticatedSessionRegistry();
        handler = new TeacherDashboardMessageHandler(dashboardService, sessionRegistry);
    }

    @Test
    void authenticatedTeacherReceivesDashboardAndOriginalRequestId() {
        authenticate(UserRole.TEACHER);
        TeacherDashboardSummary summary = new TeacherDashboardSummary(0, 0, 0, 0, List.of());
        when(dashboardService.getDashboard(20L)).thenReturn(summary);

        ServerMessage response = handler.handle(SESSION_ID, REQUEST_ID);

        assertEquals(REQUEST_ID, response.requestId());
        assertEquals("TEACHER_DASHBOARD", response.type());
        assertEquals(summary, response.data());
        assertNull(response.error());
        verify(dashboardService).getDashboard(20L);
    }

    @Test
    void unauthenticatedSessionIsRejected() {
        assertError(handler.handle("missing", REQUEST_ID), "AUTHENTICATION_REQUIRED");
        verify(dashboardService, never()).getDashboard(20L);
    }

    @Test
    void studentIsForbidden() {
        authenticate(UserRole.STUDENT);
        assertError(handler.handle(SESSION_ID, REQUEST_ID), "FORBIDDEN");
        verify(dashboardService, never()).getDashboard(20L);
    }

    @Test
    void databaseFailureKeepsSafeErrorCodeAndMessage() {
        authenticate(UserRole.TEACHER);
        when(dashboardService.getDashboard(20L)).thenThrow(
                new TeacherDashboardException("DATABASE_ERROR", "The teacher dashboard could not be read."));

        ServerMessage response = handler.handle(SESSION_ID, REQUEST_ID);

        assertError(response, "DATABASE_ERROR");
        assertEquals("The teacher dashboard could not be read.", response.error().message());
    }

    @Test
    void unexpectedFailureDoesNotExposeDetails() {
        authenticate(UserRole.TEACHER);
        when(dashboardService.getDashboard(20L)).thenThrow(new RuntimeException("internal secret"));

        ServerMessage response = handler.handle(SESSION_ID, REQUEST_ID);

        assertError(response, "INTERNAL_SERVER_ERROR");
        assertEquals("An unexpected error occurred.", response.error().message());
    }

    private void authenticate(UserRole role) {
        sessionRegistry.authenticate(
                SESSION_ID,
                new LoggedInUser(20L, "user", "Dashboard User", "user@example.com", role));
    }

    private static void assertError(ServerMessage response, String code) {
        assertEquals(REQUEST_ID, response.requestId());
        assertEquals("ERROR", response.type());
        assertNull(response.data());
        assertNotNull(response.error());
        assertEquals(code, response.error().code());
    }
}
