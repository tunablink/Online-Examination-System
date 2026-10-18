package vn.edu.hanu.exam.domain;

public record NewUser(
    String username,
    String passwordHash,
    String fullName,
    String email,
    UserRole role
) {}
