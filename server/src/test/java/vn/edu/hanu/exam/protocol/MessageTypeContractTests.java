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
                Set<String> actualMessageTypes = Stream.of(MessageType.values())
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

                                "CREATE_EXAM",
                                "EXAM_CREATED",

                                "GET_TEACHER_DASHBOARD",
                                "TEACHER_DASHBOARD",

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

                                "GET_EXAM_QUESTIONS",
                                "EXAM_QUESTIONS",

                                "GET_AVAILABLE_EXAMS",
                                "AVAILABLE_EXAMS",

                                "GET_AVAILABLE_EXAM",
                                "AVAILABLE_EXAM_DETAILS",

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
                                                MessageType.fromWireValue(" get_teacher_dashboard ").orElseThrow()),
                                () -> assertEquals(
                                                MessageType.CREATE_EXAM,
                                                MessageType.fromWireValue(" create_exam ").orElseThrow()),
                                () -> assertEquals(
                                                MessageType.GET_EXAM_QUESTIONS,
                                                MessageType.fromWireValue("get_exam_questions").orElseThrow()),
                                () -> assertEquals(
                                                MessageType.UPDATE_EXAM,
                                                MessageType.fromWireValue(" update_exam ").orElseThrow()),
                                () -> assertEquals(
                                                MessageType.PUBLISH_EXAM,
                                                MessageType.fromWireValue(" publish_exam ").orElseThrow()),
                                () -> assertEquals(
                                                MessageType.CLOSE_EXAM,
                                                MessageType.fromWireValue(" close_exam ").orElseThrow()),
                                () -> assertEquals(
                                                MessageType.DELETE_EXAM,
                                                MessageType.fromWireValue(" delete_exam ").orElseThrow()));
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
                Set<MessageType> actualClientCommandTypes = Stream.of(MessageType.values())
                                .filter(MessageType::isAcceptedFromClient)
                                .collect(Collectors.toSet());

                Set<MessageType> expectedClientCommandTypes = Set.of(
                                MessageType.PING,
                                MessageType.REGISTER,
                                MessageType.LOGIN,

                                MessageType.CREATE_EXAM,
                                MessageType.GET_TEACHER_DASHBOARD,
                                MessageType.GET_TEACHER_EXAMS,
                                MessageType.GET_EXAM,
                                MessageType.UPDATE_EXAM,
                                MessageType.PUBLISH_EXAM,
                                MessageType.CLOSE_EXAM,
                                MessageType.DELETE_EXAM,

                                MessageType.CREATE_QUESTION,
                                MessageType.GET_EXAM_QUESTIONS,

                                MessageType.GET_AVAILABLE_EXAMS,
                                MessageType.GET_AVAILABLE_EXAM);

                assertEquals(
                                expectedClientCommandTypes,
                                actualClientCommandTypes);
        }

        @Test
        void rejectsServerOnlyMessageTypesFromClient() {
                Set<MessageType> actualServerOnlyMessageTypes = Stream.of(MessageType.values())
                                .filter(messageType -> !messageType.isAcceptedFromClient())
                                .collect(Collectors.toSet());

                Set<MessageType> expectedServerOnlyMessageTypes = Set.of(
                                MessageType.CONNECTED,

                                MessageType.PONG,

                                MessageType.REGISTERED,

                                MessageType.LOGGED_IN,

                                MessageType.EXAM_CREATED,
                                MessageType.TEACHER_DASHBOARD,
                                MessageType.TEACHER_EXAMS,
                                MessageType.EXAM_DETAILS,
                                MessageType.EXAM_UPDATED,
                                MessageType.EXAM_PUBLISHED,
                                MessageType.EXAM_CLOSED,
                                MessageType.EXAM_DELETED,

                                MessageType.QUESTION_CREATED,
                                MessageType.EXAM_QUESTIONS,

                                MessageType.AVAILABLE_EXAMS,
                                MessageType.AVAILABLE_EXAM_DETAILS,

                                MessageType.ERROR);

                assertEquals(
                                expectedServerOnlyMessageTypes,
                                actualServerOnlyMessageTypes);
        }
}
