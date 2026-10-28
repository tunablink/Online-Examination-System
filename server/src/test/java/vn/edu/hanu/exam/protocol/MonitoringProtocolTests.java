package vn.edu.hanu.exam.protocol;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class MonitoringProtocolTests {
    @Test
    void monitoringCommandsAndResponsesHaveCorrectDirection() {
        assertTrue(MessageType.REPORT_ACTIVITY.isAcceptedFromClient());
        assertTrue(MessageType.GET_EXAM_MONITORING.isAcceptedFromClient());
        assertFalse(MessageType.ACTIVITY_RECORDED.isAcceptedFromClient());
        assertFalse(MessageType.EXAM_MONITORING.isAcceptedFromClient());
        assertTrue(MessageType.GET_TEACHER_MONITORING.isAcceptedFromClient());
        assertFalse(MessageType.TEACHER_MONITORING.isAcceptedFromClient());
    }
}
