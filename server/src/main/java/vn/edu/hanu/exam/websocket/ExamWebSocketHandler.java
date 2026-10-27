package vn.edu.hanu.exam.websocket;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

import vn.edu.hanu.exam.exception.AuthenticationException;
import vn.edu.hanu.exam.protocol.ClientMessage;
import vn.edu.hanu.exam.protocol.MessageType;
import vn.edu.hanu.exam.protocol.ServerMessage;
import vn.edu.hanu.exam.service.LoggedInUser;
import vn.edu.hanu.exam.service.LoginCommand;
import vn.edu.hanu.exam.service.LoginService;
import vn.edu.hanu.exam.websocket.handler.AttemptMessageHandler;
import vn.edu.hanu.exam.websocket.handler.ExamManagementMessageHandler;
import vn.edu.hanu.exam.websocket.handler.QuestionManagementMessageHandler;
import vn.edu.hanu.exam.websocket.handler.RegistrationMessageHandler;
import vn.edu.hanu.exam.websocket.handler.ProfileManagementMessageHandler;
import vn.edu.hanu.exam.websocket.handler.StudentExamCatalogMessageHandler;
import vn.edu.hanu.exam.websocket.handler.StudentManagementMessageHandler;
import vn.edu.hanu.exam.websocket.handler.TeacherDashboardMessageHandler;
import vn.edu.hanu.exam.websocket.handler.TeacherSubmissionMessageHandler;
import vn.edu.hanu.exam.session.AuthenticatedSessionRegistry;

@Component
public final class ExamWebSocketHandler extends TextWebSocketHandler {

        private static final Logger LOGGER = LoggerFactory.getLogger(ExamWebSocketHandler.class);

        private final JsonMapper jsonMapper;

        private final RegistrationMessageHandler registrationMessageHandler;

        private final ExamManagementMessageHandler examManagementMessageHandler;

        private final QuestionManagementMessageHandler questionManagementMessageHandler;

        private final StudentExamCatalogMessageHandler studentExamCatalogMessageHandler;

        private final AttemptMessageHandler attemptMessageHandler;

        private final StudentManagementMessageHandler studentManagementMessageHandler;

        private final TeacherDashboardMessageHandler teacherDashboardMessageHandler;

        private final ProfileManagementMessageHandler profileManagementMessageHandler;

        private final TeacherSubmissionMessageHandler teacherSubmissionMessageHandler;

        private final LoginService loginService;
        private final AuthenticatedSessionRegistry authenticatedSessionRegistry;

        @Autowired
        public ExamWebSocketHandler(
                        JsonMapper jsonMapper,
                        RegistrationMessageHandler registrationMessageHandler,
                        ExamManagementMessageHandler examManagementMessageHandler,
                        QuestionManagementMessageHandler questionManagementMessageHandler,
                        StudentExamCatalogMessageHandler studentExamCatalogMessageHandler,
                        AttemptMessageHandler attemptMessageHandler,
                        StudentManagementMessageHandler studentManagementMessageHandler,
                        TeacherDashboardMessageHandler teacherDashboardMessageHandler,
                        ProfileManagementMessageHandler profileManagementMessageHandler,
                        TeacherSubmissionMessageHandler teacherSubmissionMessageHandler,
                        LoginService loginService,
                        AuthenticatedSessionRegistry authenticatedSessionRegistry) {
                this.jsonMapper = jsonMapper;
                this.registrationMessageHandler = registrationMessageHandler;
                this.examManagementMessageHandler = examManagementMessageHandler;
                this.questionManagementMessageHandler = questionManagementMessageHandler;
                this.studentExamCatalogMessageHandler = studentExamCatalogMessageHandler;
                this.attemptMessageHandler = attemptMessageHandler;
                this.studentManagementMessageHandler = studentManagementMessageHandler;
                this.teacherDashboardMessageHandler = teacherDashboardMessageHandler;
                this.profileManagementMessageHandler = profileManagementMessageHandler;
                this.teacherSubmissionMessageHandler = teacherSubmissionMessageHandler;
                this.loginService = loginService;
                this.authenticatedSessionRegistry = authenticatedSessionRegistry;
        }

        public ExamWebSocketHandler(
                        JsonMapper jsonMapper,
                        RegistrationMessageHandler registrationMessageHandler,
                        ExamManagementMessageHandler examManagementMessageHandler,
                        QuestionManagementMessageHandler questionManagementMessageHandler,
                        StudentExamCatalogMessageHandler studentExamCatalogMessageHandler,
                        LoginService loginService,
                        AuthenticatedSessionRegistry authenticatedSessionRegistry) {
                this(
                                jsonMapper,
                                registrationMessageHandler,
                                examManagementMessageHandler,
                                questionManagementMessageHandler,
                                studentExamCatalogMessageHandler,
                                null,
                                null,
                                null,
                                null,
                                null,
                                loginService,
                                authenticatedSessionRegistry);
        }

        @Override
        public void afterConnectionEstablished(WebSocketSession session) throws Exception {
                LOGGER.info("WebSocket connected: sessionId={}", session.getId());

                ServerMessage connectedMessage = ServerMessage.event(MessageType.CONNECTED.name(), Map.of(
                                "message", "Connected to Online Examination Server",
                                "sessionId", session.getId(),
                                "serverTime", Instant.now().toString()));

                sendMessage(session, connectedMessage);
        }

        @Override
        protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
                ClientMessage clientMessage;

                try {
                        clientMessage = jsonMapper.readValue(message.getPayload(), ClientMessage.class);
                } catch (JacksonException exception) {
                        LOGGER.warn("Invalid JSON received: sessionId={}", session.getId());

                        sendMessage(session,
                                        ServerMessage.error(null, "INVALID_JSON", "The message is not valid JSON."));
                        return;
                }

                if (clientMessage.type() == null || clientMessage.type().isBlank()) {
                        LOGGER.warn("Missing message type: sessionId={}, requestId={}",
                                        session.getId(), clientMessage.requestId());

                        sendMessage(session, ServerMessage.error(clientMessage.requestId(), "MISSING_MESSAGE_TYPE",
                                        "The message type is required."));

                        return;
                }

                Optional<MessageType> parsedMessageType = MessageType.fromWireValue(clientMessage.type());

                if (parsedMessageType.isEmpty()) {
                        sendUnsupportedMessageType(session, clientMessage);
                        return;
                }

                MessageType messageType = parsedMessageType.orElseThrow();

                if (!messageType.isAcceptedFromClient()) {
                        sendUnsupportedMessageType(session, clientMessage);
                        return;
                }

                try {
                        dispatchMessage(session, clientMessage, messageType);
                } catch (RuntimeException exception) {
                        LOGGER.error(
                                        "Unexpected error processing WebSocket message: "
                                                        + "sessionId={}, requestId={}, type={}",
                                        session.getId(),
                                        clientMessage.requestId(),
                                        messageType,
                                        exception);

                        sendMessage(session, ServerMessage.error(clientMessage.requestId(), "INTERNAL_SERVER_ERROR",
                                        "The server could not process the request."));
                }
        }

        private void dispatchMessage(WebSocketSession session, ClientMessage clientMessage, MessageType messageType)
                        throws Exception {
                switch (messageType) {
                        case PING ->
                                handlePing(
                                                session,
                                                clientMessage);

                        case REGISTER ->
                                handleRegister(
                                                session,
                                                clientMessage);

                        case LOGIN ->
                                handleLogin(
                                                session,
                                                clientMessage);

                        case GET_PROFILE ->
                                sendMessage(
                                                session,
                                                profileManagementMessageHandler.handleGet(
                                                                session,
                                                                clientMessage));

                        case UPDATE_PROFILE ->
                                sendMessage(
                                                session,
                                                profileManagementMessageHandler.handleUpdate(
                                                                session,
                                                                clientMessage));

                        case CHANGE_PASSWORD ->
                                sendMessage(
                                                session,
                                                profileManagementMessageHandler.handleChangePassword(
                                                                session,
                                                                clientMessage));

                        case GET_STUDENTS ->
                                sendMessage(
                                                session,
                                                studentManagementMessageHandler.handleList(
                                                                session,
                                                                clientMessage));

                        case GET_STUDENT ->
                                sendMessage(
                                                session,
                                                studentManagementMessageHandler.handleGet(
                                                                session,
                                                                clientMessage));

                        case GET_TEACHER_DASHBOARD ->
                                sendMessage(
                                                session,
                                                teacherDashboardMessageHandler.handle(
                                                                session,
                                                                clientMessage));

                        case CREATE_EXAM ->
                                sendMessage(
                                                session,
                                                examManagementMessageHandler.handleCreate(
                                                                session,
                                                                clientMessage));

                        case GET_TEACHER_EXAMS ->
                                sendMessage(
                                                session,
                                                examManagementMessageHandler.handleList(
                                                                session,
                                                                clientMessage));

                        case GET_EXAM ->
                                sendMessage(
                                                session,
                                                examManagementMessageHandler.handleGet(
                                                                session,
                                                                clientMessage));

                        case UPDATE_EXAM ->
                                sendMessage(
                                                session,
                                                examManagementMessageHandler.handleUpdate(
                                                                session,
                                                                clientMessage));

                        case PUBLISH_EXAM ->
                                sendMessage(
                                                session,
                                                examManagementMessageHandler.handlePublish(
                                                                session,
                                                                clientMessage));

                        case CLOSE_EXAM ->
                                sendMessage(
                                                session,
                                                examManagementMessageHandler.handleClose(
                                                                session,
                                                                clientMessage));

                        case DELETE_EXAM ->
                                sendMessage(
                                                session,
                                                examManagementMessageHandler.handleDelete(
                                                                session,
                                                                clientMessage));

                        case CREATE_QUESTION ->
                                sendMessage(
                                                session,
                                                questionManagementMessageHandler.handleCreate(
                                                                session,
                                                                clientMessage));

                        case UPDATE_QUESTION ->
                                sendMessage(
                                                session,
                                                questionManagementMessageHandler.handleUpdate(
                                                                session,
                                                                clientMessage));

                        case DELETE_QUESTION ->
                                sendMessage(
                                                session,
                                                questionManagementMessageHandler.handleDelete(
                                                                session,
                                                                clientMessage));

                        case GET_EXAM_QUESTIONS ->
                                sendMessage(
                                                session,
                                                questionManagementMessageHandler.handleList(
                                                                session,
                                                                clientMessage));

                        case GET_AVAILABLE_EXAMS ->
                                sendMessage(
                                                session,
                                                studentExamCatalogMessageHandler.handleList(
                                                                session,
                                                                clientMessage));

                        case GET_AVAILABLE_EXAM ->
                                sendMessage(
                                                session,
                                                studentExamCatalogMessageHandler.handleGet(
                                                                session,
                                                                clientMessage));

                        case START_EXAM ->
                                sendMessage(
                                                session,
                                                attemptMessageHandler.handleStart(
                                                                session,
                                                                clientMessage));

                        case GET_EXAM_ATTEMPT ->
                                sendMessage(
                                        session,
                                        attemptMessageHandler.handleGet(
                                                session,
                                                clientMessage));

                        case SAVE_ANSWER ->
                                sendMessage(
                                        session,
                                        attemptMessageHandler.handleSaveAnswer(
                                                session,
                                                clientMessage));

                        case SUBMIT_EXAM ->
                                sendMessage(
                                        session,
                                        attemptMessageHandler.handleSubmit(
                                                session,
                                                clientMessage));

                        case GET_ATTEMPT_HISTORY ->
                                sendMessage(
                                        session,
                                        attemptMessageHandler.handleHistory(
                                                session,
                                                clientMessage));

                        case GET_ATTEMPT_RESULT ->
                                sendMessage(
                                        session,
                                        attemptMessageHandler.handleResult(
                                                session,
                                                clientMessage));

                        case GET_EXAM_SUBMISSIONS ->
                                sendMessage(
                                        session,
                                        teacherSubmissionMessageHandler.handleList(
                                                session,
                                                clientMessage));

                        case GET_SUBMISSION_RESULT ->
                                sendMessage(
                                        session,
                                        teacherSubmissionMessageHandler.handleResult(
                                                session,
                                                clientMessage));

                        default ->
                                sendUnsupportedMessageType(
                                                session,
                                                clientMessage);
                }
        }

        private void handlePing(WebSocketSession session, ClientMessage clientMessage) throws Exception {
                LOGGER.info("PING received: sessionId={}, requestId={}", session.getId(), clientMessage.requestId());

                ServerMessage pongMessage = ServerMessage.success(clientMessage.requestId(), MessageType.PONG.name(),
                                Map.of("serverTime", Instant.now().toString()));

                sendMessage(session, pongMessage);
        }

        private void handleRegister(WebSocketSession session, ClientMessage clientMessage) throws Exception {
                ServerMessage response = registrationMessageHandler.handle(clientMessage.requestId(),
                                clientMessage.payload());

                LOGGER.info(
                                "REGISTER processed: sessionId={}, requestId={}",
                                session.getId(),
                                clientMessage.requestId());

                sendMessage(session, response);
        }

        private void handleLogin(WebSocketSession session, ClientMessage clientMessage) throws Exception {
                String username = readString(clientMessage.payload(), "username");

                String password = readString(clientMessage.payload(), "password");

                try {
                        LoginCommand command = new LoginCommand(username, password);

                        LoggedInUser loggedInUser = loginService.login(command);

                        authenticatedSessionRegistry.authenticate(session.getId(), loggedInUser);

                        LOGGER.info(
                                        "User logged in: "
                                                        + "sessionId={}, requestId={}, userId={}",
                                        session.getId(),
                                        clientMessage.requestId(),
                                        loggedInUser.id());

                        sendMessage(
                                        session,
                                        ServerMessage.success(
                                                        clientMessage.requestId(),
                                                        MessageType.LOGGED_IN.name(),
                                                        loggedInUser));
                } catch (IllegalArgumentException exception) {
                        LOGGER.info(
                                        "Login rejected because payload is invalid: "
                                                        + "sessionId={}, requestId={}",
                                        session.getId(),
                                        clientMessage.requestId());

                        sendMessage(
                                        session,
                                        ServerMessage.error(
                                                        clientMessage.requestId(),
                                                        "INVALID_CREDENTIALS",
                                                        "Invalid username or password."));
                } catch (AuthenticationException exception) {
                        LOGGER.info(
                                        "Login rejected: "
                                                        + "sessionId={}, requestId={}, code={}",
                                        session.getId(),
                                        clientMessage.requestId(),
                                        exception.code());

                        sendMessage(
                                        session,
                                        ServerMessage.error(
                                                        clientMessage.requestId(),
                                                        exception.code(),
                                                        exception.getMessage()));
                }
        }

        private static String readString(Map<String, Object> payload, String fieldName) {
                if (payload == null) {
                        return null;
                }

                Object value = payload.get(fieldName);

                if (value instanceof String stringValue) {
                        return stringValue;
                }

                return null;
        }

        private void sendUnsupportedMessageType(WebSocketSession session, ClientMessage clientMessage)
                        throws Exception {
                LOGGER.warn(
                                "Unsupported message type: "
                                                + "sessionId={}, requestId={}, type={}",
                                session.getId(),
                                clientMessage.requestId(),
                                clientMessage.type());

                sendMessage(
                                session,
                                ServerMessage.error(
                                                clientMessage.requestId(),
                                                "UNSUPPORTED_MESSAGE_TYPE",
                                                "The message type is not supported."));
        }

        private void sendMessage(WebSocketSession session, ServerMessage serverMessage) throws Exception {
                String json = jsonMapper.writeValueAsString(serverMessage);

                session.sendMessage(new TextMessage(json));
        }

        @Override
        public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
                authenticatedSessionRegistry.remove(session.getId());
                LOGGER.info(
                                "WebSocket disconnected: "
                                                + "sessionId={}, code={}, reason={}",
                                session.getId(),
                                status.getCode(),
                                status.getReason());
        }
}
