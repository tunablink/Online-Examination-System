package vn.edu.hanu.exam.websocket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.web.socket.WebSocketSession;

import tools.jackson.databind.json.JsonMapper;
import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.protocol.ClientMessage;
import vn.edu.hanu.exam.service.LoggedInUser;
import vn.edu.hanu.exam.service.monitoring.*;
import vn.edu.hanu.exam.session.AuthenticatedSessionRegistry;

class MonitoringPushHubTests {
    private final AuthenticatedSessionRegistry auth = new AuthenticatedSessionRegistry();
    private final TeacherMonitoringQuery query = mock(TeacherMonitoringQuery.class);
    private final MonitoringService monitoring = mock(MonitoringService.class);
    private final MonitoringPushHub hub = new MonitoringPushHub(auth, query, monitoring, JsonMapper.builder().build());

    private WebSocketSession session(String id, long userId, UserRole role) {
        WebSocketSession session = mock(WebSocketSession.class);
        when(session.getId()).thenReturn(id);
        when(session.isOpen()).thenReturn(true);
        auth.authenticate(id, new LoggedInUser(userId, "test", "Test", "test@example.com", role));
        return session;
    }

    @Test
    void anonymousAndStudentCannotReadTeacherOverview() {
        var anonymous = mock(WebSocketSession.class);
        when(anonymous.getId()).thenReturn("anonymous");
        var request = new ClientMessage("r", "GET_TEACHER_MONITORING", Map.of());
        assertEquals("AUTHENTICATION_REQUIRED", hub.overview(anonymous, request).error().code());
        assertEquals("FORBIDDEN", hub.overview(session("student", 2, UserRole.STUDENT), request).error().code());
        verifyNoInteractions(query);
    }

    @Test
    void onlyOwnerReceivesPushAndUnsubscribeStopsDelivery() throws Exception {
        var owner = session("owner", 1, UserRole.TEACHER);
        var other = session("other", 2, UserRole.TEACHER);
        when(query.ownsExam(1, 10)).thenReturn(true);
        when(query.read(anyLong())).thenReturn(new TeacherMonitoringOverview(0, 0, 0, List.of(), false, "Review"));
        hub.overview(owner, new ClientMessage("r", "GET_TEACHER_MONITORING", Map.of("live", true)));
        hub.overview(other, new ClientMessage("r", "GET_TEACHER_MONITORING", Map.of("live", true)));
        hub.afterCommit(new MonitoringChanged(10));
        verify(owner).sendMessage(any());
        verify(other, never()).sendMessage(any());
        hub.watch(owner, null, Map.of("live", false));
        clearInvocations(owner);
        hub.afterCommit(new MonitoringChanged(10));
        verify(owner, never()).sendMessage(any());
    }

    @Test
    void changedIdentityAndDisconnectedSessionAreRemoved() throws Exception {
        var owner = session("owner", 1, UserRole.TEACHER);
        when(query.read(1)).thenReturn(new TeacherMonitoringOverview(0, 0, 0, List.of(), false, "Review"));
        hub.overview(owner, new ClientMessage("r", "GET_TEACHER_MONITORING", Map.of("live", true)));
        auth.authenticate("owner", new LoggedInUser(2, "student", "Student", "s@example.com", UserRole.STUDENT));
        hub.afterCommit(new MonitoringChanged(10));
        verify(owner, never()).sendMessage(any());
        verify(query, never()).ownsExam(anyLong(), anyLong());
    }

    @Test
    void identityIsRecheckedImmediatelyBeforeDelivery() throws Exception {
        var owner = session("owner", 1, UserRole.TEACHER);
        when(query.read(1)).thenReturn(new TeacherMonitoringOverview(0, 0, 0, List.of(), false, "Review"));
        hub.overview(owner, new ClientMessage("r", "GET_TEACHER_MONITORING", Map.of("live", true)));
        when(query.ownsExam(1, 10)).thenAnswer(invocation -> {
            auth.authenticate("owner", new LoggedInUser(2, "other", "Other", "x@example.com", UserRole.STUDENT));
            return true;
        });
        hub.afterCommit(new MonitoringChanged(10));
        verify(owner, never()).sendMessage(any());
    }
}
