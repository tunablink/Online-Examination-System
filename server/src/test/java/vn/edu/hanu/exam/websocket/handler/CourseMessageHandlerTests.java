package vn.edu.hanu.exam.websocket.handler;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.web.socket.WebSocketSession;

import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.protocol.ClientMessage;
import vn.edu.hanu.exam.service.LoggedInUser;
import vn.edu.hanu.exam.service.course.CourseDetails;
import vn.edu.hanu.exam.service.course.CourseService;
import vn.edu.hanu.exam.session.AuthenticatedSessionRegistry;

class CourseMessageHandlerTests {
    @Test
    void onlyAuthenticatedTeacherCanCreateCourse() {
        CourseService courses = mock(CourseService.class);
        AuthenticatedSessionRegistry sessions = new AuthenticatedSessionRegistry();
        CourseMessageHandler handler = new CourseMessageHandler(courses, sessions);
        WebSocketSession socket = mock(WebSocketSession.class);
        when(socket.getId()).thenReturn("session");
        ClientMessage request = new ClientMessage("request-1", "CREATE_COURSE", Map.of("code", "CS101", "name", "Programming"));

        assertEquals("AUTHENTICATION_REQUIRED", handler.handle(socket, request).error().code());
        sessions.authenticate("session", new LoggedInUser(2, "student", "Student", "student@example.com", UserRole.STUDENT));
        assertEquals("FORBIDDEN", handler.handle(socket, request).error().code());
        verify(courses, never()).create(anyLong(), org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString());

        sessions.authenticate("session", new LoggedInUser(1, "teacher", "Teacher", "teacher@example.com", UserRole.TEACHER));
        CourseDetails created = new CourseDetails(3, 1, "CS101", "Programming", OffsetDateTime.now());
        when(courses.create(1, "CS101", "Programming")).thenReturn(created);
        assertEquals(created, handler.handle(socket, request).data());
        verify(courses).create(1, "CS101", "Programming");
    }

    @Test
    void teacherCanCreateAndArchiveDetailedCourse() {
        CourseService courses = mock(CourseService.class);
        AuthenticatedSessionRegistry sessions = new AuthenticatedSessionRegistry();
        CourseMessageHandler handler = new CourseMessageHandler(courses, sessions);
        WebSocketSession socket = mock(WebSocketSession.class);
        when(socket.getId()).thenReturn("session");
        sessions.authenticate("session", new LoggedInUser(1, "teacher", "Teacher", "teacher@example.com", UserRole.TEACHER));
        CourseDetails created = new CourseDetails(3, 1, "COMPUT-26-ABC12345", "Algorithms",
                "Computer Science", "IT", "2026-2027", "Semester 1", "Description", false, 0, 0,
                OffsetDateTime.now());
        when(courses.createDetailed(1, "Algorithms", "Computer Science", "IT", "2026-2027",
                "Semester 1", "Description")).thenReturn(created);
        when(courses.setArchived(3, 1, true)).thenReturn(created);

        ClientMessage create = new ClientMessage("create", "CREATE_COURSE", Map.of(
                "name", "Algorithms", "subject", "Computer Science", "department", "IT",
                "academicYear", "2026-2027", "semester", "Semester 1", "description", "Description"));
        assertEquals(created, handler.handle(socket, create).data());
        assertEquals("COURSE_ARCHIVED", handler.handle(socket,
                new ClientMessage("archive", "ARCHIVE_COURSE", Map.of("courseId", 3))).type());
        verify(courses).setArchived(3, 1, true);
    }
}
