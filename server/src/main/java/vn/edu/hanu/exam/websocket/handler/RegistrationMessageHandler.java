package vn.edu.hanu.exam.websocket.handler;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;
import vn.edu.hanu.exam.exception.RegistrationException;
import vn.edu.hanu.exam.protocol.ServerMessage;
import vn.edu.hanu.exam.service.RegisterUserCommand;
import vn.edu.hanu.exam.service.RegisteredUser;
import vn.edu.hanu.exam.service.RegistrationService;
import vn.edu.hanu.exam.websocket.dto.RegisterPayload;

/**
 * Xử lý message REGISTER.
 *
 * REGISTER payload -> RegisterPayload -> RegisterUserCommand
 *     -> RegistrationService.registerStudent(...) -> REGISTERED hoặc ERROR
 *
 * Class này chỉ chuyển đổi message. Validation, BCrypt và lưu database
 * nằm trong RegistrationService.
 */
@Component
public class RegistrationMessageHandler {

    static final String TYPE_REGISTERED = "REGISTERED";
    static final String CODE_INVALID_PAYLOAD = "INVALID_REGISTER_PAYLOAD";
    static final String CODE_INTERNAL_ERROR = "INTERNAL_ERROR";

    private static final Logger LOGGER = LoggerFactory.getLogger(RegistrationMessageHandler.class);

    private final RegistrationService registrationService;
    private final JsonMapper jsonMapper;

    public RegistrationMessageHandler(RegistrationService registrationService, JsonMapper jsonMapper) {
        this.registrationService = registrationService;
        this.jsonMapper = jsonMapper;
    }

    /**
     * @param requestId requestId của client, giữ nguyên trong response
     * @param payload   phần payload của ClientMessage (có thể null)
     * @return REGISTERED nếu thành công, ngược lại là ERROR
     */
    public ServerMessage handle(String requestId, Map<String, Object> payload) {
        if (payload == null) {
            return ServerMessage.error(requestId, CODE_INVALID_PAYLOAD,
                    "Register payload is required.");
        }

        RegisterPayload registerPayload;
        try {
            registerPayload = jsonMapper.convertValue(payload, RegisterPayload.class);
        } catch (JacksonException | IllegalArgumentException exception) {
            // Không log payload vì có chứa mật khẩu.
            LOGGER.warn("Cannot convert REGISTER payload: requestId={}", requestId);
            return ServerMessage.error(requestId, CODE_INVALID_PAYLOAD,
                    "Register payload is invalid.");
        }

        try {
            RegisterUserCommand command = new RegisterUserCommand(
                    registerPayload.username(),
                    registerPayload.password(),
                    registerPayload.fullName(),
                    registerPayload.email());

            RegisteredUser registeredUser = registrationService.registerStudent(command);
            return ServerMessage.success(requestId, TYPE_REGISTERED, registeredUser);
        } catch (RegistrationException exception) {
            LOGGER.info("Registration rejected: requestId={}, code={}", requestId, exception.code());
            return ServerMessage.error(requestId, exception.code(), exception.getMessage());
        } catch (RuntimeException exception) {
            // Log đầy đủ ở server, client chỉ nhận thông báo chung.
            LOGGER.error("Unexpected error while handling REGISTER: requestId={}", requestId, exception);
            return ServerMessage.error(requestId, CODE_INTERNAL_ERROR, "An unexpected error occurred.");
        }
    }
}
