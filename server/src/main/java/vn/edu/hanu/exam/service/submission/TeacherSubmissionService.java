package vn.edu.hanu.exam.service.submission;

import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

import vn.edu.hanu.exam.domain.submission.TeacherSubmission;
import vn.edu.hanu.exam.exception.TeacherSubmissionException;
import vn.edu.hanu.exam.repository.TeacherSubmissionRepository;

@Service
public class TeacherSubmissionService {
    public static final String EXAM_NOT_FOUND = "EXAM_NOT_FOUND";
    public static final String SUBMISSION_RESULT_NOT_FOUND =
            "SUBMISSION_RESULT_NOT_FOUND";
    public static final String DATABASE_ERROR = "DATABASE_ERROR";

    private final TeacherSubmissionRepository repository;

    public TeacherSubmissionService(TeacherSubmissionRepository repository) {
        this.repository = repository;
    }

    public TeacherSubmissionList findExamSubmissions(
            long examId,
            long teacherId) {
        if (examId <= 0 || teacherId <= 0) {
            throw examNotFound();
        }

        try {
            if (!repository.existsExamOwnedByTeacher(examId, teacherId)) {
                throw examNotFound();
            }

            return new TeacherSubmissionList(
                    repository.findByExamAndTeacher(examId, teacherId));
        } catch (DataAccessException | IllegalStateException exception) {
            throw databaseError(exception);
        }
    }

    public TeacherSubmission findSubmissionResult(
            long attemptId,
            long teacherId) {
        if (attemptId <= 0 || teacherId <= 0) {
            throw resultNotFound();
        }

        try {
            return repository
                    .findTerminalByAttemptAndTeacher(attemptId, teacherId)
                    .orElseThrow(TeacherSubmissionService::resultNotFound);
        } catch (DataAccessException | IllegalStateException exception) {
            throw databaseError(exception);
        }
    }

    private static TeacherSubmissionException examNotFound() {
        return new TeacherSubmissionException(
                EXAM_NOT_FOUND,
                "Examination was not found.");
    }

    private static TeacherSubmissionException resultNotFound() {
        return new TeacherSubmissionException(
                SUBMISSION_RESULT_NOT_FOUND,
                "A finalized submission result was not found.");
    }

    private static TeacherSubmissionException databaseError(
            RuntimeException cause) {
        return new TeacherSubmissionException(
                DATABASE_ERROR,
                "Submission information could not be read.",
                cause);
    }
}
