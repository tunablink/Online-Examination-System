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
import vn.edu.hanu.exam.exception.TeacherSubmissionException;
import vn.edu.hanu.exam.protocol.ClientMessage;
import vn.edu.hanu.exam.protocol.ServerMessage;
import vn.edu.hanu.exam.service.LoggedInUser;
import vn.edu.hanu.exam.service.submission.TeacherSubmissionService;
import vn.edu.hanu.exam.session.AuthenticatedSessionRegistry;
import vn.edu.hanu.exam.websocket.dto.GetExamSubmissionsPayload;
import vn.edu.hanu.exam.websocket.dto.GetSubmissionResultPayload;

@Component
public class TeacherSubmissionMessageHandler {
    static final String TYPE_EXAM_SUBMISSIONS = "EXAM_SUBMISSIONS";
    static final String TYPE_SUBMISSION_RESULT = "SUBMISSION_RESULT";
    static final String CODE_AUTHENTICATION_REQUIRED =
            "AUTHENTICATION_REQUIRED";
    static final String CODE_FORBIDDEN = "FORBIDDEN";
    static final String CODE_INVALID_PAYLOAD = "INVALID_PAYLOAD";
    static final String CODE_INTERNAL_SERVER_ERROR =
            "INTERNAL_SERVER_ERROR";

    private static final Logger LOGGER = LoggerFactory.getLogger(
            TeacherSubmissionMessageHandler.class);

    private final TeacherSubmissionService service;
    private final AuthenticatedSessionRegistry sessionRegistry;
    private final JsonMapper jsonMapper;

    public TeacherSubmissionMessageHandler(
            TeacherSubmissionService service,
            AuthenticatedSessionRegistry sessionRegistry,
            JsonMapper jsonMapper) {
        this.service = service;
        this.sessionRegistry = sessionRegistry;
        this.jsonMapper = jsonMapper;
    }

    public ServerMessage handleList(
            WebSocketSession session,
            ClientMessage message) {
        return handleList(
                session.getId(),
                message.requestId(),
                message.payload());
    }

    public ServerMessage handleResult(
            WebSocketSession session,
            ClientMessage message) {
        return handleResult(
                session.getId(),
                message.requestId(),
                message.payload());
    }

    public ServerMessage handleList(
            String sessionId,
            String requestId,
            Map<String, Object> payload) {
        return withTeacher(sessionId, requestId, teacher -> {
            GetExamSubmissionsPayload input = convertPayload(
                    payload,
                    "examId",
                    GetExamSubmissionsPayload.class);

            if (input.examId() == null) {
                throw new InvalidPayloadException();
            }

            return ServerMessage.success(
                    requestId,
                    TYPE_EXAM_SUBMISSIONS,
                    service.findExamSubmissions(input.examId(), teacher.id()));
        });
    }

    public ServerMessage handleResult(
            String sessionId,
            String requestId,
            Map<String, Object> payload) {
        return withTeacher(sessionId, requestId, teacher -> {
            GetSubmissionResultPayload input = convertPayload(
                    payload,
                    "attemptId",
                    GetSubmissionResultPayload.class);

            if (input.attemptId() == null) {
                throw new InvalidPayloadException();
            }

            return ServerMessage.success(
                    requestId,
                    TYPE_SUBMISSION_RESULT,
                    service.findSubmissionResult(
                            input.attemptId(),
                            teacher.id()));
        });
    }

    private ServerMessage withTeacher(
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

        if (user.role() != UserRole.TEACHER) {
            return ServerMessage.error(
                    requestId,
                    CODE_FORBIDDEN,
                    "This operation is only available to teachers.");
        }

        try {
            return operation.apply(user);
        } catch (InvalidPayloadException exception) {
            return ServerMessage.error(
                    requestId,
                    CODE_INVALID_PAYLOAD,
                    "The request payload is invalid.");
        } catch (TeacherSubmissionException exception) {
            LOGGER.info(
                    "Teacher submission operation rejected: requestId={}, code={}",
                    requestId,
                    exception.code());

            return ServerMessage.error(
                    requestId,
                    exception.code(),
                    exception.getMessage());
        } catch (RuntimeException exception) {
            LOGGER.error(
                    "Unexpected teacher submission error: requestId={}",
                    requestId,
                    exception);

            return ServerMessage.error(
                    requestId,
                    CODE_INTERNAL_SERVER_ERROR,
                    "An unexpected error occurred.");
        }
    }

    private <T> T convertPayload(
            Map<String, Object> payload,
            String idField,
            Class<T> type) {
        if (payload == null || !isIntegralNumber(payload.get(idField))) {
            throw new InvalidPayloadException();
        }

        try {
            return jsonMapper.convertValue(payload, type);
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

    private static final class InvalidPayloadException
            extends RuntimeException {
    }
}
