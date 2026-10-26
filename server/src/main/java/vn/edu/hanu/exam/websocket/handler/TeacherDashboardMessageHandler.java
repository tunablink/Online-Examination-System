package vn.edu.hanu.exam.websocket.handler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.exception.TeacherDashboardException;
import vn.edu.hanu.exam.protocol.ClientMessage;
import vn.edu.hanu.exam.protocol.MessageType;
import vn.edu.hanu.exam.protocol.ServerMessage;
import vn.edu.hanu.exam.service.LoggedInUser;
import vn.edu.hanu.exam.service.dashboard.TeacherDashboardService;
import vn.edu.hanu.exam.session.AuthenticatedSessionRegistry;

@Component
public class TeacherDashboardMessageHandler {
    private static final Logger LOGGER = LoggerFactory.getLogger(TeacherDashboardMessageHandler.class);

    private final TeacherDashboardService dashboardService;
    private final AuthenticatedSessionRegistry sessionRegistry;

    public TeacherDashboardMessageHandler(
            TeacherDashboardService dashboardService,
            AuthenticatedSessionRegistry sessionRegistry) {
        this.dashboardService = dashboardService;
        this.sessionRegistry = sessionRegistry;
    }

    public ServerMessage handle(WebSocketSession session, ClientMessage message) {
        return handle(session.getId(), message.requestId());
    }

    public ServerMessage handle(String sessionId, String requestId) {
        LoggedInUser user = sessionRegistry.findUser(sessionId).orElse(null);
        if (user == null) {
            return ServerMessage.error(requestId, "AUTHENTICATION_REQUIRED", "Authentication is required.");
        }
        if (user.role() != UserRole.TEACHER) {
            return ServerMessage.error(
                    requestId, "FORBIDDEN", "This operation is only available to teachers.");
        }

        try {
            return ServerMessage.success(
                    requestId,
                    MessageType.TEACHER_DASHBOARD.name(),
                    dashboardService.getDashboard(user.id()));
        } catch (TeacherDashboardException exception) {
            LOGGER.info("Teacher dashboard operation rejected: requestId={}, code={}",
                    requestId, exception.code());
            return ServerMessage.error(requestId, exception.code(), exception.getMessage());
        } catch (RuntimeException exception) {
            LOGGER.error("Unexpected teacher dashboard error: requestId={}", requestId, exception);
            return ServerMessage.error(
                    requestId, "INTERNAL_SERVER_ERROR", "An unexpected error occurred.");
        }
    }
}
