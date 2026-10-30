package vn.edu.hanu.exam.session;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;
import org.springframework.stereotype.Component;
import vn.edu.hanu.exam.exception.AttemptException;

/** Single-server, socket-fenced exam writers. Tokens/scopes are never sent to clients. */
@Component
public final class AttemptSessionRegistry {
    public static final String IN_USE = "ATTEMPT_IN_USE";
    public static final String REQUIRED = "ATTEMPT_SESSION_REQUIRED";
    private static final Duration LIVE_TTL = Duration.ofSeconds(45);
    private static final Duration RECONNECT_GRACE = Duration.ofSeconds(30);
    private record Lease(long studentId, String socketId, String scope, Instant touched, Instant detached) {
        Instant expires() { return detached == null ? touched.plus(LIVE_TTL) : detached.plus(RECONNECT_GRACE); }
    }
    private final ConcurrentHashMap<Long, Lease> leases = new ConcurrentHashMap<>();
    private final Clock clock;
    public AttemptSessionRegistry() { this(Clock.systemUTC()); }
    AttemptSessionRegistry(Clock clock) { this.clock = clock; }

    public void acquire(long attemptId, long studentId, String socketId, String scope) {
        Objects.requireNonNull(socketId); Objects.requireNonNull(scope);
        Instant now = clock.instant();
        leases.compute(attemptId, (id, current) -> {
            if (current != null && current.studentId() != studentId) throw notFound();
            boolean sameSocket = current != null && current.socketId().equals(socketId);
            boolean recovering = current != null && current.detached() != null && current.scope().equals(scope);
            if (current != null && !sameSocket && !recovering && current.expires().isAfter(now)) throw inUse();
            return new Lease(studentId, socketId, scope, now, null);
        });
        // Atomic per-key removal cannot leave detached lock objects for queued writers.
        leases.forEach((id, value) -> {
            if (id != attemptId && value.expires().plus(Duration.ofMinutes(2)).isBefore(now))
                leases.computeIfPresent(id, (key, current) -> current.expires().plus(Duration.ofMinutes(2)).isBefore(now) ? null : current);
        });
    }

    /** Ownership check and database mutation are serialized with takeover for this attempt. */
    public <T> T withOwner(long attemptId, long studentId, String socketId, Supplier<T> operation, boolean releaseAfterSuccess) {
        AtomicReference<T> result = new AtomicReference<>();
        leases.compute(attemptId, (id, current) -> {
            if (current == null) throw new AttemptException(REQUIRED, "Reopen this examination to restore your exam session.");
            if (current.studentId() != studentId) throw notFound();
            if (!current.socketId().equals(socketId) || current.detached() != null) throw inUse();
            result.set(operation.get());
            return releaseAfterSuccess ? null : new Lease(studentId, socketId, current.scope(), clock.instant(), null);
        });
        return result.get();
    }

    public void heartbeat(long attemptId, long studentId, String socketId) {
        withOwner(attemptId, studentId, socketId, () -> Boolean.TRUE, false);
    }
    public void release(long attemptId, long studentId, String socketId) {
        leases.computeIfPresent(attemptId, (id, current) ->
                current.studentId() == studentId && current.socketId().equals(socketId) ? null : current);
    }
    public void disconnected(String socketId) {
        Instant now = clock.instant();
        leases.forEach((id, ignored) -> leases.computeIfPresent(id, (key, current) ->
                current.socketId().equals(socketId) && current.detached() == null
                        ? new Lease(current.studentId(), socketId, current.scope(), current.touched(), now) : current));
    }
    public void releaseSession(String socketId) {
        leases.forEach((id, ignored) -> leases.computeIfPresent(id, (key, current) ->
                current.socketId().equals(socketId) ? null : current));
    }
    private static AttemptException inUse() {
        return new AttemptException(IN_USE, "This examination is already open in another tab/session.");
    }
    private static AttemptException notFound() { return new AttemptException("ATTEMPT_NOT_FOUND", "The examination attempt was not found."); }
}
