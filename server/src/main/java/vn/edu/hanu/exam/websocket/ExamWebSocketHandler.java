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

import tools.jackson.databind.json.JsonMapper;
import vn.edu.hanu.exam.protocol.ClientMessage;
import vn.edu.hanu.exam.protocol.MessageType;
import vn.edu.hanu.exam.protocol.ServerMessage;

@Component 
public final class ExamWebSocketHandler extends TextWebSocketHandler{
    private static final Logger LOGGER = LoggerFactory.getLogger(ExamWebSocketHandler.class);

    private final JsonMapper jsonMapper;

    public ExamWebSocketHandler(JsonMapper jsonMapper){
        this.jsonMapper=jsonMapper;
    }
    
    @Override 
    public void afterConnectionEstablished(WebSocketSession session) throws Exception  {
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

    private void sendMessage(WebSocketSession session, ServerMessage serverMessage) throws Exception{
        String json = jsonMapper.writeValueAsString(serverMessage);

        session.sendMessage(new TextMessage(json));
    }
    @Override 
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception{
        try{
            ClientMessage clientMessage = jsonMapper.readValue(message.getPayload(), ClientMessage.class);

            if (clientMessage.type() == null || clientMessage.type().isBlank()){
                sendMessage(session, ServerMessage.error(clientMessage.requestId(),
                "MISSING_MESSAGE_TYPE", "The message type is required."));
                return;
            }

            String messageType = clientMessage.type().trim().toUpperCase(Locale.ROOT);

            switch (messageType) {
                case "PING":
                    handlePing(session, clientMessage);
                    
                    break;
            
                default:
                    break;
            }

        } catch (Exception e){

        }
    }

    private void handlePing(WebSocketSession session, ClientMessage clientMessage) throws Exception{
        LOGGER.info(
            "PING received from session {}, requestId={}", session.getId(), clientMessage.requestId()
        );

        ServerMessage pongMessage = ServerMessage.success(clientMessage.requestId(), MessageType.PONG.name(), 
    Map.of("serverTime", Instant.now().toString()));

        sendMessage(session, pongMessage);
    }

    @Override 
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status){
        LOGGER.info("WebSocket disconnected: sessionId={}, code={}, reason={}", session.getId(), status.getCode(), status.getReason());
    }
}
