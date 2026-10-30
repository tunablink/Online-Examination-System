package vn.edu.hanu.exam.session;

import static org.junit.jupiter.api.Assertions.*;
import java.time.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import vn.edu.hanu.exam.exception.AttemptException;

class AttemptSessionRegistryTests {
    private final MutableClock clock = new MutableClock();
    private final AttemptSessionRegistry leases = new AttemptSessionRegistry(clock);
    private void claim() { leases.acquire(1, 10, "a", "token-a"); }
    private void denied(Runnable action) {
        assertEquals("ATTEMPT_IN_USE", assertThrows(AttemptException.class, action::run).code());
    }
    @Test void liveOwnerRejectsDifferentAndClonedCredentials() {
        claim();
        denied(() -> leases.acquire(1, 10, "b", "token-b"));
        denied(() -> leases.acquire(1, 10, "b", "token-a"));
        leases.acquire(1, 10, "a", "token-a");
    }
    @Test void detachedSameCredentialRecoversImmediately() {
        claim(); leases.disconnected("a");
        leases.acquire(1, 10, "b", "token-a");
        leases.heartbeat(1, 10, "b");
        denied(() -> leases.withOwner(1, 10, "a", () -> true, false));
    }
    @Test void otherCredentialWaitsForDisconnectGrace() {
        claim(); leases.disconnected("a"); clock.advance(29);
        denied(() -> leases.acquire(1, 10, "b", "token-b"));
        clock.advance(1); leases.acquire(1, 10, "b", "token-b");
    }
    @Test void halfOpenSocketExpiresAndOldWriterIsFenced() {
        claim(); clock.advance(45); leases.acquire(1, 10, "b", "token-b");
        var writes = new AtomicInteger();
        denied(() -> leases.withOwner(1, 10, "a", writes::incrementAndGet, false));
        assertEquals(0, writes.get());
    }
    @Test void heartbeatExtendsLiveLease() {
        claim(); clock.advance(40); leases.heartbeat(1, 10, "a"); clock.advance(40);
        denied(() -> leases.acquire(1, 10, "b", "token-b"));
    }
    @Test void delayedOldCloseOrReleaseCannotRemoveNewOwner() {
        claim(); leases.disconnected("a"); leases.acquire(1, 10, "b", "token-a");
        leases.disconnected("a"); leases.release(1, 10, "a"); leases.releaseSession("a");
        leases.heartbeat(1, 10, "b");
        denied(() -> leases.acquire(1, 10, "c", "token-c"));
    }
    @Test void explicitLeaveAllowsImmediateNewOwner() {
        claim(); leases.release(1, 10, "a"); leases.acquire(1, 10, "b", "token-b");
    }
    @Test void successfulSubmitReleasesButFailedWritePreservesOwner() {
        claim();
        assertThrows(IllegalStateException.class, () -> leases.withOwner(1, 10, "a", () -> {
            throw new IllegalStateException("rollback");
        }, true));
        denied(() -> leases.acquire(1, 10, "b", "token-b"));
        assertEquals("done", leases.withOwner(1, 10, "a", () -> "done", true));
        leases.acquire(1, 10, "b", "token-b");
    }
    @Test void missingClaimAndWrongIdentityAreRejected() {
        assertEquals("ATTEMPT_SESSION_REQUIRED", assertThrows(AttemptException.class,
                () -> leases.heartbeat(1, 10, "a")).code());
        claim();
        assertEquals("ATTEMPT_NOT_FOUND", assertThrows(AttemptException.class,
                () -> leases.acquire(1, 11, "b", "token-b")).code());
        assertEquals("ATTEMPT_NOT_FOUND", assertThrows(AttemptException.class,
                () -> leases.heartbeat(1, 11, "a")).code());
    }
    @Test void differentAttemptsRemainIndependent() {
        claim(); leases.acquire(2, 11, "b", "token-b"); leases.heartbeat(1, 10, "a");
    }
    @Test void concurrentClaimsHaveExactlyOneWinner() throws Exception {
        try (var executor = Executors.newFixedThreadPool(8)) {
            var start = new CountDownLatch(1); var winners = new AtomicInteger();
            var jobs = new java.util.ArrayList<Future<?>>();
            for (int i = 0; i < 8; i++) {
                String socket = "socket-" + i;
                jobs.add(executor.submit(() -> {
                    try { start.await(); leases.acquire(1, 10, socket, socket); winners.incrementAndGet(); }
                    catch (AttemptException expected) { assertEquals("ATTEMPT_IN_USE", expected.code()); }
                    catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); throw new RuntimeException(interrupted); }
                }));
            }
            start.countDown(); for (var job : jobs) job.get(5, TimeUnit.SECONDS);
            assertEquals(1, winners.get());
        }
    }
    @Test void takeoverCannotInterleaveWithDatabaseMutation() throws Exception {
        claim(); clock.advance(45);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var entered = new CountDownLatch(1); var finish = new CountDownLatch(1);
            var write = executor.submit(() -> leases.withOwner(1, 10, "a", () -> {
                entered.countDown();
                try { if (!finish.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("timeout"); }
                catch (InterruptedException interrupted) { throw new RuntimeException(interrupted); }
                return true;
            }, false));
            assertTrue(entered.await(5, TimeUnit.SECONDS));
            var takeover = executor.submit(() -> assertThrows(AttemptException.class,
                    () -> leases.acquire(1, 10, "b", "token-b")));
            finish.countDown(); assertTrue(write.get(5, TimeUnit.SECONDS));
            assertEquals("ATTEMPT_IN_USE", takeover.get(5, TimeUnit.SECONDS).code());
        }
    }
    private static class MutableClock extends Clock {
        private Instant now = Instant.parse("2026-10-30T00:00:00Z");
        void advance(long seconds) { now = now.plusSeconds(seconds); }
        public ZoneId getZone() { return ZoneOffset.UTC; }
        public Clock withZone(ZoneId zone) { return this; }
        public Instant instant() { return now; }
    }
}
