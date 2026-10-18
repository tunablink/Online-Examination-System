package vn.edu.hanu.exam.service;

import vn.edu.hanu.exam.domain.User;
import vn.edu.hanu.exam.domain.UserRole;

public record LoggedInUser(long id, String username, String fullName, String email, UserRole role) {

    public static LoggedInUser from(User user) {
        return new LoggedInUser(user.id(), user.username(), user.fullName(), user.email(), user.role());
    }
}
