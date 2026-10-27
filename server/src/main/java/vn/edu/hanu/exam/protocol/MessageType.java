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

    GET_PROFILE(true),
    PROFILE_DETAILS(false),

    UPDATE_PROFILE(true),
    PROFILE_UPDATED(false),

    CHANGE_PASSWORD(true),
    PASSWORD_CHANGED(false),

    GET_STUDENTS(true),
    STUDENTS(false),

    GET_STUDENT(true),
    STUDENT_DETAILS(false),

    GET_TEACHER_DASHBOARD(true),
    TEACHER_DASHBOARD(false),

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

    CREATE_QUESTION(true),
    QUESTION_CREATED(false),

    UPDATE_QUESTION(true),
    QUESTION_UPDATED(false),

    DELETE_QUESTION(true),
    QUESTION_DELETED(false),

    GET_EXAM_QUESTIONS(true),
    EXAM_QUESTIONS(false),

    GET_AVAILABLE_EXAMS(true),
    AVAILABLE_EXAMS(false),

    GET_AVAILABLE_EXAM(true),
    AVAILABLE_EXAM_DETAILS(false),

    START_EXAM(true),
    EXAM_STARTED(false),

    GET_EXAM_ATTEMPT(true),
    EXAM_ATTEMPT_DETAILS(false),

    SAVE_ANSWER(true),
    ANSWER_SAVED(false),

    SUBMIT_EXAM(true),
    EXAM_SUBMITTED(false),

    GET_ATTEMPT_HISTORY(true),
    ATTEMPT_HISTORY(false),

    GET_ATTEMPT_RESULT(true),
    ATTEMPT_RESULT(false),

    GET_EXAM_SUBMISSIONS(true),
    EXAM_SUBMISSIONS(false),

    GET_SUBMISSION_RESULT(true),
    SUBMISSION_RESULT(false),

    ERROR(false);

    private final boolean acceptedFromClient;

    MessageType(boolean acceptedFromClient) {
        this.acceptedFromClient = acceptedFromClient;
    }

    public boolean isAcceptedFromClient() {
        return acceptedFromClient;
    }

    public static Optional<MessageType> fromWireValue(String value) {
        if (value == null || value.isBlank()) {
            return Optional.empty();
        }

        String normalizedValue = value.trim().toUpperCase(Locale.ROOT);

        try {
            return Optional.of(MessageType.valueOf(normalizedValue));
        } catch (IllegalArgumentException exception) {
            return Optional.empty();
        }
    }
}
