package vn.edu.hanu.exam.websocket.handler;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.exception.RegistrationException;
import vn.edu.hanu.exam.protocol.ClientMessage;
import vn.edu.hanu.exam.protocol.ServerMessage;
import vn.edu.hanu.exam.service.LoggedInUser;
import vn.edu.hanu.exam.service.RegisterUserCommand;
import vn.edu.hanu.exam.service.course.CourseException;
import vn.edu.hanu.exam.service.course.CourseService;
import vn.edu.hanu.exam.session.AuthenticatedSessionRegistry;

@Component
public class CourseMessageHandler {
    private final CourseService courses;
    private final AuthenticatedSessionRegistry sessions;

    public CourseMessageHandler(CourseService courses, AuthenticatedSessionRegistry sessions) {
        this.courses = courses;
        this.sessions = sessions;
    }

    public ServerMessage handle(WebSocketSession session, ClientMessage message) {
        String requestId = message.requestId();
        LoggedInUser teacher = sessions.findUser(session.getId()).orElse(null);
        if (teacher == null) return ServerMessage.error(requestId, "AUTHENTICATION_REQUIRED", "Authentication is required.");
        if (teacher.role() != UserRole.TEACHER) return ServerMessage.error(requestId, "FORBIDDEN", "Only teachers can manage courses.");
        Map<String, Object> payload = message.payload();
        try {
            return switch (message.type().trim().toUpperCase()) {
                case "CREATE_COURSE" -> ServerMessage.success(requestId, "COURSE_CREATED",
                        payload != null && payload.containsKey("code") && !payload.containsKey("subject")
                                ? courses.create(teacher.id(), string(payload, "code"), string(payload, "name"))
                                : courses.createDetailed(teacher.id(), string(payload, "name"), string(payload, "subject"),
                                        optionalString(payload, "department"), string(payload, "academicYear"),
                                        optionalString(payload, "semester"), optionalString(payload, "description")));
                case "UPDATE_COURSE" -> ServerMessage.success(requestId, "COURSE_UPDATED",
                        courses.update(number(payload, "courseId"), teacher.id(), string(payload, "name"),
                                string(payload, "subject"), optionalString(payload, "department"),
                                string(payload, "academicYear"), optionalString(payload, "semester"),
                                optionalString(payload, "description")));
                case "ARCHIVE_COURSE" -> ServerMessage.success(requestId, "COURSE_ARCHIVED",
                        courses.setArchived(number(payload, "courseId"), teacher.id(), true));
                case "RESTORE_COURSE" -> ServerMessage.success(requestId, "COURSE_RESTORED",
                        courses.setArchived(number(payload, "courseId"), teacher.id(), false));
                case "GET_COURSES" -> ServerMessage.success(requestId, "COURSES", Map.of("courses", courses.list(teacher.id())));
                case "GET_COURSE" -> {
                    long courseId = number(payload, "courseId");
                    var details = new LinkedHashMap<String, Object>();
                    details.put("course", courses.requireOwned(courseId, teacher.id()));
                    details.put("students", courses.students(courseId, teacher.id()));
                    var statistics = courses.statistics(courseId, teacher.id());
                    if (statistics != null) details.put("statistics", statistics);
                    yield ServerMessage.success(requestId, "COURSE_DETAILS", details);
                }
                case "ENROLL_STUDENT" -> ServerMessage.success(requestId, "STUDENT_ENROLLED", Map.of(
                        "enrolled", courses.enroll(number(payload, "courseId"), teacher.id(), number(payload, "studentId"))));
                case "ENROLL_STUDENT_BY_IDENTITY" -> ServerMessage.success(requestId, "STUDENT_ENROLLED", Map.of(
                        "enrolled", courses.enrollByIdentity(number(payload, "courseId"), teacher.id(),
                                string(payload, "studentId"), string(payload, "fullName"), string(payload, "email"))));
                case "UPDATE_COURSE_STUDENT" -> {
                    long courseId = number(payload, "courseId");
                    long studentId = number(payload, "studentId");
                    courses.updateStudentIdentity(courseId, teacher.id(), studentId,
                            string(payload, "username"), string(payload, "fullName"), string(payload, "email"));
                    yield ServerMessage.success(requestId, "COURSE_STUDENT_UPDATED", Map.of("studentId", studentId));
                }
                case "UNENROLL_STUDENT" -> ServerMessage.success(requestId, "STUDENT_UNENROLLED", Map.of(
                        "unenrolled", courses.unenroll(number(payload, "courseId"), teacher.id(), number(payload, "studentId"))));
                case "IMPORT_COURSE_ROSTER" -> ServerMessage.success(requestId, "COURSE_STUDENTS_IMPORTED",
                        courses.importRoster(number(payload, "courseId"), teacher.id(), string(payload, "contentBase64")));
                case "CREATE_COURSE_STUDENT" -> {
                    String password = string(payload, "password");
                    if (!password.equals(string(payload, "confirmPassword"))) {
                        throw new RegistrationException("PASSWORD_MISMATCH", "Password confirmation does not match.");
                    }
                    String department = string(payload, "department");
                    if (department.isBlank()) {
                        throw new RegistrationException("INVALID_DEPARTMENT", "Department is required.");
                    }
                    yield ServerMessage.success(requestId, "COURSE_STUDENT_CREATED",
                            courses.createStudent(number(payload, "courseId"), teacher.id(),
                                    new RegisterUserCommand(string(payload, "username"), password,
                                            string(payload, "fullName"), string(payload, "email")), department));
                }
                case "IMPORT_COURSE_STUDENTS" -> ServerMessage.success(requestId, "COURSE_STUDENTS_IMPORTED",
                        courses.importStudents(number(payload, "courseId"), teacher.id(), string(payload, "contentBase64")));
                default -> ServerMessage.error(requestId, "UNKNOWN_MESSAGE_TYPE", "Unknown course operation.");
            };
        } catch (InvalidPayload exception) {
            return ServerMessage.error(requestId, "INVALID_PAYLOAD", "Request payload is invalid.");
        } catch (CourseException exception) {
            return ServerMessage.error(requestId, exception.code(), exception.getMessage());
        } catch (RegistrationException exception) {
            return ServerMessage.error(requestId, exception.code(), exception.getMessage());
        } catch (RuntimeException exception) {
            return ServerMessage.error(requestId, "INTERNAL_SERVER_ERROR", "An unexpected error occurred.");
        }
    }

    private static String string(Map<String, Object> payload, String key) {
        if (payload == null || !(payload.get(key) instanceof String value)) throw new InvalidPayload();
        return value;
    }

    private static String optionalString(Map<String, Object> payload, String key) {
        if (payload == null) throw new InvalidPayload();
        if (payload.get(key) == null) return null;
        return string(payload, key);
    }

    private static long number(Map<String, Object> payload, String key) {
        if (payload == null || !(payload.get(key) instanceof Integer || payload.get(key) instanceof Long)) throw new InvalidPayload();
        long value = ((Number) payload.get(key)).longValue();
        if (value <= 0) throw new InvalidPayload();
        return value;
    }

    private static final class InvalidPayload extends RuntimeException {}
}
