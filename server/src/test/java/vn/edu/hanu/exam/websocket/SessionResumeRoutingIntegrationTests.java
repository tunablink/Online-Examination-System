package vn.edu.hanu.exam.websocket;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import tools.jackson.databind.json.JsonMapper;
import vn.edu.hanu.exam.protocol.ClientMessage;
import vn.edu.hanu.exam.protocol.ServerMessage;
import vn.edu.hanu.exam.session.AuthenticatedSessionRegistry;

@SpringBootTest
@Transactional
class SessionResumeRoutingIntegrationTests {
    @Autowired private ExamWebSocketHandler router;
    @Autowired private NamedParameterJdbcTemplate jdbc;
    @Autowired private PasswordEncoder passwords;
    @Autowired private JsonMapper mapper;
    @Autowired private AuthenticatedSessionRegistry auth;

    private WebSocketSession socket(String id) {
        var socket = mock(WebSocketSession.class);
        when(socket.getId()).thenReturn(id);
        when(socket.isOpen()).thenReturn(true);
        return socket;
    }
    private ServerMessage command(WebSocketSession socket, String type, Map<String, Object> payload) throws Exception {
        clearInvocations(socket);
        router.handleMessage(socket, new TextMessage(mapper.writeValueAsString(new ClientMessage("test-request", type, payload))));
        ArgumentCaptor<TextMessage> response = ArgumentCaptor.forClass(TextMessage.class);
        verify(socket).sendMessage(response.capture());
        return mapper.readValue(response.getValue().getPayload(), ServerMessage.class);
    }

    @Test
    void loginDisconnectResumeAndLogoutRevokeTheCredential() throws Exception {
        String institutionalId = "resume_" + UUID.randomUUID().toString().replace("-", "");
        jdbc.update("""
                INSERT INTO users(institutional_id,password_hash,full_name,email,role)
                VALUES(:name,:hash,'Resume User',:email,'STUDENT')
                """, Map.of("name", institutionalId, "hash", passwords.encode("ResumeTest123!"), "email", institutionalId + "@example.com"));
        var first = socket(UUID.randomUUID().toString());
        var second = socket(UUID.randomUUID().toString());
        try {
            ServerMessage login = command(first, "LOGIN", Map.of("institutionalId", institutionalId, "password", "ResumeTest123!"));
            assertEquals("LOGGED_IN", login.type());
            Map<?, ?> details = (Map<?, ?>) login.data();
            String token = (String) details.get("sessionToken");
            assertEquals(43, token.length());
            assertFalse(details.containsKey("passwordHash"));
            router.afterConnectionClosed(first, org.springframework.web.socket.CloseStatus.NORMAL);
            assertFalse(auth.isAuthenticated(first.getId()));

            ServerMessage resumed = command(second, "RESUME_SESSION", Map.of("sessionToken", token));
            assertEquals("SESSION_RESUMED", resumed.type());
            assertTrue(auth.isAuthenticated(second.getId()));
            assertEquals(institutionalId, auth.findUser(second.getId()).orElseThrow().institutionalId());
            assertEquals("LOGGED_OUT", command(second, "LOGOUT", Map.of()).type());
            assertFalse(auth.isAuthenticated(second.getId()));
            assertEquals("SESSION_INVALID", command(first, "RESUME_SESSION", Map.of("sessionToken", token)).error().code());
        } finally {
            command(second, "LOGOUT", Map.of());
            auth.remove(first.getId()); auth.remove(second.getId());
        }
    }
}
