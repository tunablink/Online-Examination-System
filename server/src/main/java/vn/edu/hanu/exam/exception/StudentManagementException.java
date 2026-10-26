package vn.edu.hanu.exam.exception;

public class StudentManagementException extends RuntimeException {
    private final String code;

    public StudentManagementException(String code, String message) {
        super(message);
        this.code = code;
    }

    public StudentManagementException(String code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
