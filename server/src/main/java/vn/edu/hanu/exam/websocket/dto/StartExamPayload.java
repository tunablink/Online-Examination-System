package vn.edu.hanu.exam.websocket.dto;

public record StartExamPayload(Long examId, String enrollmentKey) {
    @Override public String toString() { return "StartExamPayload[examId=" + examId + ", enrollmentKey=REDACTED]"; }
}
