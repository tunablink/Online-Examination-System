package vn.edu.hanu.exam.service;

public record RegisterUserCommand(String username, String password, String fullName, String email) {
    
}
