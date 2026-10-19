package vn.edu.hanu.exam.protocol;

import java.util.Locale;
import java.util.Optional;

public enum MessageType {
    CONNECTED(false),
    PING(true),
    PONG(false), 
    REGISTER(true),
    REGISTERED(false),
    LOGIN(true),
    LOGGED_IN(false),
    ERROR(false);

    private final boolean acceptedFromClient;

    MessageType(boolean acceptedFromClient) {
        this.acceptedFromClient = acceptedFromClient;
    }

    public boolean isAcceptedFromClient() {
        return acceptedFromClient;
    }

    public static Optional<MessageType> fromWireValue(String value){
        if (value == null || value.isBlank()) {
            return Optional.empty();
        }

        String normalizedValue = value.trim().toUpperCase(Locale.ROOT);

        try{
            return Optional.of(MessageType.valueOf(normalizedValue));
        } catch (IllegalArgumentException e){
            return Optional.empty();
        }
    }

}
