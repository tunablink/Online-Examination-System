package vn.edu.hanu.exam.service.profile;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import vn.edu.hanu.exam.domain.User;
import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.exception.ProfileManagementException;
import vn.edu.hanu.exam.repository.UserRepository;

class ProfileManagementServiceTests {
    private static final OffsetDateTime NOW = OffsetDateTime.parse("2026-10-27T09:00:00+07:00");

    @Test
    void returnsSafeProfileWithoutPasswordHash() {
        UserRepository repository = mock(UserRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(repository.findById(7L)).thenReturn(Optional.of(user(UserRole.STUDENT, null)));

        ProfileDetails profile = new ProfileManagementService(repository, encoder).getProfile(7L);

        assertEquals(7L, profile.id());
        assertEquals("student07", profile.username());
        assertNull(profile.department());
    }

    @Test
    void teacherCanUpdateNormalizedDepartment() {
        UserRepository repository = mock(UserRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(repository.updateDepartment(7L, "Computer Science"))
                .thenReturn(user(UserRole.TEACHER, "Computer Science"));

        ProfileDetails profile = new ProfileManagementService(repository, encoder)
                .updateDepartment(7L, UserRole.TEACHER, "  Computer   Science  ");

        assertEquals("Computer Science", profile.department());
        verify(repository).updateDepartment(7L, "Computer Science");
    }

    @Test
    void studentCannotUpdateDepartment() {
        UserRepository repository = mock(UserRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);

        ProfileManagementException error = assertThrows(
                ProfileManagementException.class,
                () -> new ProfileManagementService(repository, encoder)
                        .updateDepartment(7L, UserRole.STUDENT, "Computer Science"));

        assertEquals("FIELD_NOT_EDITABLE", error.code());
        verify(repository, never()).updateDepartment(7L, "Computer Science");
    }

    @Test
    void changesPasswordOnlyAfterCurrentPasswordMatches() {
        UserRepository repository = mock(UserRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        User user = user(UserRole.STUDENT, null);
        when(repository.findById(7L)).thenReturn(Optional.of(user));
        when(encoder.matches("old-password", user.passwordHash())).thenReturn(true);
        when(encoder.encode("new-password")).thenReturn("new-hash");
        when(repository.updatePasswordHash(7L, "new-hash")).thenReturn(user);

        new ProfileManagementService(repository, encoder)
                .changePassword(7L, "old-password", "new-password");

        verify(repository).updatePasswordHash(7L, "new-hash");
    }

    @Test
    void rejectsIncorrectCurrentPassword() {
        UserRepository repository = mock(UserRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        User user = user(UserRole.STUDENT, null);
        when(repository.findById(7L)).thenReturn(Optional.of(user));
        when(encoder.matches("wrong-password", user.passwordHash())).thenReturn(false);

        ProfileManagementException error = assertThrows(
                ProfileManagementException.class,
                () -> new ProfileManagementService(repository, encoder)
                        .changePassword(7L, "wrong-password", "new-password"));

        assertEquals("INVALID_CURRENT_PASSWORD", error.code());
        verify(repository, never()).updatePasswordHash(7L, "new-hash");
    }

    private static User user(UserRole role, String department) {
        return new User(
                7L,
                "student07",
                "stored-hash",
                "Nguyen Van An",
                "student07@university.edu",
                department,
                role,
                true,
                NOW,
                NOW);
    }
}
