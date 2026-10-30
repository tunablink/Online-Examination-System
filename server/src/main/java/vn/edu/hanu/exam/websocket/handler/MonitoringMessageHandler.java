package vn.edu.hanu.exam.websocket.handler;

import java.math.BigInteger;
import java.util.Locale;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;
import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.domain.monitoring.ActivityType;
import vn.edu.hanu.exam.exception.MonitoringException;
import vn.edu.hanu.exam.protocol.ClientMessage;
import vn.edu.hanu.exam.protocol.ServerMessage;
import vn.edu.hanu.exam.service.LoggedInUser;
import vn.edu.hanu.exam.service.monitoring.MonitoringService;
import vn.edu.hanu.exam.service.monitoring.ReportActivityCommand;
import vn.edu.hanu.exam.session.AuthenticatedSessionRegistry;
import vn.edu.hanu.exam.session.AttemptSessionRegistry;
import vn.edu.hanu.exam.exception.AttemptException;
import vn.edu.hanu.exam.websocket.dto.GetExamMonitoringPayload;
import vn.edu.hanu.exam.websocket.dto.ReportActivityPayload;

@Component
public class MonitoringMessageHandler {
    public static final String TYPE_ACTIVITY_RECORDED = "ACTIVITY_RECORDED";
    public static final String TYPE_EXAM_MONITORING = "EXAM_MONITORING";

    private static final Logger LOGGER = LoggerFactory.getLogger(MonitoringMessageHandler.class);

    private final MonitoringService monitoringService;
    private final AuthenticatedSessionRegistry sessionRegistry;
    private final JsonMapper jsonMapper;
    private final AttemptSessionRegistry leases;

    public MonitoringMessageHandler(
            MonitoringService monitoringService,
            AuthenticatedSessionRegistry sessionRegistry,
            JsonMapper jsonMapper) {
        this(monitoringService, sessionRegistry, jsonMapper, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public MonitoringMessageHandler(MonitoringService monitoringService, AuthenticatedSessionRegistry sessionRegistry,
            JsonMapper jsonMapper, AttemptSessionRegistry leases) {
        this.monitoringService = monitoringService;
        this.sessionRegistry = sessionRegistry;
        this.jsonMapper = jsonMapper;
        this.leases = leases;
    }

    public ServerMessage handleReportActivity(WebSocketSession session, ClientMessage message) {
        return handleReportActivity(session.getId(), message.requestId(), message.payload());
    }

    public ServerMessage handleGetExamMonitoring(WebSocketSession session, ClientMessage message) {
        return handleGetExamMonitoring(session.getId(), message.requestId(), message.payload());
    }

    public ServerMessage handleReportActivity(
            String sessionId,
            String requestId,
            Map<String, Object> payload) {
        LoggedInUser user = authenticatedUser(sessionId);
        if (user == null) {
            return authenticationRequired(requestId);
        }
        if (user.role() != UserRole.STUDENT) {
            return forbidden(requestId, "Only students can report attempt activity.");
        }

        try {
            ReportActivityPayload input = convertReportPayload(payload);
            ActivityType activityType = ActivityType.valueOf(
                    input.activityType().trim().toUpperCase(Locale.ROOT));
            return ServerMessage.success(
                    requestId,
                    TYPE_ACTIVITY_RECORDED,
                    leases == null ? monitoringService.reportActivity(user.id(), new ReportActivityCommand(input.attemptId(), activityType))
                            : leases.withOwner(input.attemptId(), user.id(), sessionId,
                                    () -> monitoringService.reportActivity(user.id(), new ReportActivityCommand(input.attemptId(), activityType)), false));
        } catch (InvalidPayloadException | IllegalArgumentException exception) {
            return invalidPayload(requestId);
        } catch (AttemptException exception) {
            return ServerMessage.error(requestId, exception.code(), exception.getMessage());
        } catch (MonitoringException exception) {
            return monitoringError(requestId, exception);
        } catch (RuntimeException exception) {
            return internalError(requestId, exception);
        }
    }

    public ServerMessage handleGetExamMonitoring(
            String sessionId,
            String requestId,
            Map<String, Object> payload) {
        LoggedInUser user = authenticatedUser(sessionId);
        if (user == null) {
            return authenticationRequired(requestId);
        }
        if (user.role() != UserRole.TEACHER) {
            return forbidden(requestId, "Only teachers can view exam monitoring data.");
        }

        try {
            GetExamMonitoringPayload input = convertMonitoringPayload(payload);
            return ServerMessage.success(
                    requestId,
                    TYPE_EXAM_MONITORING,
                    monitoringService.getExamMonitoring(user.id(), input.examId()));
        } catch (InvalidPayloadException | IllegalArgumentException exception) {
            return invalidPayload(requestId);
        } catch (MonitoringException exception) {
            return monitoringError(requestId, exception);
        } catch (RuntimeException exception) {
            return internalError(requestId, exception);
        }
    }

    private LoggedInUser authenticatedUser(String sessionId) {
        return sessionRegistry.findUser(sessionId).orElse(null);
    }

    private ReportActivityPayload convertReportPayload(Map<String, Object> payload) {
        if (payload == null || !isIntegralNumber(payload.get("attemptId"))
                || !(payload.get("activityType") instanceof String activityType)
                || activityType.isBlank()) {
            throw new InvalidPayloadException();
        }
        try {
            ReportActivityPayload input = jsonMapper.convertValue(payload, ReportActivityPayload.class);
            if (input.attemptId() == null || input.attemptId() <= 0) {
                throw new InvalidPayloadException();
            }
            return input;
        } catch (JacksonException | IllegalArgumentException exception) {
            throw new InvalidPayloadException();
        }
    }

    private GetExamMonitoringPayload convertMonitoringPayload(Map<String, Object> payload) {
        if (payload == null || !isIntegralNumber(payload.get("examId"))) {
            throw new InvalidPayloadException();
        }
        try {
            GetExamMonitoringPayload input = jsonMapper.convertValue(payload, GetExamMonitoringPayload.class);
            if (input.examId() == null || input.examId() <= 0) {
                throw new InvalidPayloadException();
            }
            return input;
        } catch (JacksonException | IllegalArgumentException exception) {
            throw new InvalidPayloadException();
        }
    }

    private ServerMessage monitoringError(String requestId, MonitoringException exception) {
        LOGGER.info("Monitoring operation rejected: requestId={}, code={}",
                requestId, exception.code());
        return ServerMessage.error(requestId, exception.code(), exception.getMessage());
    }

    private ServerMessage internalError(String requestId, RuntimeException exception) {
        LOGGER.error("Unexpected monitoring error: requestId={}", requestId, exception);
        return ServerMessage.error(
                requestId, "INTERNAL_SERVER_ERROR", "An unexpected error occurred.");
    }

    private static ServerMessage authenticationRequired(String requestId) {
        return ServerMessage.error(
                requestId, "AUTHENTICATION_REQUIRED", "Authentication is required.");
    }

    private static ServerMessage forbidden(String requestId, String message) {
        return ServerMessage.error(requestId, "FORBIDDEN", message);
    }

    private static ServerMessage invalidPayload(String requestId) {
        return ServerMessage.error(requestId, "INVALID_PAYLOAD", "The request payload is invalid.");
    }

    private static boolean isIntegralNumber(Object value) {
        return value instanceof Byte || value instanceof Short || value instanceof Integer
                || value instanceof Long || value instanceof BigInteger;
    }

    private static final class InvalidPayloadException extends RuntimeException {
    }
}
