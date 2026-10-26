package vn.edu.hanu.exam.service.student;

import java.time.OffsetDateTime;

public record StudentDetails(
        long id,
        String username,
        String fullName,
        String email,
        boolean active,
        OffsetDateTime createdAt) {
}
