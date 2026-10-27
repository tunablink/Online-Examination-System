package vn.edu.hanu.exam.exception;

public class AttemptException extends RuntimeException {
    private final String code;

    public AttemptException(String code, String message) {
        super(message);
        this.code = code;
    }

    public AttemptException(String code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
