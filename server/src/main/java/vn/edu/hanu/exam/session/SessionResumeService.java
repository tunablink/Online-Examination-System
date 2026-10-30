package vn.edu.hanu.exam.session;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

import vn.edu.hanu.exam.domain.User;
import vn.edu.hanu.exam.domain.UserRole;
import vn.edu.hanu.exam.repository.UserRepository;
import vn.edu.hanu.exam.service.LoggedInUser;

/** Opaque, tab-scoped credentials. Raw tokens and passwords are never retained. */
@Service
public class SessionResumeService {
    public record Details(long id, String institutionalId, String fullName, String email,
            UserRole role, String sessionToken, Instant sessionExpiresAt) { }
    private record Credential(long userId, String passwordHash, Instant expiresAt) { }
    private final ConcurrentHashMap<String, Credential> credentials = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, String> bindings = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();
    private final UserRepository users;
    private final Clock clock;

    @org.springframework.beans.factory.annotation.Autowired
    public SessionResumeService(UserRepository users) { this(users, Clock.systemUTC()); }
    SessionResumeService(UserRepository users, Clock clock) { this.users = users; this.clock = clock; }

    public synchronized Details issue(String socketId, LoggedInUser authenticated) {
        credentials.entrySet().removeIf(entry -> !entry.getValue().expiresAt().isAfter(clock.instant()));
        if (credentials.size() >= 10_000) throw new IllegalStateException("Session capacity reached");
        User user = users.findById(authenticated.id()).filter(User::active)
                .filter(account -> account.institutionalId() != null && !account.institutionalId().isBlank())
                .orElseThrow(() -> new IllegalArgumentException("Session is unavailable"));
        byte[] bytes = new byte[32]; random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant expires = clock.instant().plus(Duration.ofHours(8));
        revoke(socketId);
        String digest = digest(token);
        credentials.put(digest, new Credential(user.id(), user.passwordHash(), expires));
        bindings.put(socketId, digest);
        return details(user, token, expires);
    }

    public synchronized Details resume(String socketId, String token) {
        if (token == null || !token.matches("[A-Za-z0-9_-]{43}")) throw invalid();
        String digest = digest(token);
        Credential credential = credentials.get(digest);
        if (credential == null || !credential.expiresAt().isAfter(clock.instant())) {
            credentials.remove(digest); throw invalid();
        }
        User user = users.findById(credential.userId()).filter(User::active)
                .filter(account -> account.institutionalId() != null && !account.institutionalId().isBlank()).orElse(null);
        if (user == null || !MessageDigest.isEqual(user.passwordHash().getBytes(StandardCharsets.UTF_8),
                credential.passwordHash().getBytes(StandardCharsets.UTF_8))) {
            credentials.remove(digest); throw invalid();
        }
        bindings.put(socketId, digest);
        return details(user, token, credential.expiresAt());
    }

    public synchronized void revoke(String socketId) {
        String digest = bindings.remove(socketId);
        if (digest != null) credentials.remove(digest);
    }

    // Disconnect only detaches the socket. The credential remains resumable.
    public void detach(String socketId) { bindings.remove(socketId); }

    public boolean isLive(String socketId) {
        String digest = bindings.get(socketId);
        Credential credential = digest == null ? null : credentials.get(digest);
        return credential != null && credential.expiresAt().isAfter(clock.instant());
    }

    /** Internal stable credential scope, only for fencing reconnects; never serialize it. */
    public String credentialScope(String socketId) {
        return isLive(socketId) ? bindings.get(socketId) : null;
    }

    private static Details details(User user, String token, Instant expires) {
        return new Details(user.id(), user.institutionalId(), user.fullName(), user.email(), user.role(), token, expires);
    }
    private static IllegalArgumentException invalid() { return new IllegalArgumentException("Session is unavailable"); }
    private static String digest(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException exception) { throw new IllegalStateException(exception); }
    }
}
