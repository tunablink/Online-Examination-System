package vn.edu.hanu.exam.service.student;

import java.time.OffsetDateTime;

public record StudentDetails(
        long id,
        String institutionalId,
        String fullName,
        String email,
        String department,
        boolean active,
        OffsetDateTime createdAt) {
    public StudentDetails(long id, String institutionalId, String fullName, String email,
            boolean active, OffsetDateTime createdAt) {
        this(id, institutionalId, fullName, email, null, active, createdAt);
    }
}
