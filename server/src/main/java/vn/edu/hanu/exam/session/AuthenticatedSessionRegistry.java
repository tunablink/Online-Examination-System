package vn.edu.hanu.exam.session;

import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.springframework.stereotype.Component;

import vn.edu.hanu.exam.service.LoggedInUser;

@Component 
public final class AuthenticatedSessionRegistry {
    private final ConcurrentMap<String, LoggedInUser> sessions = new ConcurrentHashMap<>();

    public void authenticate(String sessionId, LoggedInUser loggedInUser){
        Objects.requireNonNull(sessionId, "sessionId must not be null");

        Objects.requireNonNull(loggedInUser, "loggedInUser must not be null");

        sessions.put(sessionId, loggedInUser);
    }

    public Optional<LoggedInUser> findUser(String sessionId){
        if (sessionId == null || sessionId.isBlank()) {
            return Optional.empty();
        }

        return Optional.ofNullable(sessions.get(sessionId));
    }

    public boolean isAuthenticated(String sessionId){
        return findUser(sessionId).isPresent();
    }

    public void remove(String sessionId){
        if (sessionId == null){
            return;
        }

        sessions.remove(sessionId);
    }

    public int getAuthenticatedSessionCount(){
        return sessions.size();
    }
}
