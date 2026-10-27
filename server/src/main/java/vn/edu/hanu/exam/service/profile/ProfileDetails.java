package vn.edu.hanu.exam.service.profile;

import java.time.OffsetDateTime;

import vn.edu.hanu.exam.domain.User;
import vn.edu.hanu.exam.domain.UserRole;

public record ProfileDetails(
        long id,
        String username,
        String fullName,
        String email,
        String department,
        UserRole role,
        boolean active,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {

    public static ProfileDetails from(User user) {
        return new ProfileDetails(
                user.id(),
                user.username(),
                user.fullName(),
                user.email(),
                user.department(),
                user.role(),
                user.active(),
                user.createdAt(),
                user.updatedAt());
    }
}
