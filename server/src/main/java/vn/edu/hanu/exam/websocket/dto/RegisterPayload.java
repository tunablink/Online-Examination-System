package vn.edu.hanu.exam.websocket.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Payload của message {@code REGISTER} do client gửi lên.
 *
 * <p>Chỉ chứa dữ liệu thô từ client. Việc validate, chuẩn hóa và hash mật khẩu
 * thuộc về {@code RegistrationService}, không làm ở đây.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record RegisterPayload(
        String username,
        String password,
        String fullName,
        String email) {

    /**
     * Ghi đè toString của record để raw password không bao giờ xuất hiện trong log.
     */
    @Override
    public String toString() {
        return "RegisterPayload[username=" + username
                + ", fullName=" + fullName
                + ", email=" + email
                + ", password=***]";
    }
}
