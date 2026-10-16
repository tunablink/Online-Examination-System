package vn.edu.hanu.exam.websocket;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration //noi rang class nay chua cau hinh spring
@EnableWebSocket // bat WebSocket handling
public class WebSocketConfig implements WebSocketConfigurer {
    private final ExamWebSocketHandler examWebSocketHandler;

    public WebSocketConfig(ExamWebSocketHandler examWebSocketHandler){
        this.examWebSocketHandler = examWebSocketHandler;
    }

    @Override 
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(examWebSocketHandler, "/ws")
        .setAllowedOrigins("http://localhost:5173");
    }
}


