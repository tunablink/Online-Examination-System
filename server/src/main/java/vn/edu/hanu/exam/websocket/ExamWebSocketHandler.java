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
import vn.edu.hanu.exam.websocket.handler.TeacherSubmissionMessageHandler;

@Component
public final class ExamWebSocketHandler extends TextWebSocketHandler {

    private MonitoringPushHub monitoringPushHub;

    @Autowired
    void setMonitoringPushHub(MonitoringPushHub hub) { this.monitoringPushHub = hub; }

    private vn.edu.hanu.exam.session.SessionResumeService resumeService;

    @Autowired
    void setSessionResumeService(vn.edu.hanu.exam.session.SessionResumeService service) { this.resumeService = service; }

    private static final Logger LOGGER =
            LoggerFactory.getLogger(ExamWebSocketHandler.class);

    private final JsonMapper jsonMapper;

    private final RegistrationMessageHandler registrationMessageHandler;

    private final ExamManagementMessageHandler examManagementMessageHandler;

    private final QuestionManagementMessageHandler questionManagementMessageHandler;

    private final StudentExamCatalogMessageHandler studentExamCatalogMessageHandler;

    private final AttemptMessageHandler attemptMessageHandler;

    private final StudentManagementMessageHandler studentManagementMessageHandler;

    private final TeacherDashboardMessageHandler teacherDashboardMessageHandler;

    private final ProfileManagementMessageHandler profileManagementMessageHandler;

    private final MonitoringMessageHandler monitoringMessageHandler;

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
            MonitoringMessageHandler monitoringMessageHandler,
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
        this.monitoringMessageHandler = monitoringMessageHandler;
        this.teacherSubmissionMessageHandler = teacherSubmissionMessageHandler;
        this.loginService = loginService;
        this.authenticatedSessionRegistry = authenticatedSessionRegistry;
    }

    /*
     * Constructor rút gọn được giữ lại cho các test cũ.
     *
     * Các handler không cần thiết cho nhóm test đó được truyền null.
     * MonitoringMessageHandler cũng phải có một vị trí null riêng để
     * khớp với constructor chính.
     */
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
            MonitoringMessageHandler monitoringMessageHandler,
            LoginService loginService,
            AuthenticatedSessionRegistry authenticatedSessionRegistry) {

        this(
                jsonMapper,
                registrationMessageHandler,
                examManagementMessageHandler,
                questionManagementMessageHandler,
                studentExamCatalogMessageHandler,
                attemptMessageHandler,
                studentManagementMessageHandler,
                teacherDashboardMessageHandler,
                profileManagementMessageHandler,
                monitoringMessageHandler,
                null,
                loginService,
                authenticatedSessionRegistry);
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
                null,
                loginService,
                authenticatedSessionRegistry);
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session)
            throws Exception {

        LOGGER.info(
                "WebSocket connected: sessionId={}",
                session.getId());

        ServerMessage connectedMessage =
                ServerMessage.event(
                        MessageType.CONNECTED.name(),
                        Map.of(
                                "message",
                                "Connected to Online Examination Server",
                                "sessionId",
                                session.getId(),
                                "serverTime",
                                Instant.now().toString()));

        sendMessage(session, connectedMessage);
    }

    @Override
    protected void handleTextMessage(
            WebSocketSession session,
            TextMessage message)
            throws Exception {

        ClientMessage clientMessage;

        try {
            clientMessage =
                    jsonMapper.readValue(
                            message.getPayload(),
                            ClientMessage.class);
        } catch (JacksonException exception) {
            LOGGER.warn(
                    "Invalid JSON received: sessionId={}",
                    session.getId());

            sendMessage(
                    session,
                    ServerMessage.error(
                            null,
                            "INVALID_JSON",
                            "The message is not valid JSON."));

            return;
        }

        if (clientMessage.type() == null
                || clientMessage.type().isBlank()) {

            LOGGER.warn(
                    "Missing message type: sessionId={}, requestId={}",
                    session.getId(),
                    clientMessage.requestId());

            sendMessage(
                    session,
                    ServerMessage.error(
                            clientMessage.requestId(),
                            "MISSING_MESSAGE_TYPE",
                            "The message type is required."));

            return;
        }

        Optional<MessageType> parsedMessageType =
                MessageType.fromWireValue(clientMessage.type());

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
            dispatchMessage(
                    session,
                    clientMessage,
                    messageType);
        } catch (RuntimeException exception) {
            LOGGER.error(
                    "Unexpected error processing WebSocket message: "
                            + "sessionId={}, requestId={}, type={}",
                    session.getId(),
                    clientMessage.requestId(),
                    messageType,
                    exception);

            sendMessage(
                    session,
                    ServerMessage.error(
                            clientMessage.requestId(),
                            "INTERNAL_SERVER_ERROR",
                            "The server could not process the request."));
        }
    }

    private void dispatchMessage(
            WebSocketSession session,
            ClientMessage clientMessage,
            MessageType messageType)
            throws Exception {

        synchronized (session) {
        if (resumeService != null && authenticatedSessionRegistry.isAuthenticated(session.getId())
                && !resumeService.isLive(session.getId())
                && messageType != MessageType.LOGIN && messageType != MessageType.RESUME_SESSION
                && messageType != MessageType.LOGOUT && messageType != MessageType.PING) {
            authenticatedSessionRegistry.remove(session.getId());
            if (monitoringPushHub != null) monitoringPushHub.remove(session.getId());
            sendMessage(session, ServerMessage.error(clientMessage.requestId(), "SESSION_INVALID", "Your session expired. Please sign in again."));
            return;
        }
        switch (messageType) {
            case RESUME_SESSION -> {
                try {
                    var details = resumeService.resume(session.getId(), readString(clientMessage.payload(), "sessionToken"));
                    authenticatedSessionRegistry.authenticate(session.getId(), new LoggedInUser(
                            details.id(), details.username(), details.fullName(), details.email(), details.role()));
                    if (monitoringPushHub != null) monitoringPushHub.remove(session.getId());
                    sendMessage(session, ServerMessage.success(clientMessage.requestId(), "SESSION_RESUMED", details));
                } catch (IllegalArgumentException exception) {
                    resumeService.revoke(session.getId());
                    authenticatedSessionRegistry.remove(session.getId());
                    if (monitoringPushHub != null) monitoringPushHub.remove(session.getId());
                    sendMessage(session, ServerMessage.error(clientMessage.requestId(), "SESSION_INVALID", "Your session expired. Please sign in again."));
                }
            }
            case LOGOUT -> {
                if (resumeService != null) resumeService.revoke(session.getId());
                authenticatedSessionRegistry.remove(session.getId());
                if (monitoringPushHub != null) monitoringPushHub.remove(session.getId());
                sendMessage(session, ServerMessage.success(clientMessage.requestId(), "LOGGED_OUT", Map.of()));
            }
            case GET_TEACHER_MONITORING -> sendMessage(
                    session, monitoringPushHub.overview(session, clientMessage));
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

            /*
             * Các message History/Result của main phải được giữ lại.
             */
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

            /*
             * Các message Monitoring của Hoàng Yến được thêm vào,
             * không thay thế History/Result.
             */
            case REPORT_ACTIVITY ->
                    sendMessage(
                            session,
                            monitoringMessageHandler.handleReportActivity(
                                    session,
                                    clientMessage));

            case GET_EXAM_MONITORING -> {
                ServerMessage response = monitoringMessageHandler.handleGetExamMonitoring(session, clientMessage);
                if (response.error() == null && monitoringPushHub != null
                        && response.data() instanceof vn.edu.hanu.exam.service.monitoring.ExamMonitoringSummary summary) {
                    monitoringPushHub.watch(session, summary.examId(), clientMessage.payload());
                }
                sendMessage(session, response);
            }

            default ->
                    sendUnsupportedMessageType(
                            session,
                            clientMessage);
        }
        }
    }

    private void handlePing(
            WebSocketSession session,
            ClientMessage clientMessage)
            throws Exception {

        LOGGER.info(
                "PING received: sessionId={}, requestId={}",
                session.getId(),
                clientMessage.requestId());

        ServerMessage pongMessage =
                ServerMessage.success(
                        clientMessage.requestId(),
                        MessageType.PONG.name(),
                        Map.of(
                                "serverTime",
                                Instant.now().toString()));

        sendMessage(session, pongMessage);
    }

    private void handleRegister(
            WebSocketSession session,
            ClientMessage clientMessage)
            throws Exception {

        var actor = authenticatedSessionRegistry.findUser(session.getId());
        if (actor.isEmpty()) {
            sendMessage(session, ServerMessage.error(clientMessage.requestId(),
                    "AUTHENTICATION_REQUIRED", "Please sign in to create a student account."));
            return;
        }
        if (actor.orElseThrow().role() != vn.edu.hanu.exam.domain.UserRole.TEACHER) {
            sendMessage(session, ServerMessage.error(clientMessage.requestId(),
                    "FORBIDDEN", "Only teachers can create student accounts."));
            return;
        }

        ServerMessage response =
                registrationMessageHandler.handle(
                        clientMessage.requestId(),
                        clientMessage.payload());

        LOGGER.info(
                "REGISTER processed: sessionId={}, requestId={}",
                session.getId(),
                clientMessage.requestId());

        sendMessage(session, response);
    }

    private void handleLogin(
            WebSocketSession session,
            ClientMessage clientMessage)
            throws Exception {

        String username =
                readString(
                        clientMessage.payload(),
                        "username");

        String password =
                readString(
                        clientMessage.payload(),
                        "password");

        try {
            LoginCommand command =
                    new LoginCommand(
                            username,
                            password);

            LoggedInUser loggedInUser =
                    loginService.login(command);

            Object loginDetails = resumeService == null ? loggedInUser : resumeService.issue(session.getId(), loggedInUser);
            authenticatedSessionRegistry.authenticate(
                    session.getId(),
                    loggedInUser);

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
                            loginDetails));
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

    private static String readString(
            Map<String, Object> payload,
            String fieldName) {

        if (payload == null) {
            return null;
        }

        Object value = payload.get(fieldName);

        if (value instanceof String stringValue) {
            return stringValue;
        }

        return null;
    }

    private void sendUnsupportedMessageType(
            WebSocketSession session,
            ClientMessage clientMessage)
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

    private void sendMessage(
            WebSocketSession session,
            ServerMessage serverMessage)
            throws Exception {

        String json =
                jsonMapper.writeValueAsString(serverMessage);

        synchronized (session) {
            session.sendMessage(new TextMessage(json));
        }
    }

    @Override
    public void afterConnectionClosed(
            WebSocketSession session,
            CloseStatus status) {

        authenticatedSessionRegistry.remove(session.getId());
        if (monitoringPushHub != null) monitoringPushHub.remove(session.getId());
        if (resumeService != null) resumeService.detach(session.getId());

        LOGGER.info(
                "WebSocket disconnected: "
                        + "sessionId={}, code={}, reason={}",
                session.getId(),
                status.getCode(),
                status.getReason());
    }
}
