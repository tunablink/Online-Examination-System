package vn.edu.hanu.exam.domain;

public record NewUser(
    String institutionalId,
    String passwordHash,
    String fullName,
    String email,
    UserRole role
) {}
