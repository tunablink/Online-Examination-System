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

                "CREATE_EXAM",
                "EXAM_CREATED",

                "GET_TEACHER_EXAMS",
                "TEACHER_EXAMS",

                "GET_EXAM",
                "EXAM_DETAILS",

                "CREATE_QUESTION",
                "QUESTION_CREATED",

                "GET_EXAM_QUESTIONS",
                "EXAM_QUESTIONS",

                "GET_AVAILABLE_EXAMS",
                "AVAILABLE_EXAMS",

                "GET_AVAILABLE_EXAM",
                "AVAILABLE_EXAM_DETAILS",

                "ERROR"
        );

        assertEquals(
                expectedMessageTypes,
                actualMessageTypes
        );
    }

    @Test
    void parsesKnownMessageTypesWithoutDependingOnCaseOrSpaces() {
        assertAll(
                () -> assertEquals(
                        MessageType.PING,
                        MessageType.fromWireValue("PING").orElseThrow()
                ),
                () -> assertEquals(
                        MessageType.REGISTER,
                        MessageType.fromWireValue(" register ").orElseThrow()
                ),
                () -> assertEquals(
                        MessageType.LOGIN,
                        MessageType.fromWireValue("LoGiN").orElseThrow()
                ),
                () -> assertEquals(
                        MessageType.CREATE_EXAM,
                        MessageType.fromWireValue(" create_exam ").orElseThrow()
                ),
                () -> assertEquals(
                        MessageType.GET_EXAM_QUESTIONS,
                        MessageType.fromWireValue("get_exam_questions").orElseThrow()
                )
        );
    }

    @Test
    void rejectsMissingOrUnsupportedMessageTypes() {
        assertAll(
                () -> assertTrue(
                        MessageType.fromWireValue(null).isEmpty()
                ),
                () -> assertTrue(
                        MessageType.fromWireValue("").isEmpty()
                ),
                () -> assertTrue(
                        MessageType.fromWireValue("   ").isEmpty()
                ),
                () -> assertTrue(
                        MessageType.fromWireValue("UNKNOWN").isEmpty()
                )
        );
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

                MessageType.CREATE_EXAM,
                MessageType.GET_TEACHER_EXAMS,
                MessageType.GET_EXAM,

                MessageType.CREATE_QUESTION,
                MessageType.GET_EXAM_QUESTIONS,

                MessageType.GET_AVAILABLE_EXAMS,
                MessageType.GET_AVAILABLE_EXAM
        );

        assertEquals(
                expectedClientCommandTypes,
                actualClientCommandTypes
        );
    }

    @Test
    void rejectsServerOnlyMessageTypesFromClient() {
        Set<MessageType> actualServerOnlyMessageTypes =
                Stream.of(MessageType.values())
                        .filter(messageType -> !messageType.isAcceptedFromClient())
                        .collect(Collectors.toSet());

        Set<MessageType> expectedServerOnlyMessageTypes = Set.of(
                MessageType.CONNECTED,

                MessageType.PONG,

                MessageType.REGISTERED,

                MessageType.LOGGED_IN,

                MessageType.EXAM_CREATED,
                MessageType.TEACHER_EXAMS,
                MessageType.EXAM_DETAILS,

                MessageType.QUESTION_CREATED,
                MessageType.EXAM_QUESTIONS,

                MessageType.AVAILABLE_EXAMS,
                MessageType.AVAILABLE_EXAM_DETAILS,

                MessageType.ERROR
        );

        assertEquals(
                expectedServerOnlyMessageTypes,
                actualServerOnlyMessageTypes
        );
    }
}