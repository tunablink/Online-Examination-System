package vn.edu.hanu.exam.websocket.handler;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;
import vn.edu.hanu.exam.exception.ProfileManagementException;
import vn.edu.hanu.exam.protocol.ClientMessage;
import vn.edu.hanu.exam.protocol.ServerMessage;
import vn.edu.hanu.exam.service.LoggedInUser;
import vn.edu.hanu.exam.service.profile.ProfileManagementService;
import vn.edu.hanu.exam.session.AuthenticatedSessionRegistry;
import vn.edu.hanu.exam.websocket.dto.ChangePasswordPayload;
import vn.edu.hanu.exam.websocket.dto.UpdateProfilePayload;

@Component
public class ProfileManagementMessageHandler {
    private static final Logger LOGGER = LoggerFactory.getLogger(ProfileManagementMessageHandler.class);

    private final ProfileManagementService profileService;
    private final AuthenticatedSessionRegistry sessionRegistry;
    private final JsonMapper jsonMapper;

    public ProfileManagementMessageHandler(
            ProfileManagementService profileService,
            AuthenticatedSessionRegistry sessionRegistry,
            JsonMapper jsonMapper) {
        this.profileService = profileService;
        this.sessionRegistry = sessionRegistry;
        this.jsonMapper = jsonMapper;
    }

    public ServerMessage handleGet(WebSocketSession session, ClientMessage message) {
        LoggedInUser user = authenticatedUser(session.getId());
        if (user == null) {
            return authenticationRequired(message.requestId());
        }

        try {
            return ServerMessage.success(
                    message.requestId(),
                    "PROFILE_DETAILS",
                    profileService.getProfile(user.id()));
        } catch (ProfileManagementException exception) {
            return businessError(message.requestId(), exception);
        }
    }

    public ServerMessage handleUpdate(WebSocketSession session, ClientMessage message) {
        LoggedInUser user = authenticatedUser(session.getId());
        if (user == null) {
            return authenticationRequired(message.requestId());
        }

        try {
            UpdateProfilePayload payload = convert(message.payload(), UpdateProfilePayload.class);
            return ServerMessage.success(
                    message.requestId(),
                    "PROFILE_UPDATED",
                    profileService.updateDepartment(user.id(), user.role(), payload.department()));
        } catch (InvalidPayloadException exception) {
            return invalidPayload(message.requestId());
        } catch (ProfileManagementException exception) {
            return businessError(message.requestId(), exception);
        }
    }

    public ServerMessage handleChangePassword(WebSocketSession session, ClientMessage message) {
        LoggedInUser user = authenticatedUser(session.getId());
        if (user == null) {
            return authenticationRequired(message.requestId());
        }

        try {
            ChangePasswordPayload payload = convert(message.payload(), ChangePasswordPayload.class);
            profileService.changePassword(user.id(), payload.currentPassword(), payload.newPassword());
            return ServerMessage.success(
                    message.requestId(),
                    "PASSWORD_CHANGED",
                    Map.of("message", "Password changed successfully."));
        } catch (InvalidPayloadException exception) {
            return invalidPayload(message.requestId());
        } catch (ProfileManagementException exception) {
            return businessError(message.requestId(), exception);
        }
    }

    private LoggedInUser authenticatedUser(String sessionId) {
        return sessionRegistry.findUser(sessionId).orElse(null);
    }

    private <T> T convert(Map<String, Object> payload, Class<T> type) {
        if (payload == null) {
            throw new InvalidPayloadException();
        }
        try {
            return jsonMapper.convertValue(payload, type);
        } catch (JacksonException | IllegalArgumentException exception) {
            throw new InvalidPayloadException();
        }
    }

    private static ServerMessage authenticationRequired(String requestId) {
        return ServerMessage.error(requestId, "AUTHENTICATION_REQUIRED", "Authentication is required.");
    }

    private static ServerMessage invalidPayload(String requestId) {
        return ServerMessage.error(requestId, "INVALID_PAYLOAD", "The request payload is invalid.");
    }

    private static ServerMessage businessError(String requestId, ProfileManagementException exception) {
        LOGGER.info("Profile operation rejected: requestId={}, code={}", requestId, exception.code());
        return ServerMessage.error(requestId, exception.code(), exception.getMessage());
    }

    private static final class InvalidPayloadException extends RuntimeException {
    }
}
