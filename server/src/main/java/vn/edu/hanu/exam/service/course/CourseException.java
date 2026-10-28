package vn.edu.hanu.exam.service.course;

public class CourseException extends RuntimeException {
    private final String code;
    public CourseException(String code, String message) { super(message); this.code = code; }
    public String code() { return code; }
}
