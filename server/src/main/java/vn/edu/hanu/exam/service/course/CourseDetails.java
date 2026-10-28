package vn.edu.hanu.exam.service.course;

import java.time.OffsetDateTime;

public record CourseDetails(long id, long teacherId, String code, String name, String subject,
        String department, String academicYear, String semester, String description,
        boolean archived, long studentCount, long examCount, OffsetDateTime createdAt) {
    public CourseDetails(long id, long teacherId, String code, String name, OffsetDateTime createdAt) {
        this(id, teacherId, code, name, null, null, null, null, null, false, 0, 0, createdAt);
    }
}
