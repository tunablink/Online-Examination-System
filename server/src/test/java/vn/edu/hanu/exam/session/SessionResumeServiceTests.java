package vn.edu.hanu.exam.session;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.time.*;
import java.util.Optional;

import org.junit.jupiter.api.Test;

import vn.edu.hanu.exam.domain.User;
import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.repository.UserRepository;
import vn.edu.hanu.exam.service.LoggedInUser;

class SessionResumeServiceTests {
    private static class TestClock extends Clock {
        Instant time = Instant.parse("2026-10-28T00:00:00Z");
        public ZoneId getZone() { return ZoneOffset.UTC; }
        public Clock withZone(ZoneId zone) { return this; }
        public Instant instant() { return time; }
    }
    private final UserRepository users = mock(UserRepository.class);
    private final TestClock clock = new TestClock();
    private final SessionResumeService service = new SessionResumeService(users, clock);
    private User user(String hash, boolean active) {
        return new User(1, "student", hash, "Student", "s@example.com", null, UserRole.STUDENT,
                active, OffsetDateTime.now(), OffsetDateTime.now());
    }
    private SessionResumeService.Details issue() {
        when(users.findById(1)).thenReturn(Optional.of(user("hash", true)));
        return service.issue("first", new LoggedInUser(1, "student", "Student", "s@example.com", UserRole.STUDENT));
    }
    @Test
    void disconnectAllowsResumeWithoutChangingExpiry() {
        var issued = issue();
        assertEquals(43, issued.sessionToken().length());
        assertTrue(service.isLive("first"));
        service.detach("first");
        assertFalse(service.isLive("first"));
        assertEquals(issued, service.resume("second", issued.sessionToken()));
        assertTrue(service.isLive("second"));
    }
    @Test
    void expiredAndUnknownTokensCannotResume() {
        var issued = issue();
        assertThrows(IllegalArgumentException.class, () -> service.resume("other", "invalid"));
        clock.time = clock.time.plus(Duration.ofHours(8));
        assertFalse(service.isLive("first"));
        assertThrows(IllegalArgumentException.class, () -> service.resume("second", issued.sessionToken()));
    }
    @Test
    void logoutRevokesCredentialOnEveryBoundSocket() {
        var issued = issue();
        service.resume("second", issued.sessionToken());
        service.revoke("second");
        assertFalse(service.isLive("first"));
        assertThrows(IllegalArgumentException.class, () -> service.resume("third", issued.sessionToken()));
    }
    @Test
    void passwordChangeInvalidatesResume() {
        var issued = issue();
        when(users.findById(1)).thenReturn(Optional.of(user("changed-hash", true)));
        assertThrows(IllegalArgumentException.class, () -> service.resume("second", issued.sessionToken()));
    }
    @Test
    void disabledAccountCannotResume() {
        var issued = issue();
        when(users.findById(1)).thenReturn(Optional.of(user("hash", false)));
        assertThrows(IllegalArgumentException.class, () -> service.resume("second", issued.sessionToken()));
    }
}
