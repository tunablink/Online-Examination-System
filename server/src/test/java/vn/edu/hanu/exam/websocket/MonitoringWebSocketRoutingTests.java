package vn.edu.hanu.exam.websocket;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import tools.jackson.databind.json.JsonMapper;
import vn.edu.hanu.exam.protocol.ClientMessage;
import vn.edu.hanu.exam.protocol.ServerMessage;
import vn.edu.hanu.exam.service.LoginService;
import vn.edu.hanu.exam.session.AuthenticatedSessionRegistry;
import vn.edu.hanu.exam.websocket.handler.AttemptMessageHandler;
import vn.edu.hanu.exam.websocket.handler.ExamManagementMessageHandler;
import vn.edu.hanu.exam.websocket.handler.MonitoringMessageHandler;
import vn.edu.hanu.exam.websocket.handler.ProfileManagementMessageHandler;
import vn.edu.hanu.exam.websocket.handler.QuestionManagementMessageHandler;
import vn.edu.hanu.exam.websocket.handler.RegistrationMessageHandler;
import vn.edu.hanu.exam.websocket.handler.StudentExamCatalogMessageHandler;
import vn.edu.hanu.exam.websocket.handler.StudentManagementMessageHandler;
import vn.edu.hanu.exam.websocket.handler.TeacherDashboardMessageHandler;

class MonitoringWebSocketRoutingTests {
    private ExamWebSocketHandler webSocketHandler;
    private MonitoringMessageHandler monitoringHandler;
    private WebSocketSession session;

    @BeforeEach
    void setUp() {
        monitoringHandler = mock(MonitoringMessageHandler.class);
        session = mock(WebSocketSession.class);
        when(session.getId()).thenReturn("monitoring-session");
        webSocketHandler = new ExamWebSocketHandler(
                JsonMapper.builder().build(),
                mock(RegistrationMessageHandler.class),
                mock(ExamManagementMessageHandler.class),
                mock(QuestionManagementMessageHandler.class),
                mock(StudentExamCatalogMessageHandler.class),
                mock(AttemptMessageHandler.class),
                mock(StudentManagementMessageHandler.class),
                mock(TeacherDashboardMessageHandler.class),
                mock(ProfileManagementMessageHandler.class),
                monitoringHandler,
                mock(LoginService.class),
                new AuthenticatedSessionRegistry());
    }

    @Test
    void routesReportActivityToMonitoringHandler() throws Exception {
        when(monitoringHandler.handleReportActivity(eq(session), any(ClientMessage.class)))
                .thenReturn(ServerMessage.success("activity-1", "ACTIVITY_RECORDED", Map.of()));

        webSocketHandler.handleTextMessage(session, new TextMessage("""
                {"requestId":"activity-1","type":"REPORT_ACTIVITY",
                 "payload":{"attemptId":15,"activityType":"TAB_HIDDEN"}}
                """));

        verify(monitoringHandler).handleReportActivity(eq(session), any(ClientMessage.class));
        verify(session).sendMessage(any(TextMessage.class));
    }

    @Test
    void routesGetExamMonitoringToMonitoringHandler() throws Exception {
        when(monitoringHandler.handleGetExamMonitoring(eq(session), any(ClientMessage.class)))
                .thenReturn(ServerMessage.success("monitoring-1", "EXAM_MONITORING", Map.of()));

        webSocketHandler.handleTextMessage(session, new TextMessage("""
                {"requestId":"monitoring-1","type":"GET_EXAM_MONITORING",
                 "payload":{"examId":10}}
                """));

        verify(monitoringHandler).handleGetExamMonitoring(eq(session), any(ClientMessage.class));
        verify(session).sendMessage(any(TextMessage.class));
    }
}
