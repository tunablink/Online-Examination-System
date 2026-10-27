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
import vn.edu.hanu.exam.exception.AttemptException;
import vn.edu.hanu.exam.protocol.ClientMessage;
import vn.edu.hanu.exam.protocol.ServerMessage;
import vn.edu.hanu.exam.service.LoggedInUser;
import vn.edu.hanu.exam.service.attempt.ExamAttemptService;
import vn.edu.hanu.exam.session.AuthenticatedSessionRegistry;
import vn.edu.hanu.exam.websocket.dto.GetExamAttemptPayload;
import vn.edu.hanu.exam.websocket.dto.StartExamPayload;

@Component
public class AttemptMessageHandler {
    static final String TYPE_EXAM_STARTED = "EXAM_STARTED";
    static final String TYPE_EXAM_ATTEMPT_DETAILS = "EXAM_ATTEMPT_DETAILS";
    static final String CODE_AUTHENTICATION_REQUIRED = "AUTHENTICATION_REQUIRED";
    static final String CODE_FORBIDDEN = "FORBIDDEN";
    static final String CODE_INVALID_PAYLOAD = "INVALID_PAYLOAD";
    static final String CODE_INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR";

    private static final Logger LOGGER = LoggerFactory.getLogger(AttemptMessageHandler.class);

    private final ExamAttemptService attemptService;
    private final AuthenticatedSessionRegistry sessionRegistry;
    private final JsonMapper jsonMapper;

    public AttemptMessageHandler(
            ExamAttemptService attemptService,
            AuthenticatedSessionRegistry sessionRegistry,
            JsonMapper jsonMapper) {
        this.attemptService = attemptService;
        this.sessionRegistry = sessionRegistry;
        this.jsonMapper = jsonMapper;
    }

    public ServerMessage handleStart(WebSocketSession session, ClientMessage message) {
        return handleStart(session.getId(), message.requestId(), message.payload());
    }

    public ServerMessage handleGet(WebSocketSession session, ClientMessage message) {
        return handleGet(session.getId(), message.requestId(), message.payload());
    }

    public ServerMessage handleStart(String sessionId, String requestId, Map<String, Object> payload) {
        return withStudent(sessionId, requestId, student -> {
            StartExamPayload input = convertStartPayload(payload);
            return ServerMessage.success(
                    requestId,
                    TYPE_EXAM_STARTED,
                    attemptService.startExam(input.examId(), student.id()));
        });
    }

    public ServerMessage handleGet(String sessionId, String requestId, Map<String, Object> payload) {
        return withStudent(sessionId, requestId, student -> {
            GetExamAttemptPayload input = convertGetPayload(payload);
            return ServerMessage.success(
                    requestId,
                    TYPE_EXAM_ATTEMPT_DETAILS,
                    attemptService.getAttempt(input.attemptId(), student.id()));
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
            return ServerMessage.error(requestId, CODE_INVALID_PAYLOAD, "The request payload is invalid.");
        } catch (AttemptException exception) {
            LOGGER.info(
                    "Exam attempt operation rejected: requestId={}, code={}",
                    requestId,
                    exception.code());
            return ServerMessage.error(requestId, exception.code(), exception.getMessage());
        } catch (RuntimeException exception) {
            LOGGER.error("Unexpected exam attempt error: requestId={}", requestId, exception);
            return ServerMessage.error(
                    requestId,
                    CODE_INTERNAL_SERVER_ERROR,
                    "An unexpected error occurred.");
        }
    }

    private StartExamPayload convertStartPayload(Map<String, Object> payload) {
        if (payload == null || !isIntegralNumber(payload.get("examId"))) {
            throw new InvalidPayloadException();
        }
        try {
            StartExamPayload input = jsonMapper.convertValue(payload, StartExamPayload.class);
            if (input.examId() == null) {
                throw new InvalidPayloadException();
            }
            return input;
        } catch (JacksonException | IllegalArgumentException exception) {
            throw new InvalidPayloadException();
        }
    }

    private GetExamAttemptPayload convertGetPayload(Map<String, Object> payload) {
        if (payload == null || !isIntegralNumber(payload.get("attemptId"))) {
            throw new InvalidPayloadException();
        }
        try {
            GetExamAttemptPayload input = jsonMapper.convertValue(payload, GetExamAttemptPayload.class);
            if (input.attemptId() == null) {
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
