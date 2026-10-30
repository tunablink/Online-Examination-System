package vn.edu.hanu.exam.websocket.handler;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import tools.jackson.databind.json.JsonMapper;
import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.protocol.ServerMessage;
import vn.edu.hanu.exam.service.LoggedInUser;
import vn.edu.hanu.exam.service.RegisterUserCommand;
import vn.edu.hanu.exam.service.RegisteredUser;
import vn.edu.hanu.exam.service.student.StudentAccountService;
import vn.edu.hanu.exam.service.student.StudentManagementService;
import vn.edu.hanu.exam.session.AuthenticatedSessionRegistry;

class StudentAccountMessageHandlerTests {
    private StudentAccountService accounts;
    private AuthenticatedSessionRegistry sessions;
    private StudentManagementMessageHandler handler;

    @BeforeEach
    void setUp() {
        accounts = mock(StudentAccountService.class);
        sessions = new AuthenticatedSessionRegistry();
        handler = new StudentManagementMessageHandler(mock(StudentManagementService.class), sessions,
                JsonMapper.builder().build(), accounts);
    }

    @Test
    void anonymousAndStudentCannotCreateOrImport() {
        Map<String, Object> create = Map.of("institutionalId", "student1", "fullName", "Student One",
                "email", "student@example.com", "password", "StrongPassword123");
        assertEquals("AUTHENTICATION_REQUIRED", handler.handleCreate("anonymous", "r1", create).error().code());
        assertEquals("AUTHENTICATION_REQUIRED", handler.handleImport("anonymous", "r2", Map.of("contentBase64", "file")).error().code());
        sessions.authenticate("student", user(UserRole.STUDENT));
        assertEquals("FORBIDDEN", handler.handleCreate("student", "r3", create).error().code());
        assertEquals("FORBIDDEN", handler.handleImport("student", "r4", Map.of("contentBase64", "file")).error().code());
        verify(accounts, never()).create(any(), any());
        verify(accounts, never()).importXlsx(any());
    }

    @Test
    void teacherCanCreateStudentAndImport() {
        sessions.authenticate("teacher", user(UserRole.TEACHER));
        RegisteredUser student = new RegisteredUser(2, "student1", "Student One", "student@example.com",
                UserRole.STUDENT, true, OffsetDateTime.now());
        when(accounts.create(any(RegisterUserCommand.class), eq("Computer Science"))).thenReturn(student);
        when(accounts.importXlsx("file")).thenReturn(new StudentAccountService.ImportResult(2));

        ServerMessage created = handler.handleCreate("teacher", "r1", Map.of(
                "institutionalId", "student1", "fullName", "Student One", "email", "student@example.com",
                "password", "StrongPassword123", "confirmPassword", "StrongPassword123",
                "department", "Computer Science"));
        ServerMessage imported = handler.handleImport("teacher", "r2", Map.of("contentBase64", "file"));

        assertEquals("STUDENT_CREATED", created.type());
        assertEquals(student, created.data());
        assertEquals("STUDENTS_IMPORTED", imported.type());
        assertEquals(2, ((StudentAccountService.ImportResult) imported.data()).importedCount());
    }

    @Test
    void teacherCannotCreateStudentWithMissingDepartmentOrMismatchedPassword() {
        sessions.authenticate("teacher", user(UserRole.TEACHER));
        Map<String, Object> base = Map.of("institutionalId", "student1", "fullName", "Student One",
                "email", "student@example.com", "password", "StrongPassword123",
                "confirmPassword", "StrongPassword123", "department", "");
        assertEquals("INVALID_DEPARTMENT", handler.handleCreate("teacher", "r1", base).error().code());
        assertEquals("PASSWORD_MISMATCH", handler.handleCreate("teacher", "r2", Map.of(
                "institutionalId", "student1", "fullName", "Student One", "email", "student@example.com",
                "password", "StrongPassword123", "confirmPassword", "DifferentPassword123",
                "department", "Science")).error().code());
        verify(accounts, never()).create(any(), any());
    }

    private static LoggedInUser user(UserRole role) {
        return new LoggedInUser(1, "user", "User", "user@example.com", role);
    }
}
