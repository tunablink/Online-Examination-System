package vn.edu.hanu.exam.service.exam;

public record CreateExamCommand(String title, String description, int durationMinutes) {}
