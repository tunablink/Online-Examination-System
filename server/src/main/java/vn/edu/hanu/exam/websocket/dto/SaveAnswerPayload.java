package vn.edu.hanu.exam.websocket.dto;

public record SaveAnswerPayload(
        Long attemptId,
        Long questionId,
        Long choiceId) {
}
