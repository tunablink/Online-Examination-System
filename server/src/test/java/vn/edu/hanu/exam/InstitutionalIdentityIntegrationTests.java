package vn.edu.hanu.exam;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import tools.jackson.databind.json.JsonMapper;
import vn.edu.hanu.exam.exception.AuthenticationException;
import vn.edu.hanu.exam.protocol.ClientMessage;
import vn.edu.hanu.exam.protocol.ServerMessage;
import vn.edu.hanu.exam.repository.UserRepository;
import vn.edu.hanu.exam.service.LoginCommand;
import vn.edu.hanu.exam.service.LoginService;
import vn.edu.hanu.exam.service.student.StudentManagementService;
import vn.edu.hanu.exam.session.AuthenticatedSessionRegistry;
import vn.edu.hanu.exam.session.SessionResumeService;
import vn.edu.hanu.exam.websocket.ExamWebSocketHandler;
import vn.edu.hanu.exam.websocket.handler.RegistrationMessageHandler;

@SpringBootTest(properties = "exam.deadline.enabled=false")
@Transactional
class InstitutionalIdentityIntegrationTests {
    private static final String PASSWORD = "InstitutionalTest123!";
    @Autowired private NamedParameterJdbcTemplate jdbc;
    @Autowired private PasswordEncoder passwords;
    @Autowired private UserRepository users;
    @Autowired private LoginService login;
    @Autowired private StudentManagementService students;
    @Autowired private ExamWebSocketHandler router;
    @Autowired private RegistrationMessageHandler registration;
    @Autowired private JsonMapper mapper;
    @Autowired private AuthenticatedSessionRegistry sessions;
    @Autowired private SessionResumeService credentials;

    @Test
    void pendingStudentKeepsAccountAndPasswordButCannotLoginUntilSchoolIdAssigned() {
        long id = account(null, "STUDENT");
        var before = users.findById(id).orElseThrow();
        assertNull(before.institutionalId());
        assertEquals("INVALID_CREDENTIALS", assertThrows(AuthenticationException.class,
                () -> login.login(new LoginCommand(String.valueOf(id), PASSWORD))).code());
        String schoolId = "2301" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        students.updateStudent(id, schoolId, before.fullName(), before.email(), "IT", null, null);
        assertEquals(id, login.login(new LoginCommand(schoolId, PASSWORD)).id());
        assertEquals(before.passwordHash(), users.findById(id).orElseThrow().passwordHash());
        assertEquals("INVALID_CREDENTIALS", assertThrows(AuthenticationException.class,
                () -> login.login(new LoginCommand("legacy_student_name", PASSWORD))).code());
        assertEquals(0L, jdbc.queryForObject("""
                SELECT COUNT(*) FROM information_schema.columns
                WHERE table_schema=current_schema() AND table_name='users' AND column_name='username'
                """, Map.of(), Long.class));
    }

    @Test
    void loginAcceptsOnlyInstitutionalIdPayloadAndReturnsNoUsernameField() throws Exception {
        String schoolId = "GV" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        long user = account(schoolId, "TEACHER");
        var socket = mock(WebSocketSession.class);
        String socketId = "id-login-" + UUID.randomUUID();
        when(socket.getId()).thenReturn(socketId);
        when(socket.isOpen()).thenReturn(true);
        try {
            var rejected = command(socket, Map.of("username", schoolId, "password", PASSWORD));
            assertEquals("ERROR", rejected.type());
            assertTrue(sessions.findUser(socketId).isEmpty());
            var accepted = command(socket, Map.of("institutionalId", schoolId, "password", PASSWORD));
            assertEquals("LOGGED_IN", accepted.type());
            assertEquals(user, sessions.findUser(socketId).orElseThrow().id());
            String json = mapper.writeValueAsString(accepted.data());
            assertTrue(json.contains("\"institutionalId\""));
            assertFalse(json.contains("\"username\""));
            assertFalse(json.contains(PASSWORD));
        } finally { sessions.remove(socketId); credentials.revoke(socketId); }
    }

    @Test
    void registrationDoesNotAcceptTheLegacyUsernameField() {
        long before = users.count();
        var response = registration.handle("legacy-register", Map.of("username", "legacy_id",
                "password", PASSWORD, "fullName", "Legacy Request", "email", "legacy-" + UUID.randomUUID() + "@example.com"));
        assertEquals("ERROR", response.type());
        assertEquals(before, users.count());
    }

    private ServerMessage command(WebSocketSession socket, Map<String, Object> payload) throws Exception {
        clearInvocations(socket);
        router.handleMessage(socket, new TextMessage(mapper.writeValueAsString(new ClientMessage("id-login", "LOGIN", payload))));
        var response = ArgumentCaptor.forClass(TextMessage.class);
        verify(socket).sendMessage(response.capture());
        return mapper.readValue(response.getValue().getPayload(), ServerMessage.class);
    }

    private long account(String schoolId, String role) {
        return jdbc.queryForObject("""
                INSERT INTO users(institutional_id,password_hash,full_name,email,role)
                VALUES(:schoolId,:hash,'Institutional ID Test',:email,:role) RETURNING id
                """, new MapSqlParameterSource().addValue("schoolId", schoolId)
                .addValue("hash", passwords.encode(PASSWORD)).addValue("role", role)
                .addValue("email", UUID.randomUUID() + "@example.com"), Long.class);
    }
}
