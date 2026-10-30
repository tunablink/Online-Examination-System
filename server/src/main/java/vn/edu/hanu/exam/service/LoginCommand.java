package vn.edu.hanu.exam.service;

import java.util.Locale;

public record LoginCommand(String institutionalId, String password) {

    public LoginCommand {
        if (institutionalId == null || institutionalId.isBlank()) {
            throw new IllegalArgumentException("InstitutionalId must not be null or blank.");
        }
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("Password must not be null or blank.");
        }
        institutionalId = institutionalId.trim().toLowerCase(Locale.ROOT);
    }
}
