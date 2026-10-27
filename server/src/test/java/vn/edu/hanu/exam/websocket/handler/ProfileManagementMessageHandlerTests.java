package vn.edu.hanu.exam.websocket.handler;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.WebSocketSession;

import tools.jackson.databind.json.JsonMapper;
import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.exception.ProfileManagementException;
import vn.edu.hanu.exam.protocol.ClientMessage;
import vn.edu.hanu.exam.protocol.ServerMessage;
import vn.edu.hanu.exam.service.LoggedInUser;
import vn.edu.hanu.exam.service.profile.ProfileDetails;
import vn.edu.hanu.exam.service.profile.ProfileManagementService;
import vn.edu.hanu.exam.session.AuthenticatedSessionRegistry;

class ProfileManagementMessageHandlerTests {
    private static final String SESSION_ID = "profile-session";
    private static final String REQUEST_ID = "profile-request";

    private ProfileManagementService profileService;
    private AuthenticatedSessionRegistry sessionRegistry;
    private ProfileManagementMessageHandler handler;
    private WebSocketSession session;

    @BeforeEach
    void setUp() {
        profileService = mock(ProfileManagementService.class);
        sessionRegistry = new AuthenticatedSessionRegistry();
        handler = new ProfileManagementMessageHandler(
                profileService,
                sessionRegistry,
                JsonMapper.builder().build());
        session = mock(WebSocketSession.class);
        when(session.getId()).thenReturn(SESSION_ID);
    }

    @Test
    void authenticatedUserCanReadOwnProfile() {
        authenticate(UserRole.STUDENT);
        ProfileDetails profile = profile(UserRole.STUDENT, null);
        when(profileService.getProfile(20L)).thenReturn(profile);

        ServerMessage response = handler.handleGet(session, message("GET_PROFILE", Map.of()));

        assertSuccess(response, "PROFILE_DETAILS");
        assertEquals(profile, response.data());
        verify(profileService).getProfile(20L);
    }

    @Test
    void unauthenticatedProfileRequestIsRejected() {
        ServerMessage response = handler.handleGet(session, message("GET_PROFILE", Map.of()));

        assertError(response, "AUTHENTICATION_REQUIRED");
        verify(profileService, never()).getProfile(20L);
    }

    @Test
    void teacherCanUpdateDepartment() {
        authenticate(UserRole.TEACHER);
        ProfileDetails updated = profile(UserRole.TEACHER, "Computer Science");
        when(profileService.updateDepartment(20L, UserRole.TEACHER, "Computer Science"))
                .thenReturn(updated);

        ServerMessage response = handler.handleUpdate(
                session,
                message("UPDATE_PROFILE", Map.of("department", "Computer Science")));

        assertSuccess(response, "PROFILE_UPDATED");
        assertEquals(updated, response.data());
    }

    @Test
    void authenticatedUserCanChangePassword() {
        authenticate(UserRole.STUDENT);

        ServerMessage response = handler.handleChangePassword(
                session,
                message("CHANGE_PASSWORD", Map.of(
                        "currentPassword", "current-password",
                        "newPassword", "new-password")));

        assertSuccess(response, "PASSWORD_CHANGED");
        verify(profileService).changePassword(20L, "current-password", "new-password");
    }

    @Test
    void profileBusinessErrorKeepsSafeCodeAndMessage() {
        authenticate(UserRole.STUDENT);
        when(profileService.getProfile(20L)).thenThrow(
                new ProfileManagementException("PROFILE_NOT_FOUND", "The authenticated profile no longer exists."));

        ServerMessage response = handler.handleGet(session, message("GET_PROFILE", Map.of()));

        assertError(response, "PROFILE_NOT_FOUND");
        assertEquals("The authenticated profile no longer exists.", response.error().message());
    }

    private void authenticate(UserRole role) {
        sessionRegistry.authenticate(
                SESSION_ID,
                new LoggedInUser(20L, "profile-user", "Profile User", "profile@university.edu", role));
    }

    private static ClientMessage message(String type, Map<String, Object> payload) {
        return new ClientMessage(REQUEST_ID, type, payload);
    }

    private static ProfileDetails profile(UserRole role, String department) {
        OffsetDateTime now = OffsetDateTime.parse("2026-10-27T09:00:00+07:00");
        return new ProfileDetails(
                20L,
                "profile-user",
                "Profile User",
                "profile@university.edu",
                department,
                role,
                true,
                now,
                now);
    }

    private static void assertSuccess(ServerMessage response, String type) {
        assertEquals(REQUEST_ID, response.requestId());
        assertEquals(type, response.type());
        assertNotNull(response.data());
        assertNull(response.error());
    }

    private static void assertError(ServerMessage response, String code) {
        assertEquals(REQUEST_ID, response.requestId());
        assertEquals("ERROR", response.type());
        assertNull(response.data());
        assertNotNull(response.error());
        assertEquals(code, response.error().code());
    }
}
