package vn.edu.hanu.exam.domain;

/**
 * Ánh xạ một lựa chọn trắc nghiệm từ bảng choices.
 *
 * <p><strong>Bảo mật:</strong> Trường {@code correct} chỉ được sử dụng phía
 * server (chấm điểm, kiểm tra đáp án). Không được serialize trực tiếp record
 * này thành JSON gửi cho student client. Khi trả dữ liệu về client, phải dùng
 * DTO riêng không chứa trường {@code correct}.</p>
 */
public record Choice(
    long id,
    long questionId,          // FK → questions.id
    String content,
    boolean correct,          // SERVER-SIDE ONLY – không lộ cho student client
    int displayOrder
) {}
