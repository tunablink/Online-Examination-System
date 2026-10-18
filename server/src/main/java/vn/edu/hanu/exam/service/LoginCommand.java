package vn.edu.hanu.exam.service;

import java.util.Locale;

public record LoginCommand(String username, String password) {

    public LoginCommand {
        if (username == null || username.isBlank()) {
            throw new IllegalArgumentException("Username must not be null or blank.");
        }
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("Password must not be null or blank.");
        }
        username = username.trim().toLowerCase(Locale.ROOT);
    }
}
