package vn.edu.hanu.exam.repository;

import java.util.List;
import java.util.Optional;

import vn.edu.hanu.exam.service.course.CourseDetails;
import vn.edu.hanu.exam.service.course.CourseStatistics;
import vn.edu.hanu.exam.service.student.StudentDetails;

public interface CourseRepository {
    CourseDetails create(long teacherId, String code, String name);
    CourseDetails create(long teacherId, String code, String name, String subject, String department,
            String academicYear, String semester, String description);
    CourseDetails update(long courseId, long teacherId, String name, String subject, String department,
            String academicYear, String semester, String description);
    boolean setArchived(long courseId, long teacherId, boolean archived);
    List<CourseDetails> findByTeacher(long teacherId);
    Optional<CourseDetails> findOwned(long courseId, long teacherId);
    List<StudentDetails> findStudents(long courseId);
    CourseStatistics statistics(long courseId);
    boolean enroll(long courseId, long studentId);
    boolean isEnrolled(long courseId, long studentId);
}
