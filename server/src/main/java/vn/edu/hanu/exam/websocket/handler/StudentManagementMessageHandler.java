package vn.edu.hanu.exam.websocket.handler;

import java.math.BigInteger;
import java.util.Map;
import java.util.function.Function;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.socket.WebSocketSession;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;
import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.exception.StudentManagementException;
import vn.edu.hanu.exam.exception.RegistrationException;
import vn.edu.hanu.exam.protocol.ClientMessage;
import vn.edu.hanu.exam.protocol.ServerMessage;
import vn.edu.hanu.exam.service.LoggedInUser;
import vn.edu.hanu.exam.service.RegisterUserCommand;
import vn.edu.hanu.exam.service.student.StudentAccountService;
import vn.edu.hanu.exam.service.student.StudentManagementService;
import vn.edu.hanu.exam.session.AuthenticatedSessionRegistry;
import vn.edu.hanu.exam.websocket.dto.GetStudentPayload;

@Component
public class StudentManagementMessageHandler {
    static final String TYPE_STUDENTS = "STUDENTS";
    static final String TYPE_STUDENT_DETAILS = "STUDENT_DETAILS";
    static final String CODE_AUTHENTICATION_REQUIRED = "AUTHENTICATION_REQUIRED";
    static final String CODE_FORBIDDEN = "FORBIDDEN";
    static final String CODE_INVALID_PAYLOAD = "INVALID_PAYLOAD";
    static final String CODE_INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR";

    private static final Logger LOGGER = LoggerFactory.getLogger(StudentManagementMessageHandler.class);

    private final StudentManagementService studentService;
    private final AuthenticatedSessionRegistry sessionRegistry;
    private final JsonMapper jsonMapper;
    private final StudentAccountService accountService;

    @Autowired
    public StudentManagementMessageHandler(
            StudentManagementService studentService,
            AuthenticatedSessionRegistry sessionRegistry,
            JsonMapper jsonMapper,
            StudentAccountService accountService) {
        this.studentService = studentService;
        this.sessionRegistry = sessionRegistry;
        this.jsonMapper = jsonMapper;
        this.accountService = accountService;
    }

    public StudentManagementMessageHandler(StudentManagementService studentService,
            AuthenticatedSessionRegistry sessionRegistry, JsonMapper jsonMapper) {
        this(studentService, sessionRegistry, jsonMapper, null);
    }

    public ServerMessage handleList(WebSocketSession session, ClientMessage message) {
        return handleList(session.getId(), message.requestId());
    }

    public ServerMessage handleGet(WebSocketSession session, ClientMessage message) {
        return handleGet(session.getId(), message.requestId(), message.payload());
    }

    public ServerMessage handleCreate(WebSocketSession session, ClientMessage message) {
        return handleCreate(session.getId(), message.requestId(), message.payload());
    }

    public ServerMessage handleImport(WebSocketSession session, ClientMessage message) {
        return handleImport(session.getId(), message.requestId(), message.payload());
    }

    public ServerMessage handleUpdate(WebSocketSession session, ClientMessage message) {
        return handleUpdate(session.getId(), message.requestId(), message.payload());
    }

    public ServerMessage handleDelete(WebSocketSession session, ClientMessage message) {
        return handleDelete(session.getId(), message.requestId(), message.payload());
    }

    public ServerMessage handleCreate(String sessionId, String requestId, Map<String, Object> payload) {
        return withTeacher(sessionId, requestId, teacher -> {
            if (payload == null) throw new InvalidPayloadException();
            String institutionalId = stringField(payload, "institutionalId");
            String fullName = stringField(payload, "fullName");
            String email = stringField(payload, "email");
            String password = stringField(payload, "password");
            String confirmPassword = stringField(payload, "confirmPassword");
            if (!password.equals(confirmPassword)) throw new RegistrationException("PASSWORD_MISMATCH", "Password confirmation does not match.");
            String department = stringField(payload, "department");
            if (department.isBlank()) throw new RegistrationException("INVALID_DEPARTMENT", "Department is required.");
            return ServerMessage.success(requestId, "STUDENT_CREATED", accountService.create(
                    new RegisterUserCommand(institutionalId, password, fullName, email), department));
        });
    }

    public ServerMessage handleImport(String sessionId, String requestId, Map<String, Object> payload) {
        return withTeacher(sessionId, requestId, teacher -> {
            if (payload == null) throw new InvalidPayloadException();
            return ServerMessage.success(requestId, "STUDENTS_IMPORTED",
                    accountService.importXlsx(stringField(payload, "contentBase64")));
        });
    }

    public ServerMessage handleUpdate(String sessionId, String requestId, Map<String, Object> payload) {
        return withTeacher(sessionId, requestId, teacher -> {
            if (payload == null || !isIntegralNumber(payload.get("studentId"))) throw new InvalidPayloadException();
            long studentId = ((Number) payload.get("studentId")).longValue();
            String department = stringField(payload, "department");
            return ServerMessage.success(requestId, "STUDENT_UPDATED", studentService.updateStudent(studentId,
                    stringField(payload, "institutionalId"), stringField(payload, "fullName"), stringField(payload, "email"),
                    department, stringField(payload, "password"), stringField(payload, "confirmPassword")));
        });
    }

    public ServerMessage handleDelete(String sessionId, String requestId, Map<String, Object> payload) {
        return withTeacher(sessionId, requestId, teacher -> {
            if (payload == null || !isIntegralNumber(payload.get("studentId"))) throw new InvalidPayloadException();
            long studentId = ((Number) payload.get("studentId")).longValue();
            studentService.deactivateStudent(studentId);
            return ServerMessage.success(requestId, "STUDENT_DELETED", Map.of("studentId", studentId));
        });
    }

    private static String stringField(Map<String, Object> payload, String name) {
        Object value = payload.get(name);
        if (!(value instanceof String text)) throw new InvalidPayloadException();
        return text;
    }

    public ServerMessage handleList(String sessionId, String requestId) {
        return withTeacher(sessionId, requestId, teacher -> ServerMessage.success(
                requestId,
                TYPE_STUDENTS,
                studentService.findAllStudents()));
    }

    public ServerMessage handleGet(String sessionId, String requestId, Map<String, Object> payload) {
        return withTeacher(sessionId, requestId, teacher -> {
            GetStudentPayload input = convertDetailPayload(payload);
            return ServerMessage.success(
                    requestId,
                    TYPE_STUDENT_DETAILS,
                    studentService.findStudentById(input.studentId()));
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
        } catch (StudentManagementException exception) {
            LOGGER.info("Student directory operation rejected: requestId={}, code={}",
                    requestId, exception.code());
            return ServerMessage.error(requestId, exception.code(), exception.getMessage());
        } catch (RegistrationException exception) {
            return ServerMessage.error(requestId, exception.code(), exception.getMessage());
        } catch (RuntimeException exception) {
            LOGGER.error("Unexpected student directory error: requestId={}", requestId, exception);
            return ServerMessage.error(
                    requestId,
                    CODE_INTERNAL_SERVER_ERROR,
                    "An unexpected error occurred.");
        }
    }

    private GetStudentPayload convertDetailPayload(Map<String, Object> payload) {
        if (payload == null || !isIntegralNumber(payload.get("studentId"))) {
            throw new InvalidPayloadException();
        }

        try {
            GetStudentPayload input = jsonMapper.convertValue(payload, GetStudentPayload.class);
            if (input.studentId() == null) {
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
