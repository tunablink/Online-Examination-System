package vn.edu.hanu.exam.websocket.dto;

public record ChangePasswordPayload(String currentPassword, String newPassword) {
}
