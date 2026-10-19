package vn.edu.hanu.exam.domain;

import java.time.OffsetDateTime;

public record Exam(
    long id,
    String title,
    String description,       // nullable – không bắt buộc theo yêu cầu
    int durationMinutes,
    ExamStatus status,
    long createdBy,           // FK → users.id
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}
