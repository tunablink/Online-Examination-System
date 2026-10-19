package vn.edu.hanu.exam;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.exception.AuthenticationException;
import vn.edu.hanu.exam.service.LoginCommand;
import vn.edu.hanu.exam.service.LoggedInUser;
import vn.edu.hanu.exam.service.LoginService;
import vn.edu.hanu.exam.service.RegisterUserCommand;
import vn.edu.hanu.exam.service.RegistrationService;

@SpringBootTest
@Transactional
public class LoginServiceIntegrationTests {

    @Autowired
    private LoginService loginService;

    @Autowired
    private RegistrationService registrationService;

    // ── helpers ────────────────────────────────────────────────────────────────

    /** Registers a fresh student and returns their username. */
    private String registerStudent(String rawPassword) {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        String username = "student_" + suffix;
        String email = username + "@example.com";
        registrationService.registerStudent(
                new RegisterUserCommand(username, rawPassword, "Test Student", email));
        return username;
    }

    // ── tests ──────────────────────────────────────────────────────────────────

    @Test
    void loginWithCorrectCredentialsSucceeds() {
        String rawPassword = "StrongPassword_123!";
        String username = registerStudent(rawPassword);

        LoggedInUser loggedIn = loginService.login(new LoginCommand(username, rawPassword));

        assertNotNull(loggedIn);
        assertEquals(username, loggedIn.username());
        assertEquals(UserRole.STUDENT, loggedIn.role());
    }

    @Test
    void loginWithWrongPasswordReturnsInvalidCredentials() {
        String username = registerStudent("StrongPassword_123!");

        AuthenticationException ex = assertThrows(AuthenticationException.class,
                () -> loginService.login(new LoginCommand(username, "WrongPassword_456!")));

        assertEquals("INVALID_CREDENTIALS", ex.code());
    }

    @Test
    void loginWithUnknownUsernameReturnsInvalidCredentials() {
        AuthenticationException ex = assertThrows(AuthenticationException.class,
                () -> loginService.login(new LoginCommand("no_such_user_xyz", "SomePassword_1!")));

        assertEquals("INVALID_CREDENTIALS", ex.code());
    }

    @Test
    void loginResultDoesNotContainPasswordHash() {
        String rawPassword = "StrongPassword_123!";
        String username = registerStudent(rawPassword);

        LoggedInUser loggedIn = loginService.login(new LoginCommand(username, rawPassword));

        // LoggedInUser is a record — toString() lists all fields.
        // Verify neither the raw password nor a BCrypt hash appears.
        String asString = loggedIn.toString();
        assertFalse(asString.contains(rawPassword), "Response must not contain raw password");
        assertFalse(asString.contains("$2"), "Response must not contain password hash");
    }
}
