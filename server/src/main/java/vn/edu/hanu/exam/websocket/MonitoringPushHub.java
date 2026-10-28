package vn.edu.hanu.exam.websocket;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import tools.jackson.databind.json.JsonMapper;
import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.protocol.ClientMessage;
import vn.edu.hanu.exam.protocol.ServerMessage;
import vn.edu.hanu.exam.service.monitoring.MonitoringChanged;
import vn.edu.hanu.exam.service.monitoring.MonitoringService;
import vn.edu.hanu.exam.service.monitoring.TeacherMonitoringQuery;
import vn.edu.hanu.exam.session.AuthenticatedSessionRegistry;

@Component
public class MonitoringPushHub {
    private static final Logger LOGGER = LoggerFactory.getLogger(MonitoringPushHub.class);
    private record Subscription(WebSocketSession session, long userId, Long examId) { }
    private final Map<String, Subscription> subscriptions = new ConcurrentHashMap<>();
    private final AuthenticatedSessionRegistry auth;
    private final TeacherMonitoringQuery query;
    private final MonitoringService monitoring;
    private final JsonMapper mapper;
    private vn.edu.hanu.exam.session.SessionResumeService resumeService;

    @org.springframework.beans.factory.annotation.Autowired
    void setSessionResumeService(vn.edu.hanu.exam.session.SessionResumeService service) { resumeService = service; }

    public MonitoringPushHub(AuthenticatedSessionRegistry auth, TeacherMonitoringQuery query,
            MonitoringService monitoring, JsonMapper mapper) {
        this.auth = auth; this.query = query; this.monitoring = monitoring; this.mapper = mapper;
    }

    public ServerMessage overview(WebSocketSession session, ClientMessage request) {
        var user = auth.findUser(session.getId()).orElse(null);
        if (user == null) return ServerMessage.error(request.requestId(), "AUTHENTICATION_REQUIRED", "Authentication is required.");
        if (user.role() != UserRole.TEACHER) return ServerMessage.error(request.requestId(), "FORBIDDEN", "Only teachers can view monitoring data.");
        var data = query.read(user.id());
        watch(session, null, request.payload());
        return ServerMessage.success(request.requestId(), "TEACHER_MONITORING", data);
    }

    /** Register only after the normal handler has checked teacher ownership. */
    public void watch(WebSocketSession session, Long examId, Map<String, Object> payload) {
        if (payload == null || !payload.containsKey("live")) return;
        var user = auth.findUser(session.getId()).orElse(null);
        if (user == null || user.role() != UserRole.TEACHER) return;
        if (Boolean.TRUE.equals(payload.get("live"))) {
            if (examId != null && !query.ownsExam(user.id(), examId)) return;
            subscriptions.put(session.getId(), new Subscription(session, user.id(), examId));
        } else if (Boolean.FALSE.equals(payload.get("live"))) {
            subscriptions.computeIfPresent(session.getId(), (id, current) ->
                    java.util.Objects.equals(current.examId(), examId) ? null : current);
        }
    }

    public void remove(String sessionId) { subscriptions.remove(sessionId); }

    @TransactionalEventListener
    public void afterCommit(MonitoringChanged event) {
        for (Subscription sub : subscriptions.values()) {
            try {
                var user = auth.findUser(sub.session().getId()).orElse(null);
                if (!sub.session().isOpen() || user == null || user.id() != sub.userId()
                        || user.role() != UserRole.TEACHER
                        || (resumeService != null && !resumeService.isLive(sub.session().getId()))) {
                    subscriptions.remove(sub.session().getId(), sub);
                    continue;
                }
                if (sub.examId() != null && sub.examId() != event.examId()) continue;
                if (!query.ownsExam(user.id(), event.examId())) continue;
                synchronized (sub.session()) {
                    var currentUser = auth.findUser(sub.session().getId()).orElse(null);
                    if (subscriptions.get(sub.session().getId()) != sub || currentUser == null
                            || currentUser.id() != sub.userId() || currentUser.role() != UserRole.TEACHER
                            || (resumeService != null && !resumeService.isLive(sub.session().getId()))) {
                        continue;
                    }
                    Object data = sub.examId() == null ? query.read(user.id())
                            : monitoring.getExamMonitoring(user.id(), sub.examId());
                    String type = sub.examId() == null ? "TEACHER_MONITORING" : "EXAM_MONITORING";
                    if (sub.session().isOpen()) sub.session().sendMessage(
                            new TextMessage(mapper.writeValueAsString(ServerMessage.event(type, data))));
                }
            } catch (Exception exception) {
                LOGGER.warn("Monitoring push failed: sessionId={}", sub.session().getId(), exception);
            }
        }
    }
}
