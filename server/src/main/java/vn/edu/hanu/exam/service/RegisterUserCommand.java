package vn.edu.hanu.exam.service;

public record RegisterUserCommand(String institutionalId, String password, String fullName, String email) {
    
}
