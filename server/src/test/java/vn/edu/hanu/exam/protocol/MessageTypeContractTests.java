package vn.edu.hanu.exam.protocol;

import static org.junit.jupiter.api.Assertions.assertFalse;
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
                "UPDATE_EXAM",
                "EXAM_UPDATED",
                "PUBLISH_EXAM",
                "EXAM_PUBLISHED",
                "CLOSE_EXAM",
                "EXAM_CLOSED",
                "DELETE_EXAM",
                "EXAM_DELETED",
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
        assertAll(
                () -> assertTrue(
                        MessageType.PING.isAcceptedFromClient()
                ),
                () -> assertTrue(
                        MessageType.REGISTER.isAcceptedFromClient()
                ),
                () -> assertTrue(
                        MessageType.LOGIN.isAcceptedFromClient()
                ),
                () -> assertTrue(
                        MessageType.CREATE_EXAM.isAcceptedFromClient()
                ),
                () -> assertTrue(
                        MessageType.GET_TEACHER_EXAMS.isAcceptedFromClient()
                ),
                () -> assertTrue(
                        MessageType.GET_EXAM.isAcceptedFromClient()
                ),
                () -> assertTrue(
                        MessageType.UPDATE_EXAM.isAcceptedFromClient()
                ),
                () -> assertTrue(
                        MessageType.PUBLISH_EXAM.isAcceptedFromClient()
                ),
                () -> assertTrue(
                        MessageType.CLOSE_EXAM.isAcceptedFromClient()
                ),
                () -> assertTrue(
                        MessageType.DELETE_EXAM.isAcceptedFromClient()
                )
        );
    }

    @Test
    void rejectsServerOnlyMessageTypesFromClient() {
        assertAll(
                () -> assertFalse(
                        MessageType.CONNECTED.isAcceptedFromClient()
                ),
                () -> assertFalse(
                        MessageType.PONG.isAcceptedFromClient()
                ),
                () -> assertFalse(
                        MessageType.REGISTERED.isAcceptedFromClient()
                ),
                () -> assertFalse(
                        MessageType.LOGGED_IN.isAcceptedFromClient()
                ),
                () -> assertFalse(
                        MessageType.EXAM_CREATED.isAcceptedFromClient()
                ),
                () -> assertFalse(
                        MessageType.TEACHER_EXAMS.isAcceptedFromClient()
                ),
                () -> assertFalse(
                        MessageType.EXAM_DETAILS.isAcceptedFromClient()
                ),
                () -> assertFalse(
                        MessageType.EXAM_UPDATED.isAcceptedFromClient()
                ),
                () -> assertFalse(
                        MessageType.EXAM_PUBLISHED.isAcceptedFromClient()
                ),
                () -> assertFalse(
                        MessageType.EXAM_CLOSED.isAcceptedFromClient()
                ),
                () -> assertFalse(
                        MessageType.EXAM_DELETED.isAcceptedFromClient()
                ),
                () -> assertFalse(
                        MessageType.ERROR.isAcceptedFromClient()
                )
        );
    }
}
