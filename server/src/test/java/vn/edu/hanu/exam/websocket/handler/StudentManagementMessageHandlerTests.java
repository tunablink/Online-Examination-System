package vn.edu.hanu.exam.websocket.handler;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import tools.jackson.databind.json.JsonMapper;
import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.exception.StudentManagementException;
import vn.edu.hanu.exam.protocol.ServerMessage;
import vn.edu.hanu.exam.service.LoggedInUser;
import vn.edu.hanu.exam.service.student.StudentDetails;
import vn.edu.hanu.exam.service.student.StudentList;
import vn.edu.hanu.exam.service.student.StudentManagementService;
import vn.edu.hanu.exam.session.AuthenticatedSessionRegistry;

class StudentManagementMessageHandlerTests {
    private static final String SESSION_ID = "teacher-session";
    private static final String REQUEST_ID = "student-directory-request";

    private StudentManagementService studentService;
    private AuthenticatedSessionRegistry sessionRegistry;
    private StudentManagementMessageHandler handler;

    @BeforeEach
    void setUp() {
        studentService = mock(StudentManagementService.class);
        sessionRegistry = new AuthenticatedSessionRegistry();
        handler = new StudentManagementMessageHandler(
                studentService,
                sessionRegistry,
                JsonMapper.builder().build());
    }

    @Test
    void authenticatedTeacherCanListStudentsAndRequestIdIsPreserved() {
        authenticate(UserRole.TEACHER);
        StudentList list = new StudentList(List.of(sampleStudent()));
        when(studentService.findAllStudents()).thenReturn(list);

        ServerMessage response = handler.handleList(SESSION_ID, REQUEST_ID);

        assertSuccess(response, "STUDENTS", list);
        verify(studentService).findAllStudents();
    }

    @Test
    void authenticatedTeacherCanGetStudentDetails() {
        authenticate(UserRole.TEACHER);
        StudentDetails details = sampleStudent();
        when(studentService.findStudentById(12L)).thenReturn(details);

        ServerMessage response = handler.handleGet(
                SESSION_ID,
                REQUEST_ID,
                Map.of("studentId", 12L));

        assertSuccess(response, "STUDENT_DETAILS", details);
        verify(studentService).findStudentById(12L);
    }

    @Test
    void teacherCanUpdateAndDeactivateStudentThroughWebSocketHandler() {
        authenticate(UserRole.TEACHER);
        StudentDetails updated = sampleStudent();
        when(studentService.updateStudent(12L, "student01", "Nguyen Van A", "student01@hanu.edu.vn",
                "Computer Science", "", ""))
                .thenReturn(updated);

        ServerMessage update = handler.handleUpdate(SESSION_ID, REQUEST_ID, Map.of(
                "studentId", 12L, "username", "student01", "fullName", "Nguyen Van A",
                "email", "student01@hanu.edu.vn", "department", "Computer Science",
                "password", "", "confirmPassword", ""));
        assertSuccess(update, "STUDENT_UPDATED", updated);

        ServerMessage delete = handler.handleDelete(SESSION_ID, REQUEST_ID, Map.of("studentId", 12L));
        assertSuccess(delete, "STUDENT_DELETED", Map.of("studentId", 12L));
        verify(studentService).deactivateStudent(12L);
    }

    @Test
    void studentCannotUpdateOrDeactivateAnotherStudent() {
        authenticate(UserRole.STUDENT);
        assertError(handler.handleUpdate(SESSION_ID, REQUEST_ID, Map.of(
                "studentId", 12L, "fullName", "Changed", "email", "changed@example.com")), "FORBIDDEN");
        assertError(handler.handleDelete(SESSION_ID, REQUEST_ID, Map.of("studentId", 12L)), "FORBIDDEN");
        verify(studentService, never()).deactivateStudent(anyLong());
    }

    @Test
    void unauthenticatedSessionIsRejectedBeforeCallingService() {
        assertError(handler.handleList("missing-session", REQUEST_ID), "AUTHENTICATION_REQUIRED");
        verify(studentService, never()).findAllStudents();
    }

    @Test
    void studentIsForbiddenBeforeCallingService() {
        authenticate(UserRole.STUDENT);

        assertError(handler.handleList(SESSION_ID, REQUEST_ID), "FORBIDDEN");
        verify(studentService, never()).findAllStudents();
    }

    @Test
    void nullMissingAndWrongTypeDetailPayloadsAreRejected() {
        authenticate(UserRole.TEACHER);

        assertError(handler.handleGet(SESSION_ID, REQUEST_ID, null), "INVALID_PAYLOAD");
        assertError(handler.handleGet(SESSION_ID, REQUEST_ID, Map.of()), "INVALID_PAYLOAD");
        assertError(handler.handleGet(
                SESSION_ID, REQUEST_ID, Map.of("studentId", "12")), "INVALID_PAYLOAD");
        assertError(handler.handleGet(
                SESSION_ID, REQUEST_ID, Map.of("studentId", 12.5)), "INVALID_PAYLOAD");
        verify(studentService, never()).findStudentById(anyLong());
    }

    @Test
    void notFoundErrorIsPreserved() {
        authenticate(UserRole.TEACHER);
        when(studentService.findStudentById(12L)).thenThrow(
                new StudentManagementException("STUDENT_NOT_FOUND", "Student was not found."));

        assertError(handler.handleGet(
                SESSION_ID, REQUEST_ID, Map.of("studentId", 12L)), "STUDENT_NOT_FOUND");
    }

    @Test
    void databaseErrorIsPreservedWithoutInternalDetails() {
        authenticate(UserRole.TEACHER);
        when(studentService.findAllStudents()).thenThrow(
                new StudentManagementException("DATABASE_ERROR", "The student directory could not be read."));

        ServerMessage response = handler.handleList(SESSION_ID, REQUEST_ID);

        assertError(response, "DATABASE_ERROR");
        assertEquals("The student directory could not be read.", response.error().message());
    }

    @Test
    void unexpectedExceptionReturnsInternalServerError() {
        authenticate(UserRole.TEACHER);
        when(studentService.findAllStudents()).thenThrow(new RuntimeException("internal secret"));

        ServerMessage response = handler.handleList(SESSION_ID, REQUEST_ID);

        assertError(response, "INTERNAL_SERVER_ERROR");
        assertEquals("An unexpected error occurred.", response.error().message());
    }

    private void authenticate(UserRole role) {
        sessionRegistry.authenticate(
                SESSION_ID,
                new LoggedInUser(10L, "teacher", "Directory User", "directory@example.com", role));
    }

    private static StudentDetails sampleStudent() {
        return new StudentDetails(
                12L,
                "student01",
                "Nguyen Van A",
                "student01@hanu.edu.vn",
                true,
                OffsetDateTime.parse("2026-10-26T10:00:00Z"));
    }

    private static void assertSuccess(ServerMessage response, String type, Object data) {
        assertEquals(REQUEST_ID, response.requestId());
        assertEquals(type, response.type());
        assertEquals(data, response.data());
        assertNull(response.error());
    }

    private static void assertError(ServerMessage response, String code) {
        assertEquals(REQUEST_ID, response.requestId());
        assertEquals("ERROR", response.type());
        assertNull(response.data());
        assertNotNull(response.error());
        assertEquals(code, response.error().code());
    }
}
