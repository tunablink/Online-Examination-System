package vn.edu.hanu.exam.exception;

public class TeacherSubmissionException extends RuntimeException {
    private final String code;

    public TeacherSubmissionException(String code, String message) {
        super(message);
        this.code = code;
    }

    public TeacherSubmissionException(
            String code,
            String message,
            Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
