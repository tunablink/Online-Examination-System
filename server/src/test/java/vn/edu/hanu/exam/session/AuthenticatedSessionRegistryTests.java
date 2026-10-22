package vn.edu.hanu.exam.session;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.service.LoggedInUser;

class AuthenticatedSessionRegistryTests {

    private AuthenticatedSessionRegistry registry;

    @BeforeEach
    void setUp() {
        registry =
                new AuthenticatedSessionRegistry();
    }

    @Test
    void authenticateStoresUserForSession() {
        LoggedInUser user = createStudent();

        registry.authenticate(
                "session-001",
                user
        );

        assertThat(
                registry.findUser("session-001")
        ).contains(user);

        assertThat(
                registry.isAuthenticated("session-001")
        ).isTrue();

        assertThat(
                registry.getAuthenticatedSessionCount()
        ).isEqualTo(1);
    }

    @Test
    void unknownSessionIsNotAuthenticated() {
        assertThat(
                registry.findUser("unknown-session")
        ).isEmpty();

        assertThat(
                registry.isAuthenticated("unknown-session")
        ).isFalse();
    }

    @Test
    void removeClearsAuthenticatedSession() {
        LoggedInUser user = createStudent();

        registry.authenticate(
                "session-001",
                user
        );

        registry.remove("session-001");

        assertThat(
                registry.findUser("session-001")
        ).isEmpty();

        assertThat(
                registry.getAuthenticatedSessionCount()
        ).isZero();
    }

    @Test
    void authenticatingSameSessionReplacesPreviousUser() {
        LoggedInUser firstUser =
                new LoggedInUser(
                        1L,
                        "student01",
                        "Student One",
                        "student01@example.com",
                        UserRole.STUDENT
                );

        LoggedInUser secondUser =
                new LoggedInUser(
                        2L,
                        "student02",
                        "Student Two",
                        "student02@example.com",
                        UserRole.STUDENT
                );

        registry.authenticate(
                "session-001",
                firstUser
        );

        registry.authenticate(
                "session-001",
                secondUser
        );

        assertThat(
                registry.findUser("session-001")
        ).contains(secondUser);

        assertThat(
                registry.getAuthenticatedSessionCount()
        ).isEqualTo(1);
    }

    private static LoggedInUser createStudent() {
        return new LoggedInUser(
                1L,
                "student01",
                "Student One",
                "student01@example.com",
                UserRole.STUDENT
        );
    }
}