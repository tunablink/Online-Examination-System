package vn.edu.hanu.exam.protocol;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;

class MessageTypeContractTests {

    @Test
    void containsTheRequiredProtocolMessageTypes() {
        Set<String> actualMessageTypes =
                Stream.of(MessageType.values())
                        .map(Enum::name)
                        .collect(Collectors.toSet());

        Set<String> expectedMessageTypes = Set.of(
                "CONNECTED",

                "PING",
                "PONG",

                "REGISTER",
                "REGISTERED",

                "LOGIN",
                "LOGGED_IN",

                "RESUME_SESSION",
                "SESSION_RESUMED",
                "LOGOUT",
                "LOGGED_OUT",

                "GET_PROFILE",
                "PROFILE_DETAILS",

                "UPDATE_PROFILE",
                "PROFILE_UPDATED",

                "CHANGE_PASSWORD",
                "PASSWORD_CHANGED",

                "GET_STUDENTS",
                "STUDENTS",

                "GET_STUDENT",
                "STUDENT_DETAILS",

                "CREATE_STUDENT",
                "STUDENT_CREATED",

                "IMPORT_STUDENTS",
                "STUDENTS_IMPORTED",
                "UPDATE_STUDENT",
                "STUDENT_UPDATED",
                "DELETE_STUDENT",
                "STUDENT_DELETED",

                "CREATE_COURSE", "COURSE_CREATED",
                "UPDATE_COURSE", "COURSE_UPDATED",
                "ARCHIVE_COURSE", "COURSE_ARCHIVED",
                "RESTORE_COURSE", "COURSE_RESTORED",
                "GET_COURSES", "COURSES",
                "GET_COURSE", "COURSE_DETAILS",
                "ENROLL_STUDENT", "STUDENT_ENROLLED",
                "UNENROLL_STUDENT", "STUDENT_UNENROLLED",
                "CREATE_COURSE_STUDENT", "COURSE_STUDENT_CREATED",
                "IMPORT_COURSE_STUDENTS", "COURSE_STUDENTS_IMPORTED",

                "GET_TEACHER_DASHBOARD",
                "TEACHER_DASHBOARD",

                "CREATE_EXAM",
                "EXAM_CREATED",

                "GET_TEACHER_EXAMS",
                "TEACHER_EXAMS",

                "GET_EXAM",
                "EXAM_DETAILS",

                "UPDATE_EXAM",
                "EXAM_UPDATED",

                "PUBLISH_EXAM",
                "EXAM_PUBLISHED",

                "CLOSE_EXAM",
                "EXAM_CLOSED",

                "DELETE_EXAM",
                "EXAM_DELETED",

                "CREATE_QUESTION",
                "QUESTION_CREATED",

                "UPDATE_QUESTION",
                "QUESTION_UPDATED",

                "DELETE_QUESTION",
                "QUESTION_DELETED",

                "GET_EXAM_QUESTIONS",
                "EXAM_QUESTIONS",

                "GET_AVAILABLE_EXAMS",
                "AVAILABLE_EXAMS",

                "GET_AVAILABLE_EXAM",
                "AVAILABLE_EXAM_DETAILS",

                "START_EXAM",
                "EXAM_STARTED",

                "GET_EXAM_ATTEMPT",
                "EXAM_ATTEMPT_DETAILS",

                "SAVE_ANSWER",
                "ANSWER_SAVED",

                "SUBMIT_EXAM",
                "EXAM_SUBMITTED",

                "GET_ATTEMPT_HISTORY",
                "ATTEMPT_HISTORY",

                "GET_ATTEMPT_RESULT",
                "ATTEMPT_RESULT",

                "GET_EXAM_SUBMISSIONS",
                "EXAM_SUBMISSIONS",

                "GET_SUBMISSION_RESULT",
                "SUBMISSION_RESULT",

                "REPORT_ACTIVITY",
                "ACTIVITY_RECORDED",

                "GET_EXAM_MONITORING",
                "EXAM_MONITORING",

                "GET_TEACHER_MONITORING",
                "TEACHER_MONITORING",

                "ERROR");

        assertEquals(
                expectedMessageTypes,
                actualMessageTypes);
    }

    @Test
    void parsesKnownMessageTypesWithoutDependingOnCaseOrSpaces() {
        assertAll(
                () -> assertEquals(
                        MessageType.PING,
                        MessageType.fromWireValue("PING").orElseThrow()),

                () -> assertEquals(
                        MessageType.REGISTER,
                        MessageType.fromWireValue(" register ").orElseThrow()),

                () -> assertEquals(
                        MessageType.LOGIN,
                        MessageType.fromWireValue("LoGiN").orElseThrow()),

                () -> assertEquals(
                        MessageType.GET_TEACHER_DASHBOARD,
                        MessageType.fromWireValue(
                                " get_teacher_dashboard ")
                                .orElseThrow()),

                () -> assertEquals(
                        MessageType.CREATE_EXAM,
                        MessageType.fromWireValue(
                                " create_exam ")
                                .orElseThrow()),

                () -> assertEquals(
                        MessageType.GET_EXAM_QUESTIONS,
                        MessageType.fromWireValue(
                                "get_exam_questions")
                                .orElseThrow()),

                () -> assertEquals(
                        MessageType.UPDATE_QUESTION,
                        MessageType.fromWireValue(
                                " update_question ")
                                .orElseThrow()),

                () -> assertEquals(
                        MessageType.DELETE_QUESTION,
                        MessageType.fromWireValue(
                                "delete_question")
                                .orElseThrow()),

                () -> assertEquals(
                        MessageType.UPDATE_EXAM,
                        MessageType.fromWireValue(
                                " update_exam ")
                                .orElseThrow()),

                () -> assertEquals(
                        MessageType.PUBLISH_EXAM,
                        MessageType.fromWireValue(
                                " publish_exam ")
                                .orElseThrow()),

                () -> assertEquals(
                        MessageType.CLOSE_EXAM,
                        MessageType.fromWireValue(
                                " close_exam ")
                                .orElseThrow()),

                () -> assertEquals(
                        MessageType.DELETE_EXAM,
                        MessageType.fromWireValue(
                                " delete_exam ")
                                .orElseThrow()),

                () -> assertEquals(
                        MessageType.START_EXAM,
                        MessageType.fromWireValue(
                                " start_exam ")
                                .orElseThrow()),

                () -> assertEquals(
                        MessageType.GET_EXAM_ATTEMPT,
                        MessageType.fromWireValue(
                                "get_exam_attempt")
                                .orElseThrow()),

                () -> assertEquals(
                        MessageType.SAVE_ANSWER,
                        MessageType.fromWireValue(
                                " save_answer ")
                                .orElseThrow()),

                () -> assertEquals(
                        MessageType.SUBMIT_EXAM,
                        MessageType.fromWireValue(
                                "submit_exam")
                                .orElseThrow()),

                () -> assertEquals(
                        MessageType.GET_ATTEMPT_HISTORY,
                        MessageType.fromWireValue(
                                " get_attempt_history ")
                                .orElseThrow()),

                () -> assertEquals(
                        MessageType.GET_ATTEMPT_RESULT,
                        MessageType.fromWireValue(
                                "get_attempt_result")
                                .orElseThrow()),

                () -> assertEquals(
                        MessageType.GET_EXAM_SUBMISSIONS,
                        MessageType.fromWireValue(
                                " get_exam_submissions ")
                                .orElseThrow()),

                () -> assertEquals(
                        MessageType.GET_SUBMISSION_RESULT,
                        MessageType.fromWireValue(
                                "get_submission_result")
                                .orElseThrow()),

                () -> assertEquals(
                        MessageType.REPORT_ACTIVITY,
                        MessageType.fromWireValue(
                                " report_activity ")
                                .orElseThrow()),

                () -> assertEquals(
                        MessageType.GET_EXAM_MONITORING,
                        MessageType.fromWireValue(
                                "get_exam_monitoring")
                                .orElseThrow()));
    }

    @Test
    void rejectsMissingOrUnsupportedMessageTypes() {
        assertAll(
                () -> assertTrue(
                        MessageType.fromWireValue(null).isEmpty()),

                () -> assertTrue(
                        MessageType.fromWireValue("").isEmpty()),

                () -> assertTrue(
                        MessageType.fromWireValue("   ").isEmpty()),

                () -> assertTrue(
                        MessageType.fromWireValue("UNKNOWN").isEmpty()));
    }

    @Test
    void acceptsOnlyClientCommandTypesFromClient() {
        Set<MessageType> actualClientCommandTypes =
                Stream.of(MessageType.values())
                        .filter(MessageType::isAcceptedFromClient)
                        .collect(Collectors.toSet());

        Set<MessageType> expectedClientCommandTypes = Set.of(
                MessageType.PING,

                MessageType.REGISTER,

                MessageType.LOGIN,

                MessageType.RESUME_SESSION,
                MessageType.LOGOUT,

                MessageType.GET_PROFILE,
                MessageType.UPDATE_PROFILE,
                MessageType.CHANGE_PASSWORD,

                MessageType.GET_STUDENTS,
                MessageType.GET_STUDENT,
                MessageType.CREATE_STUDENT,
                MessageType.IMPORT_STUDENTS,
                MessageType.UPDATE_STUDENT,
                MessageType.DELETE_STUDENT,
                MessageType.CREATE_COURSE,
                MessageType.UPDATE_COURSE,
                MessageType.ARCHIVE_COURSE,
                MessageType.RESTORE_COURSE,
                MessageType.GET_COURSES,
                MessageType.GET_COURSE,
                MessageType.ENROLL_STUDENT,
                MessageType.UNENROLL_STUDENT,
                MessageType.CREATE_COURSE_STUDENT,
                MessageType.IMPORT_COURSE_STUDENTS,

                MessageType.GET_TEACHER_DASHBOARD,

                MessageType.CREATE_EXAM,
                MessageType.GET_TEACHER_EXAMS,
                MessageType.GET_EXAM,
                MessageType.UPDATE_EXAM,
                MessageType.PUBLISH_EXAM,
                MessageType.CLOSE_EXAM,
                MessageType.DELETE_EXAM,

                MessageType.CREATE_QUESTION,
                MessageType.UPDATE_QUESTION,
                MessageType.DELETE_QUESTION,
                MessageType.GET_EXAM_QUESTIONS,

                MessageType.GET_AVAILABLE_EXAMS,
                MessageType.GET_AVAILABLE_EXAM,

                MessageType.START_EXAM,
                MessageType.GET_EXAM_ATTEMPT,
                MessageType.SAVE_ANSWER,
                MessageType.SUBMIT_EXAM,

                MessageType.GET_ATTEMPT_HISTORY,
                MessageType.GET_ATTEMPT_RESULT,

                MessageType.GET_EXAM_SUBMISSIONS,
                MessageType.GET_SUBMISSION_RESULT,

                MessageType.REPORT_ACTIVITY,
                MessageType.GET_EXAM_MONITORING,
                MessageType.GET_TEACHER_MONITORING);

        assertEquals(
                expectedClientCommandTypes,
                actualClientCommandTypes);
    }

    @Test
    void rejectsServerOnlyMessageTypesFromClient() {
        Set<MessageType> actualServerOnlyMessageTypes =
                Stream.of(MessageType.values())
                        .filter(messageType ->
                                !messageType.isAcceptedFromClient())
                        .collect(Collectors.toSet());

        Set<MessageType> expectedServerOnlyMessageTypes = Set.of(
                MessageType.CONNECTED,

                MessageType.PONG,

                MessageType.REGISTERED,

                MessageType.LOGGED_IN,

                MessageType.SESSION_RESUMED,
                MessageType.LOGGED_OUT,

                MessageType.PROFILE_DETAILS,
                MessageType.PROFILE_UPDATED,
                MessageType.PASSWORD_CHANGED,

                MessageType.STUDENTS,
                MessageType.STUDENT_DETAILS,
                MessageType.STUDENT_CREATED,
                MessageType.STUDENTS_IMPORTED,
                MessageType.STUDENT_UPDATED,
                MessageType.STUDENT_DELETED,
                MessageType.COURSE_CREATED,
                MessageType.COURSE_UPDATED,
                MessageType.COURSE_ARCHIVED,
                MessageType.COURSE_RESTORED,
                MessageType.COURSES,
                MessageType.COURSE_DETAILS,
                MessageType.STUDENT_ENROLLED,
                MessageType.STUDENT_UNENROLLED,
                MessageType.COURSE_STUDENT_CREATED,
                MessageType.COURSE_STUDENTS_IMPORTED,

                MessageType.TEACHER_DASHBOARD,

                MessageType.EXAM_CREATED,
                MessageType.TEACHER_EXAMS,
                MessageType.EXAM_DETAILS,
                MessageType.EXAM_UPDATED,
                MessageType.EXAM_PUBLISHED,
                MessageType.EXAM_CLOSED,
                MessageType.EXAM_DELETED,

                MessageType.QUESTION_CREATED,
                MessageType.QUESTION_UPDATED,
                MessageType.QUESTION_DELETED,
                MessageType.EXAM_QUESTIONS,

                MessageType.AVAILABLE_EXAMS,
                MessageType.AVAILABLE_EXAM_DETAILS,

                MessageType.EXAM_STARTED,
                MessageType.EXAM_ATTEMPT_DETAILS,
                MessageType.ANSWER_SAVED,
                MessageType.EXAM_SUBMITTED,

                MessageType.ATTEMPT_HISTORY,
                MessageType.ATTEMPT_RESULT,

                MessageType.EXAM_SUBMISSIONS,
                MessageType.SUBMISSION_RESULT,

                MessageType.ACTIVITY_RECORDED,
                MessageType.EXAM_MONITORING,
                MessageType.TEACHER_MONITORING,

                MessageType.ERROR);

        assertEquals(
                expectedServerOnlyMessageTypes,
                actualServerOnlyMessageTypes);
    }
}
