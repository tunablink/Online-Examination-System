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
    @Autowired private org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate jdbc;
    @Autowired private org.springframework.security.crypto.password.PasswordEncoder passwords;

    // ── helpers ────────────────────────────────────────────────────────────────

    /** Registers a fresh student and returns their institutionalId. */
    private String registerStudent(String rawPassword) {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        String institutionalId = "student_" + suffix;
        String email = institutionalId + "@example.com";
        registrationService.registerStudent(
                new RegisterUserCommand(institutionalId, rawPassword, "Test Student", email));
        return institutionalId;
    }

    // ── tests ──────────────────────────────────────────────────────────────────

    @Test
    void loginWithCorrectCredentialsSucceeds() {
        String rawPassword = "StrongPassword_123!";
        String institutionalId = registerStudent(rawPassword);

        LoggedInUser loggedIn = loginService.login(new LoginCommand(institutionalId, rawPassword));

        assertNotNull(loggedIn);
        assertEquals(institutionalId, loggedIn.institutionalId());
        assertEquals(UserRole.STUDENT, loggedIn.role());
    }

    @Test
    void loginWithWrongPasswordReturnsInvalidCredentials() {
        String institutionalId = registerStudent("StrongPassword_123!");

        AuthenticationException ex = assertThrows(AuthenticationException.class,
                () -> loginService.login(new LoginCommand(institutionalId, "WrongPassword_456!")));

        assertEquals("INVALID_CREDENTIALS", ex.code());
        assertEquals("Invalid Student ID / Teacher ID or password.", ex.getMessage());
    }

    @Test
    void teacherUsesIssuedTeacherIdWithRoleDeterminedByServer() {
        String teacherId = "gv_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        String password = "TeacherIdLogin123!";
        long databaseId = jdbc.queryForObject("""
                INSERT INTO users(institutional_id,password_hash,full_name,email,role)
                VALUES(:loginId,:hash,'Teacher ID test',:email,'TEACHER') RETURNING id
                """, java.util.Map.of("loginId", teacherId, "hash", passwords.encode(password),
                "email", teacherId + "@example.com"), Long.class);
        var authenticated = loginService.login(new LoginCommand(teacherId, password));
        assertEquals(databaseId, authenticated.id());
        assertEquals(teacherId, authenticated.institutionalId());
        assertEquals(UserRole.TEACHER, authenticated.role());
        assertEquals("INVALID_CREDENTIALS", assertThrows(AuthenticationException.class,
                () -> loginService.login(new LoginCommand(teacherId, "WrongPassword123!"))).code());
    }

    @Test
    void loginWithUnknownInstitutionalIdReturnsInvalidCredentials() {
        AuthenticationException ex = assertThrows(AuthenticationException.class,
                () -> loginService.login(new LoginCommand("no_such_user_xyz", "SomePassword_1!")));

        assertEquals("INVALID_CREDENTIALS", ex.code());
    }

    @Test
    void loginResultDoesNotContainPasswordHash() {
        String rawPassword = "StrongPassword_123!";
        String institutionalId = registerStudent(rawPassword);

        LoggedInUser loggedIn = loginService.login(new LoginCommand(institutionalId, rawPassword));

        // LoggedInUser is a record — toString() lists all fields.
        // Verify neither the raw password nor a BCrypt hash appears.
        String asString = loggedIn.toString();
        assertFalse(asString.contains(rawPassword), "Response must not contain raw password");
        assertFalse(asString.contains("$2"), "Response must not contain password hash");
    }
}
