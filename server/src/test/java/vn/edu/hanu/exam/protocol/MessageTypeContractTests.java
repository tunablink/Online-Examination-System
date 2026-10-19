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
                        MessageType.ERROR.isAcceptedFromClient()
                )
        );
    }
}
