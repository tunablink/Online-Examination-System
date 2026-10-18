package vn.edu.hanu.exam.service;

import java.time.OffsetDateTime;
import vn.edu.hanu.exam.domain.User;
import vn.edu.hanu.exam.domain.UserRole;

public record RegisteredUser(long id, String username, String fullName, String email, UserRole role, boolean active, OffsetDateTime createdAt) {
    public static RegisteredUser from(User user){
        return new  RegisteredUser(user.id(), user.username(), user.fullName(), user.email(), user.role(), user.active(), user.createdAt());
    }
}
