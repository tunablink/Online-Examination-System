package vn.edu.hanu.exam.exception;

public class StudentExamCatalogException extends RuntimeException {
    private final String code;

    public StudentExamCatalogException(String code, String message) {
        super(message);
        this.code = code;
    }

    public StudentExamCatalogException(String code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
