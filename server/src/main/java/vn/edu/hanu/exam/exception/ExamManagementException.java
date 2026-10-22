package vn.edu.hanu.exam.exception;

public class ExamManagementException extends RuntimeException {
    private final String code;

    public ExamManagementException(String code, String message) {
        super(message);
        this.code = code;
    }

    public ExamManagementException(String code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
