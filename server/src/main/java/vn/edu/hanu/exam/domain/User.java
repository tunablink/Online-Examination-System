package vn.edu.hanu.exam.domain;

import java.time.OffsetDateTime;

public record User (
    long id,
    String username,
    String passwordHash,
    String fullName,
    String email,
    UserRole role,
    boolean active,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
){}

