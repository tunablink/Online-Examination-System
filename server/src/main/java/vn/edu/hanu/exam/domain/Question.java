package vn.edu.hanu.exam.domain;

import java.time.OffsetDateTime;

public record Question(
    long id,
    long examId,              // FK → exams.id
    String content,
    int points,
    int displayOrder,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}
