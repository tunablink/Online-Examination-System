package vn.edu.hanu.exam.domain;

import java.time.OffsetDateTime;

public record User (
    long id,
    String institutionalId,
    String passwordHash,
    String fullName,
    String email,
    String department,
    UserRole role,
    boolean active,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
){}

