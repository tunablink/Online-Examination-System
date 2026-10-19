package vn.edu.hanu.exam.websocket.handler;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import tools.jackson.databind.json.JsonMapper;
import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.exception.RegistrationException;
import vn.edu.hanu.exam.protocol.ServerMessage;
import vn.edu.hanu.exam.service.RegisterUserCommand;
import vn.edu.hanu.exam.service.RegisteredUser;
import vn.edu.hanu.exam.service.RegistrationService;

/**
 * Unit test: mock RegistrationService, chỉ kiểm tra việc chuyển đổi message.
 * Không cần database nên không cần DB_PASSWORD.
 */
class RegistrationMessageHandlerTests {

    private static final String REQUEST_ID = "register-001";
    private static final String RAW_PASSWORD = "StrongPassword_123!";

    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    private RegistrationService registrationService;
    private RegistrationMessageHandler handler;

    @BeforeEach
    void setUp() {
        registrationService = mock(RegistrationService.class);
        handler = new RegistrationMessageHandler(registrationService, jsonMapper);
    }

    @Test
    void validPayloadReturnsRegistered() {
        RegisteredUser user = sampleUser();
        when(registrationService.registerStudent(any(RegisterUserCommand.class))).thenReturn(user);

        ServerMessage response = handler.handle(REQUEST_ID, validPayload());

        assertEquals(REQUEST_ID, response.requestId());
        assertEquals("REGISTERED", response.type());
        assertEquals(user, response.data());
        assertNull(response.error());
    }

    @Test
    void payloadIsMappedToRegisterUserCommand() {
        when(registrationService.registerStudent(any(RegisterUserCommand.class))).thenReturn(sampleUser());

        handler.handle(REQUEST_ID, validPayload());

        ArgumentCaptor<RegisterUserCommand> captor = ArgumentCaptor.forClass(RegisterUserCommand.class);
        verify(registrationService).registerStudent(captor.capture());
        RegisterUserCommand command = captor.getValue();
        assertEquals("student01", command.username());
        assertEquals(RAW_PASSWORD, command.password());
        assertEquals("Student One", command.fullName());
        assertEquals("student01@example.com", command.email());
    }

    @Test
    void duplicateUsernameReturnsUsernameAlreadyExists() {
        when(registrationService.registerStudent(any(RegisterUserCommand.class)))
                .thenThrow(new RegistrationException("USERNAME_ALREADY_EXISTS", "Username already exists."));

        assertErrorResponse(handler.handle(REQUEST_ID, validPayload()), "USERNAME_ALREADY_EXISTS");
    }

    @Test
    void duplicateEmailReturnsEmailAlreadyExists() {
        when(registrationService.registerStudent(any(RegisterUserCommand.class)))
                .thenThrow(new RegistrationException("EMAIL_ALREADY_EXISTS", "Email already exists."));

        assertErrorResponse(handler.handle(REQUEST_ID, validPayload()), "EMAIL_ALREADY_EXISTS");
    }

    @Test
    void nullPayloadReturnsError() {
        assertErrorResponse(handler.handle(REQUEST_ID, null),
                RegistrationMessageHandler.CODE_INVALID_PAYLOAD);
    }

    @Test
    void missingFieldsAreRejectedByServiceAndReturnedAsError() {
        Map<String, Object> incomplete = new HashMap<>();
        incomplete.put("username", "student01");
        when(registrationService.registerStudent(any(RegisterUserCommand.class)))
                .thenThrow(new RegistrationException("INVALID_PASSWORD", "Password is required."));

        assertErrorResponse(handler.handle(REQUEST_ID, incomplete), "INVALID_PASSWORD");
    }

    @Test
    void unexpectedExceptionReturnsGenericErrorWithoutInternalDetails() {
        when(registrationService.registerStudent(any(RegisterUserCommand.class)))
                .thenThrow(new IllegalStateException("jdbc:postgresql://secret-host internal detail"));

        ServerMessage response = handler.handle(REQUEST_ID, validPayload());

        assertErrorResponse(response, RegistrationMessageHandler.CODE_INTERNAL_ERROR);
        assertFalse(response.error().message().contains("jdbc"));
    }

    @Test
    void successResponseDoesNotContainPasswordOrHash() {
        when(registrationService.registerStudent(any(RegisterUserCommand.class))).thenReturn(sampleUser());

        ServerMessage response = handler.handle(REQUEST_ID, validPayload());
        String json = jsonMapper.writeValueAsString(response).toLowerCase();

        assertFalse(json.contains(RAW_PASSWORD.toLowerCase()));
        assertFalse(json.contains("password"));
        assertFalse(json.contains("hash"));
    }

    private void assertErrorResponse(ServerMessage response, String expectedCode) {
        assertEquals(REQUEST_ID, response.requestId());
        // ServerMessage.error() hiện trả "Error"; nhánh fix/websocket-error-handling
        // của Hải Yến sẽ đổi thành "ERROR". equalsIgnoreCase để test đúng ở cả hai trạng thái.
        assertTrue("ERROR".equalsIgnoreCase(response.type()));
        assertNull(response.data());
        assertNotNull(response.error());
        assertEquals(expectedCode, response.error().code());
    }

    private Map<String, Object> validPayload() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("username", "student01");
        payload.put("password", RAW_PASSWORD);
        payload.put("fullName", "Student One");
        payload.put("email", "student01@example.com");
        return payload;
    }

    private RegisteredUser sampleUser() {
        return new RegisteredUser(
                1L,
                "student01",
                "Student One",
                "student01@example.com",
                UserRole.STUDENT,
                true,
                OffsetDateTime.parse("2026-10-18T16:00:00+07:00"));
    }
}
