package vn.edu.hanu.exam.websocket;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import tools.jackson.databind.json.JsonMapper;
import vn.edu.hanu.exam.service.LoginService;
import vn.edu.hanu.exam.session.AuthenticatedSessionRegistry;
import vn.edu.hanu.exam.websocket.handler.RegistrationMessageHandler;
/**
 * Unit test cho ExamWebSocketHandler – kiểm tra error handling.
 *
 * Không cần Spring context hay database.
 * Dùng FakeWebSocketSession để bắt các message server gửi ra.
 *
 * Người viết: Hải Yến (fix/websocket-error-handling)
 */
class WebSocketErrorHandlingTests {

    private ExamWebSocketHandler handler;
    private FakeWebSocketSession fakeSession;

    @BeforeEach
    void setUp() {
        JsonMapper jsonMapper =JsonMapper.builder().build();

        RegistrationMessageHandler registrationMessageHandler = mock(RegistrationMessageHandler.class);

        LoginService loginService = mock(LoginService.class);

        AuthenticatedSessionRegistry authenticatedSessionRegistry = mock(AuthenticatedSessionRegistry.class);

        handler = new ExamWebSocketHandler(jsonMapper,registrationMessageHandler,loginService, authenticatedSessionRegistry);

        fakeSession = new FakeWebSocketSession();
}

    // -----------------------------------------------------------------------
    // INVALID_JSON
    // -----------------------------------------------------------------------

    @Test
    @DisplayName("JSON không hợp lệ phải trả lỗi INVALID_JSON")
    void invalidJson_returnsInvalidJsonError() throws Exception {
        handler.handleMessage(fakeSession, new TextMessage("this is not json {{{"));

        String response = fakeSession.lastSentText();
        assertThat(response).contains("\"type\":\"ERROR\"");
        assertThat(response).contains("\"code\":\"INVALID_JSON\"");
        // Không được rò stack trace
        assertThat(response).doesNotContain("Exception");
        assertThat(response).doesNotContain("at vn.edu");
    }

    @Test
    @DisplayName("JSON rỗng phải trả lỗi INVALID_JSON")
    void emptyPayload_returnsInvalidJsonError() throws Exception {
        handler.handleMessage(fakeSession, new TextMessage(""));

        String response = fakeSession.lastSentText();
        assertThat(response).contains("\"type\":\"ERROR\"");
        assertThat(response).contains("\"code\":\"INVALID_JSON\"");
    }

    // -----------------------------------------------------------------------
    // MISSING_MESSAGE_TYPE
    // -----------------------------------------------------------------------

    @Test
    @DisplayName("Message không có trường type phải trả MISSING_MESSAGE_TYPE")
    void missingType_returnsMissingMessageTypeError() throws Exception {
        // JSON hợp lệ nhưng không có field "type"
        String json = "{\"requestId\":\"req-001\",\"payload\":{}}";
        handler.handleMessage(fakeSession, new TextMessage(json));

        String response = fakeSession.lastSentText();
        assertThat(response).contains("\"type\":\"ERROR\"");
        assertThat(response).contains("\"code\":\"MISSING_MESSAGE_TYPE\"");
        // requestId phải được giữ lại
        assertThat(response).contains("\"requestId\":\"req-001\"");
    }

    @Test
    @DisplayName("Type rỗng phải trả MISSING_MESSAGE_TYPE")
    void blankType_returnsMissingMessageTypeError() throws Exception {
        String json = "{\"requestId\":\"req-002\",\"type\":\"   \",\"payload\":{}}";
        handler.handleMessage(fakeSession, new TextMessage(json));

        String response = fakeSession.lastSentText();
        assertThat(response).contains("\"type\":\"ERROR\"");
        assertThat(response).contains("\"code\":\"MISSING_MESSAGE_TYPE\"");
        assertThat(response).contains("\"requestId\":\"req-002\"");
    }

    // -----------------------------------------------------------------------
    // UNSUPPORTED_MESSAGE_TYPE
    // -----------------------------------------------------------------------

    @Test
    @DisplayName("Type không hỗ trợ phải trả UNSUPPORTED_MESSAGE_TYPE")
    void unsupportedType_returnsUnsupportedMessageTypeError() throws Exception {
        String json = "{\"requestId\":\"req-003\",\"type\":\"UNKNOWN_TYPE\",\"payload\":{}}";
        handler.handleMessage(fakeSession, new TextMessage(json));

        String response = fakeSession.lastSentText();
        assertThat(response).contains("\"type\":\"ERROR\"");
        assertThat(response).contains("\"code\":\"UNSUPPORTED_MESSAGE_TYPE\"");
        assertThat(response).contains("\"requestId\":\"req-003\"");
    }

    // -----------------------------------------------------------------------
    // Regression: PING vẫn trả PONG
    // -----------------------------------------------------------------------

    @Test
    @DisplayName("PING hợp lệ vẫn phải trả PONG với cùng requestId")
    void validPing_returnsPong() throws Exception {
        String json = "{\"requestId\":\"ping-001\",\"type\":\"PING\",\"payload\":{\"clientTime\":\"2026-10-19T13:00:00Z\"}}";
        handler.handleMessage(fakeSession, new TextMessage(json));

        // Bỏ qua message CONNECTED đầu tiên (nếu có), lấy message PONG
        String response = fakeSession.lastSentText();
        assertThat(response).contains("\"type\":\"PONG\"");
        assertThat(response).contains("\"requestId\":\"ping-001\"");
        assertThat(response).contains("\"serverTime\"");
    }

    @Test
    @DisplayName("JSON lỗi không làm chết session – session vẫn dùng được sau đó")
    void invalidJson_doesNotKillSession() throws Exception {
        // Gửi JSON sai
        handler.handleMessage(fakeSession, new TextMessage("{bad json"));
        // Sau đó gửi PING hợp lệ
        String json = "{\"requestId\":\"ping-002\",\"type\":\"PING\",\"payload\":{}}";
        handler.handleMessage(fakeSession, new TextMessage(json));

        // Session vẫn nhận được PONG
        String lastResponse = fakeSession.lastSentText();
        assertThat(lastResponse).contains("\"type\":\"PONG\"");
        assertThat(lastResponse).contains("\"requestId\":\"ping-002\"");
    }

    @Test
    @DisplayName("Error response không chứa stack trace hay thông tin nội bộ")
    void errorResponse_doesNotContainStackTrace() throws Exception {
        handler.handleMessage(fakeSession, new TextMessage("not json at all"));

        String response = fakeSession.lastSentText();
        assertThat(response).doesNotContain("Exception");
        assertThat(response).doesNotContain("at vn.edu");
        assertThat(response).doesNotContain("Caused by");
    }

    // -----------------------------------------------------------------------
    // Fake session nội bộ để bắt message gửi ra
    // -----------------------------------------------------------------------

    /**
     * Fake WebSocketSession đơn giản dùng trong test.
     * Chỉ bắt các TextMessage server gửi, không cần kết nối thật.
     */
    static class FakeWebSocketSession implements WebSocketSession {

        private final List<String> sentMessages = new ArrayList<>();

        /** Trả text của message cuối cùng server gửi. */
        String lastSentText() {
            if (sentMessages.isEmpty()) {
                throw new AssertionError("Không có message nào được gửi từ server.");
            }
            return sentMessages.get(sentMessages.size() - 1);
        }

        List<String> allSentTexts() {
            return List.copyOf(sentMessages);
        }

        @Override
        public void sendMessage(org.springframework.web.socket.WebSocketMessage<?> message) throws IOException {
            if (message instanceof TextMessage textMessage) {
                sentMessages.add(textMessage.getPayload());
            }
        }

        // --- Các method còn lại chỉ cần stub tối thiểu ---

        @Override public String getId() { return "fake-session-id"; }
        @Override public java.net.URI getUri() { return null; }
        @Override public org.springframework.http.HttpHeaders getHandshakeHeaders() { return org.springframework.http.HttpHeaders.EMPTY; }
        @Override public java.util.Map<String, Object> getAttributes() { return new java.util.HashMap<>(); }
        @Override public java.security.Principal getPrincipal() { return null; }
        @Override public java.net.InetSocketAddress getLocalAddress() { return null; }
        @Override public java.net.InetSocketAddress getRemoteAddress() { return null; }
        @Override public String getAcceptedProtocol() { return null; }
        @Override public void setTextMessageSizeLimit(int messageSizeLimit) {}
        @Override public int getTextMessageSizeLimit() { return 0; }
        @Override public void setBinaryMessageSizeLimit(int messageSizeLimit) {}
        @Override public int getBinaryMessageSizeLimit() { return 0; }
        @Override public List<org.springframework.web.socket.WebSocketExtension> getExtensions() { return List.of(); }
        @Override public boolean isOpen() { return true; }
        @Override public void close() {}
        @Override public void close(org.springframework.web.socket.CloseStatus status) {}
    }
}
