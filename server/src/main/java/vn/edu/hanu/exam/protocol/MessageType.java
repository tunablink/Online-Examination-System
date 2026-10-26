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
    CREATE_EXAM(true),
    EXAM_CREATED(false),
    GET_TEACHER_EXAMS(true),
    TEACHER_EXAMS(false),
    GET_EXAM(true),
    EXAM_DETAILS(false),
    UPDATE_EXAM(true),
    EXAM_UPDATED(false),
    PUBLISH_EXAM(true),
    EXAM_PUBLISHED(false),
    CLOSE_EXAM(true),
    EXAM_CLOSED(false),
    DELETE_EXAM(true),
    EXAM_DELETED(false),
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
