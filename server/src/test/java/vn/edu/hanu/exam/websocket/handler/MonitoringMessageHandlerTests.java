package vn.edu.hanu.exam.websocket.handler;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
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
import vn.edu.hanu.exam.exception.MonitoringException;
import vn.edu.hanu.exam.protocol.ServerMessage;
import vn.edu.hanu.exam.service.LoggedInUser;
import vn.edu.hanu.exam.service.monitoring.ActivityRecorded;
import vn.edu.hanu.exam.service.monitoring.ExamMonitoringSummary;
import vn.edu.hanu.exam.service.monitoring.MonitoringService;
import vn.edu.hanu.exam.service.monitoring.ReportActivityCommand;
import vn.edu.hanu.exam.session.AuthenticatedSessionRegistry;

class MonitoringMessageHandlerTests {
    private static final String SESSION_ID = "monitoring-session";
    private static final String REQUEST_ID = "monitoring-request";

    private MonitoringService service;
    private AuthenticatedSessionRegistry registry;
    private MonitoringMessageHandler handler;

    @BeforeEach
    void setUp() {
        service = mock(MonitoringService.class);
        registry = new AuthenticatedSessionRegistry();
        handler = new MonitoringMessageHandler(service, registry, JsonMapper.builder().build());
    }

    @Test
    void studentCanReportSupportedActivityAndRequestIdIsPreserved() {
        authenticate(UserRole.STUDENT);
        ActivityRecorded recorded = new ActivityRecorded(null, null, 1L, "Review required.");
        when(service.reportActivity(anyLong(), any())).thenReturn(recorded);

        ServerMessage response = handler.handleReportActivity(
                SESSION_ID, REQUEST_ID, Map.of("attemptId", 42L, "activityType", "tab_hidden"));

        assertSuccess(response, "ACTIVITY_RECORDED", recorded);
        verify(service).reportActivity(20L, new ReportActivityCommand(
                42L, vn.edu.hanu.exam.domain.monitoring.ActivityType.TAB_HIDDEN));
    }

    @Test
    void unauthenticatedActivityReportIsRejected() {
        assertError(
                handler.handleReportActivity(
                        "missing", REQUEST_ID, Map.of("attemptId", 42L, "activityType", "TAB_HIDDEN")),
                "AUTHENTICATION_REQUIRED");
        verify(service, never()).reportActivity(anyLong(), any());
    }

    @Test
    void teacherCannotReportStudentActivity() {
        authenticate(UserRole.TEACHER);
        assertError(
                handler.handleReportActivity(
                        SESSION_ID, REQUEST_ID, Map.of("attemptId", 42L, "activityType", "TAB_HIDDEN")),
                "FORBIDDEN");
    }

    @Test
    void invalidAndUnsupportedActivitiesAreRejected() {
        authenticate(UserRole.STUDENT);
        assertError(handler.handleReportActivity(SESSION_ID, REQUEST_ID, Map.of()), "INVALID_PAYLOAD");
        assertError(
                handler.handleReportActivity(
                        SESSION_ID, REQUEST_ID, Map.of("attemptId", 42L, "activityType", "CHEATING")),
                "INVALID_PAYLOAD");
        verify(service, never()).reportActivity(anyLong(), any());
    }

    @Test
    void teacherCanReadOwnedExamMonitoring() {
        authenticate(UserRole.TEACHER);
        ExamMonitoringSummary summary = new ExamMonitoringSummary(9L, List.of(), "Review required.");
        when(service.getExamMonitoring(20L, 9L)).thenReturn(summary);

        ServerMessage response = handler.handleGetExamMonitoring(
                SESSION_ID, REQUEST_ID, Map.of("examId", 9L));

        assertSuccess(response, "EXAM_MONITORING", summary);
    }

    @Test
    void studentCannotReadExamMonitoring() {
        authenticate(UserRole.STUDENT);
        assertError(
                handler.handleGetExamMonitoring(SESSION_ID, REQUEST_ID, Map.of("examId", 9L)),
                "FORBIDDEN");
        verify(service, never()).getExamMonitoring(anyLong(), anyLong());
    }

    @Test
    void ownershipAndDatabaseErrorsRemainSafe() {
        authenticate(UserRole.TEACHER);
        when(service.getExamMonitoring(20L, 9L)).thenThrow(
                new MonitoringException("EXAM_NOT_ACCESSIBLE", "Monitoring is unavailable."));
        assertError(
                handler.handleGetExamMonitoring(SESSION_ID, REQUEST_ID, Map.of("examId", 9L)),
                "EXAM_NOT_ACCESSIBLE");

        when(service.getExamMonitoring(20L, 10L)).thenThrow(new RuntimeException("internal secret"));
        ServerMessage internal = handler.handleGetExamMonitoring(
                SESSION_ID, REQUEST_ID, Map.of("examId", 10L));
        assertError(internal, "INTERNAL_SERVER_ERROR");
        assertEquals("An unexpected error occurred.", internal.error().message());
    }

    private void authenticate(UserRole role) {
        registry.authenticate(
                SESSION_ID,
                new LoggedInUser(20L, "user", "Monitoring User", "user@example.com", role));
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
