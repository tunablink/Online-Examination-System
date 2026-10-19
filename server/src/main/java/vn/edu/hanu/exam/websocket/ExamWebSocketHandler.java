package vn.edu.hanu.exam.websocket;

import java.time.Instant;
import java.util.Locale;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;
import vn.edu.hanu.exam.protocol.ClientMessage;
import vn.edu.hanu.exam.protocol.MessageType;
import vn.edu.hanu.exam.protocol.ServerMessage;

@Component
public final class ExamWebSocketHandler extends TextWebSocketHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(ExamWebSocketHandler.class);

    private final JsonMapper jsonMapper;

    public ExamWebSocketHandler(JsonMapper jsonMapper) {
        this.jsonMapper = jsonMapper;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        LOGGER.info("WebSocket connected: sessionId={}", session.getId());

        ServerMessage connectedMessage = ServerMessage.event(
            MessageType.CONNECTED.name(),
            Map.of(
                "message", "Connected to Online Examination Server",
                "sessionId", session.getId(),
                "serverTime", Instant.now().toString()
            )
        );

        sendMessage(session, connectedMessage);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        ClientMessage clientMessage;

        // Bước 1: parse JSON – nếu JSON không hợp lệ thì trả INVALID_JSON ngay
        try {
            clientMessage = jsonMapper.readValue(message.getPayload(), ClientMessage.class);
        } catch (JacksonException e) {
            LOGGER.warn("Invalid JSON received from sessionId={}: {}", session.getId(), e.getMessage());
            sendMessage(session, ServerMessage.error(
                null,
                "INVALID_JSON",
                "The message is not valid JSON."
            ));
            return;
        }

        // Bước 2: kiểm tra type có tồn tại không
        if (clientMessage.type() == null || clientMessage.type().isBlank()) {
            LOGGER.warn("Missing message type from sessionId={}, requestId={}",
                session.getId(), clientMessage.requestId());
            sendMessage(session, ServerMessage.error(
                clientMessage.requestId(),
                "MISSING_MESSAGE_TYPE",
                "The message type is required."
            ));
            return;
        }

        String messageType = clientMessage.type().trim().toUpperCase(Locale.ROOT);

        // Bước 3: dispatch theo type
        try {
            switch (messageType) {
                case "PING" -> handlePing(session, clientMessage);

                default -> {
                    LOGGER.warn("Unsupported message type '{}' from sessionId={}, requestId={}",
                        messageType, session.getId(), clientMessage.requestId());
                    sendMessage(session, ServerMessage.error(
                        clientMessage.requestId(),
                        "UNSUPPORTED_MESSAGE_TYPE",
                        "The message type is not supported."
                    ));
                }
            }
        } catch (Exception e) {
            // Log lỗi nội bộ nhưng KHÔNG gửi stack trace hay nội dung exception cho client
            LOGGER.error("Internal error handling message type='{}' sessionId={}: {}",
                messageType, session.getId(), e.getMessage(), e);
            sendMessage(session, ServerMessage.error(
                clientMessage.requestId(),
                "INTERNAL_ERROR",
                "An internal server error occurred."
            ));
        }
    }

    private void handlePing(WebSocketSession session, ClientMessage clientMessage) throws Exception {
        LOGGER.info("PING received from sessionId={}, requestId={}",
            session.getId(), clientMessage.requestId());

        ServerMessage pongMessage = ServerMessage.success(
            clientMessage.requestId(),
            MessageType.PONG.name(),
            Map.of("serverTime", Instant.now().toString())
        );

        sendMessage(session, pongMessage);
    }

    private void sendMessage(WebSocketSession session, ServerMessage serverMessage) throws Exception {
        String json = jsonMapper.writeValueAsString(serverMessage);
        session.sendMessage(new TextMessage(json));
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        LOGGER.info("WebSocket disconnected: sessionId={}, code={}, reason={}",
            session.getId(), status.getCode(), status.getReason());
    }
}
