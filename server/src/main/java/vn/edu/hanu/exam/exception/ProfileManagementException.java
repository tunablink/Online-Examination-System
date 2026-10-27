package vn.edu.hanu.exam.exception;

public class ProfileManagementException extends RuntimeException {
    private final String code;

    public ProfileManagementException(String code, String message) {
        super(message);
        this.code = code;
    }

    public ProfileManagementException(String code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
