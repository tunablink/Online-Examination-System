package vn.edu.hanu.exam.repository;

import java.util.List;
import java.util.Optional;

import vn.edu.hanu.exam.domain.submission.TeacherSubmission;

public interface TeacherSubmissionRepository {
    boolean existsExamOwnedByTeacher(long examId, long teacherId);

    List<TeacherSubmission> findByExamAndTeacher(long examId, long teacherId);

    Optional<TeacherSubmission> findTerminalByAttemptAndTeacher(long attemptId, long teacherId);
}
