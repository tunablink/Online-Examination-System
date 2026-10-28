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

@SpringBootTest
@Transactional
class RegistrationAuthorizationIntegrationTests {
    @Autowired private ExamWebSocketHandler router;
    @Autowired private NamedParameterJdbcTemplate jdbc;
    @Autowired private PasswordEncoder passwords;
    @Autowired private JsonMapper mapper;

    private ServerMessage command(WebSocketSession socket, String type, Map<String, Object> payload) throws Exception {
        clearInvocations(socket);
        router.handleMessage(socket, new TextMessage(mapper.writeValueAsString(
                new ClientMessage("registration-auth", type, payload))));
        var response = ArgumentCaptor.forClass(TextMessage.class);
        verify(socket).sendMessage(response.capture());
        return mapper.readValue(response.getValue().getPayload(), ServerMessage.class);
    }

    private void verifyRegistration(String role, String expectedError) throws Exception {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        String actor = "actor_" + suffix;
        String student = "student_" + suffix;
        var socket = mock(WebSocketSession.class);
        when(socket.getId()).thenReturn("register_" + suffix);
        when(socket.isOpen()).thenReturn(true);
        try {
            if (role != null) {
                jdbc.update("""
                        INSERT INTO users(username,password_hash,full_name,email,role)
                        VALUES(:name,:hash,'Registration Actor',:email,:role)
                        """, Map.of("name", actor, "hash", passwords.encode("RegisterTest123!"),
                        "email", actor + "@example.com", "role", role));
                assertEquals("LOGGED_IN", command(socket, "LOGIN",
                        Map.of("username", actor, "password", "RegisterTest123!")).type());
            }
            ServerMessage response = command(socket, "REGISTER", Map.of(
                    "username", student, "password", "StudentTest123!",
                    "fullName", "Registration Student", "email", student + "@example.com",
                    "role", "TEACHER")); // Untrusted role must never elevate the created user.
            assertEquals("registration-auth", response.requestId());
            int count = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE username=:name",
                    Map.of("name", student), Integer.class);
            if (expectedError != null) {
                assertEquals("ERROR", response.type());
                assertEquals(expectedError, response.error().code());
                assertEquals(0, count);
            } else {
                assertEquals("REGISTERED", response.type());
                assertEquals(1, count);
                Map<String, Object> stored = jdbc.queryForMap(
                        "SELECT role,password_hash FROM users WHERE username=:name", Map.of("name", student));
                assertEquals("STUDENT", stored.get("role"));
                assertTrue(passwords.matches("StudentTest123!", (String) stored.get("password_hash")));
                Map<?, ?> data = (Map<?, ?>) response.data();
                assertFalse(data.containsKey("password"));
                assertFalse(data.containsKey("passwordHash"));
                assertFalse(data.containsKey("password_hash"));
            }
        } finally {
            command(socket, "LOGOUT", Map.of());
        }
    }

    @Test void anonymousCannotCreateStudent() throws Exception {
        verifyRegistration(null, "AUTHENTICATION_REQUIRED");
    }

    @Test void anonymousCannotRegisterTeacher() throws Exception {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        String username = "teacher_" + suffix;
        var socket = mock(WebSocketSession.class);
        when(socket.getId()).thenReturn("teacher_registration_" + suffix);
        when(socket.isOpen()).thenReturn(true);

        ServerMessage response = command(socket, "REGISTER", Map.of(
                "username", username,
                "password", "TeacherTest123!",
                "fullName", "New Teacher",
                "email", username + "@example.com",
                "role", "TEACHER",
                "acceptedPolicy", true));

        assertEquals("ERROR", response.type());
        assertEquals("AUTHENTICATION_REQUIRED", response.error().code());
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE username=:name",
                Map.of("name", username), Integer.class));
    }

    @Test void studentCannotCreateStudent() throws Exception {
        verifyRegistration("STUDENT", "FORBIDDEN");
    }

    @Test void teacherCreatesOnlyStudentWithHashedPassword() throws Exception {
        verifyRegistration("TEACHER", null);
    }
}
