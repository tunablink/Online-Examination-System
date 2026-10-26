package vn.edu.hanu.exam.exception;

public class TeacherDashboardException extends RuntimeException {
    private final String code;

    public TeacherDashboardException(String code, String message) {
        super(message);
        this.code = code;
    }

    public TeacherDashboardException(String code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
