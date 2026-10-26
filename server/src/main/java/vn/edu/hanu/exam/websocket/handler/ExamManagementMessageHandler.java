package vn.edu.hanu.exam.websocket.handler;

import java.util.Map;
import java.util.function.Function;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;
import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.exception.ExamManagementException;
import vn.edu.hanu.exam.protocol.ClientMessage;
import vn.edu.hanu.exam.protocol.ServerMessage;
import vn.edu.hanu.exam.service.LoggedInUser;
import vn.edu.hanu.exam.service.exam.CreateExamCommand;
import vn.edu.hanu.exam.service.exam.ExamManagementService;
import vn.edu.hanu.exam.service.exam.UpdateExamCommand;
import vn.edu.hanu.exam.session.AuthenticatedSessionRegistry;
import vn.edu.hanu.exam.websocket.dto.CloseExamPayload;
import vn.edu.hanu.exam.websocket.dto.CreateExamPayload;
import vn.edu.hanu.exam.websocket.dto.DeleteExamPayload;
import vn.edu.hanu.exam.websocket.dto.GetExamPayload;
import vn.edu.hanu.exam.websocket.dto.PublishExamPayload;
import vn.edu.hanu.exam.websocket.dto.UpdateExamPayload;

@Component
public class ExamManagementMessageHandler {
    static final String TYPE_EXAM_CREATED = "EXAM_CREATED";
    static final String TYPE_TEACHER_EXAMS = "TEACHER_EXAMS";
    static final String TYPE_EXAM_DETAILS = "EXAM_DETAILS";
    static final String TYPE_EXAM_UPDATED = "EXAM_UPDATED";
    static final String TYPE_EXAM_PUBLISHED = "EXAM_PUBLISHED";
    static final String TYPE_EXAM_CLOSED = "EXAM_CLOSED";
    static final String TYPE_EXAM_DELETED = "EXAM_DELETED";
    static final String CODE_AUTHENTICATION_REQUIRED = "AUTHENTICATION_REQUIRED";
    static final String CODE_FORBIDDEN = "FORBIDDEN";
    static final String CODE_INVALID_PAYLOAD = "INVALID_PAYLOAD";
    static final String CODE_INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR";

    private static final Logger LOGGER = LoggerFactory.getLogger(ExamManagementMessageHandler.class);

    private final ExamManagementService examService;
    private final AuthenticatedSessionRegistry sessionRegistry;
    private final JsonMapper jsonMapper;

    public ExamManagementMessageHandler(
            ExamManagementService examService,
            AuthenticatedSessionRegistry sessionRegistry,
            JsonMapper jsonMapper) {
        this.examService = examService;
        this.sessionRegistry = sessionRegistry;
        this.jsonMapper = jsonMapper;
    }

    public ServerMessage handleCreate(WebSocketSession session, ClientMessage message) {
        return handleCreate(session.getId(), message.requestId(), message.payload());
    }

    public ServerMessage handleList(WebSocketSession session, ClientMessage message) {
        return handleList(session.getId(), message.requestId());
    }

    public ServerMessage handleGet(WebSocketSession session, ClientMessage message) {
        return handleGet(session.getId(), message.requestId(), message.payload());
    }

    public ServerMessage handleCreate(String sessionId, String requestId, Map<String, Object> payload) {
        return withTeacher(sessionId, requestId, teacher -> {
            CreateExamPayload input = convertPayload(payload, CreateExamPayload.class);
            return ServerMessage.success(requestId, TYPE_EXAM_CREATED, examService.createExam(
                    teacher.id(),
                    new CreateExamCommand(input.title(), input.description(), input.durationMinutes())));
        });
    }

    public ServerMessage handleList(String sessionId, String requestId) {
        return withTeacher(sessionId, requestId, teacher -> ServerMessage.success(
                requestId, TYPE_TEACHER_EXAMS, examService.findAllByCreatedBy(teacher.id())));
    }

    public ServerMessage handleGet(String sessionId, String requestId, Map<String, Object> payload) {
        return withTeacher(sessionId, requestId, teacher -> {
            GetExamPayload input = convertPayload(payload, GetExamPayload.class);
            return ServerMessage.success(
                    requestId,
                    TYPE_EXAM_DETAILS,
                    examService.findByIdAndCreatedBy(input.examId(), teacher.id()));
        });
    }

    public ServerMessage handleUpdate(
            WebSocketSession session,
            ClientMessage message) {
        return handleUpdate(
                session.getId(),
                message.requestId(),
                message.payload());
    }

    public ServerMessage handleUpdate(
            String sessionId,
            String requestId,
            Map<String, Object> payload) {
        return withTeacher(
                sessionId,
                requestId,
                teacher -> {
                    UpdateExamPayload input = convertPayload(
                            payload,
                            UpdateExamPayload.class);

                    return ServerMessage.success(
                            requestId,
                            TYPE_EXAM_UPDATED,
                            examService.updateDraftExam(
                                    input.examId(),
                                    teacher.id(),
                                    new UpdateExamCommand(
                                            input.title(),
                                            input.description(),
                                            input.durationMinutes())));
                });
    }

    public ServerMessage handlePublish(
            WebSocketSession session,
            ClientMessage message) {
        return handlePublish(
                session.getId(),
                message.requestId(),
                message.payload());
    }

    public ServerMessage handlePublish(
            String sessionId,
            String requestId,
            Map<String, Object> payload) {
        return withTeacher(sessionId, requestId, teacher -> {
            PublishExamPayload input = convertPayload(payload, PublishExamPayload.class);
            return ServerMessage.success(
                    requestId,
                    TYPE_EXAM_PUBLISHED,
                    examService.publishExam(input.examId(), teacher.id()));
        });
    }

    public ServerMessage handleClose(
            WebSocketSession session,
            ClientMessage message) {
        return handleClose(
                session.getId(),
                message.requestId(),
                message.payload());
    }

    public ServerMessage handleClose(
            String sessionId,
            String requestId,
            Map<String, Object> payload) {
        return withTeacher(sessionId, requestId, teacher -> {
            CloseExamPayload input = convertPayload(payload, CloseExamPayload.class);
            return ServerMessage.success(
                    requestId,
                    TYPE_EXAM_CLOSED,
                    examService.closeExam(input.examId(), teacher.id()));
        });
    }

    public ServerMessage handleDelete(
            WebSocketSession session,
            ClientMessage message) {
        return handleDelete(
                session.getId(),
                message.requestId(),
                message.payload());
    }

    public ServerMessage handleDelete(
            String sessionId,
            String requestId,
            Map<String, Object> payload) {
        return withTeacher(sessionId, requestId, teacher -> {
            DeleteExamPayload input = convertPayload(payload, DeleteExamPayload.class);
            return ServerMessage.success(
                    requestId,
                    TYPE_EXAM_DELETED,
                    examService.deleteDraftExam(input.examId(), teacher.id()));
        });
    }

    private ServerMessage withTeacher(
            String sessionId,
            String requestId,
            Function<LoggedInUser, ServerMessage> operation) {
        LoggedInUser user = sessionRegistry.findUser(sessionId).orElse(null);
        if (user == null) {
            return ServerMessage.error(requestId, CODE_AUTHENTICATION_REQUIRED, "Authentication is required.");
        }
        if (user.role() != UserRole.TEACHER) {
            return ServerMessage.error(requestId, CODE_FORBIDDEN, "This operation is only available to teachers.");
        }
        try {
            return operation.apply(user);
        } catch (InvalidPayloadException exception) {
            return ServerMessage.error(requestId, CODE_INVALID_PAYLOAD, "The request payload is invalid.");
        } catch (ExamManagementException exception) {
            LOGGER.info("Exam operation rejected: requestId={}, code={}", requestId, exception.code());
            return ServerMessage.error(requestId, exception.code(), exception.getMessage());
        } catch (RuntimeException exception) {
            LOGGER.error("Unexpected exam operation error: requestId={}", requestId, exception);
            return ServerMessage.error(
                    requestId,
                    CODE_INTERNAL_SERVER_ERROR,
                    "An unexpected error occurred.");
        }
    }

    private <T> T convertPayload(Map<String, Object> payload, Class<T> targetType) {
        if (payload == null) {
            throw new InvalidPayloadException();
        }
        try {
            return jsonMapper.convertValue(payload, targetType);
        } catch (JacksonException | IllegalArgumentException exception) {
            throw new InvalidPayloadException();
        }
    }

    private static final class InvalidPayloadException extends RuntimeException {
    }
}
