package vn.edu.hanu.exam.service.profile;

import java.nio.charset.StandardCharsets;

import org.springframework.dao.DataAccessException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import vn.edu.hanu.exam.domain.User;
import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.exception.ProfileManagementException;
import vn.edu.hanu.exam.repository.UserRepository;

@Service
public class ProfileManagementService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public ProfileManagementService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public ProfileDetails getProfile(long userId) {
        return ProfileDetails.from(findUser(userId));
    }

    public ProfileDetails updateDepartment(long userId, UserRole role, String department) {
        if (role != UserRole.TEACHER) {
            throw new ProfileManagementException(
                    "FIELD_NOT_EDITABLE",
                    "Only teachers can update a department.");
        }

        String normalizedDepartment = normalizeDepartment(department);

        try {
            return ProfileDetails.from(userRepository.updateDepartment(userId, normalizedDepartment));
        } catch (DataAccessException | IllegalStateException exception) {
            throw new ProfileManagementException(
                    "DATABASE_ERROR",
                    "The profile could not be updated.",
                    exception);
        }
    }

    public void changePassword(long userId, String currentPassword, String newPassword) {
        if (currentPassword == null || currentPassword.isBlank()) {
            throw new ProfileManagementException(
                    "CURRENT_PASSWORD_REQUIRED",
                    "Enter the current password.");
        }
        if (newPassword == null
                || newPassword.length() < 8
                || newPassword.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ProfileManagementException(
                    "INVALID_NEW_PASSWORD",
                    "The new password must contain at least 8 characters and no more than 72 UTF-8 bytes.");
        }
        if (currentPassword.equals(newPassword)) {
            throw new ProfileManagementException(
                    "PASSWORD_UNCHANGED",
                    "The new password must be different from the current password.");
        }

        User user = findUser(userId);
        if (!passwordEncoder.matches(currentPassword, user.passwordHash())) {
            throw new ProfileManagementException(
                    "INVALID_CURRENT_PASSWORD",
                    "The current password is incorrect.");
        }

        try {
            userRepository.updatePasswordHash(userId, passwordEncoder.encode(newPassword));
        } catch (DataAccessException | IllegalStateException exception) {
            throw new ProfileManagementException(
                    "DATABASE_ERROR",
                    "The password could not be changed.",
                    exception);
        }
    }

    private User findUser(long userId) {
        try {
            return userRepository.findById(userId)
                    .orElseThrow(() -> new ProfileManagementException(
                            "PROFILE_NOT_FOUND",
                            "The authenticated profile no longer exists."));
        } catch (DataAccessException exception) {
            throw new ProfileManagementException(
                    "DATABASE_ERROR",
                    "The profile could not be read.",
                    exception);
        }
    }

    private static String normalizeDepartment(String department) {
        if (department == null) {
            return null;
        }
        String normalized = department.trim().replaceAll("\\s+", " ");
        if (normalized.isEmpty()) {
            return null;
        }
        if (normalized.length() > 120) {
            throw new ProfileManagementException(
                    "INVALID_DEPARTMENT",
                    "Department must not exceed 120 characters.");
        }
        return normalized;
    }
}
