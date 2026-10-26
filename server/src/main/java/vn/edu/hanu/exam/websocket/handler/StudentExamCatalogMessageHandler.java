package vn.edu.hanu.exam.websocket.handler;

import java.math.BigInteger;
import java.util.Map;
import java.util.function.Function;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;
import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.exception.StudentExamCatalogException;
import vn.edu.hanu.exam.protocol.ClientMessage;
import vn.edu.hanu.exam.protocol.ServerMessage;
import vn.edu.hanu.exam.service.LoggedInUser;
import vn.edu.hanu.exam.service.catalog.StudentExamCatalogService;
import vn.edu.hanu.exam.session.AuthenticatedSessionRegistry;
import vn.edu.hanu.exam.websocket.dto.GetAvailableExamPayload;

@Component
public class StudentExamCatalogMessageHandler {
    static final String TYPE_AVAILABLE_EXAMS = "AVAILABLE_EXAMS";
    static final String TYPE_AVAILABLE_EXAM_DETAILS = "AVAILABLE_EXAM_DETAILS";
    static final String CODE_AUTHENTICATION_REQUIRED = "AUTHENTICATION_REQUIRED";
    static final String CODE_FORBIDDEN = "FORBIDDEN";
    static final String CODE_INVALID_PAYLOAD = "INVALID_PAYLOAD";
    static final String CODE_INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR";

    private static final Logger LOGGER = LoggerFactory.getLogger(StudentExamCatalogMessageHandler.class);

    private final StudentExamCatalogService catalogService;
    private final AuthenticatedSessionRegistry sessionRegistry;
    private final JsonMapper jsonMapper;

    public StudentExamCatalogMessageHandler(
            StudentExamCatalogService catalogService,
            AuthenticatedSessionRegistry sessionRegistry,
            JsonMapper jsonMapper) {
        this.catalogService = catalogService;
        this.sessionRegistry = sessionRegistry;
        this.jsonMapper = jsonMapper;
    }

    public ServerMessage handleList(WebSocketSession session, ClientMessage message) {
        return handleList(session.getId(), message.requestId());
    }

    public ServerMessage handleGet(WebSocketSession session, ClientMessage message) {
        return handleGet(session.getId(), message.requestId(), message.payload());
    }

    public ServerMessage handleList(String sessionId, String requestId) {
        return withStudent(sessionId, requestId, student -> ServerMessage.success(
                requestId,
                TYPE_AVAILABLE_EXAMS,
                catalogService.findAllAvailable()));
    }

    public ServerMessage handleGet(String sessionId, String requestId, Map<String, Object> payload) {
        return withStudent(sessionId, requestId, student -> {
            GetAvailableExamPayload input = convertDetailPayload(payload);
            return ServerMessage.success(
                    requestId,
                    TYPE_AVAILABLE_EXAM_DETAILS,
                    catalogService.findAvailableById(input.examId()));
        });
    }

    private ServerMessage withStudent(
            String sessionId,
            String requestId,
            Function<LoggedInUser, ServerMessage> operation) {
        LoggedInUser user = sessionRegistry.findUser(sessionId).orElse(null);
        if (user == null) {
            return ServerMessage.error(
                    requestId,
                    CODE_AUTHENTICATION_REQUIRED,
                    "Authentication is required.");
        }
        if (user.role() != UserRole.STUDENT) {
            return ServerMessage.error(
                    requestId,
                    CODE_FORBIDDEN,
                    "This operation is only available to students.");
        }

        try {
            return operation.apply(user);
        } catch (InvalidPayloadException exception) {
            return ServerMessage.error(
                    requestId,
                    CODE_INVALID_PAYLOAD,
                    "The request payload is invalid.");
        } catch (StudentExamCatalogException exception) {
            LOGGER.info("Student exam catalog operation rejected: requestId={}, code={}",
                    requestId, exception.code());
            return ServerMessage.error(requestId, exception.code(), exception.getMessage());
        } catch (RuntimeException exception) {
            LOGGER.error("Unexpected student exam catalog error: requestId={}", requestId, exception);
            return ServerMessage.error(
                    requestId,
                    CODE_INTERNAL_SERVER_ERROR,
                    "An unexpected error occurred.");
        }
    }

    private GetAvailableExamPayload convertDetailPayload(Map<String, Object> payload) {
        if (payload == null || !isIntegralNumber(payload.get("examId"))) {
            throw new InvalidPayloadException();
        }

        try {
            GetAvailableExamPayload input = jsonMapper.convertValue(payload, GetAvailableExamPayload.class);
            if (input.examId() == null) {
                throw new InvalidPayloadException();
            }
            return input;
        } catch (JacksonException | IllegalArgumentException exception) {
            throw new InvalidPayloadException();
        }
    }

    private static boolean isIntegralNumber(Object value) {
        return value instanceof Byte
                || value instanceof Short
                || value instanceof Integer
                || value instanceof Long
                || value instanceof BigInteger;
    }

    private static final class InvalidPayloadException extends RuntimeException {
    }
}
