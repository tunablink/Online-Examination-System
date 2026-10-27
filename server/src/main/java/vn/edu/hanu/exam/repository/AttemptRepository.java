package vn.edu.hanu.exam.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import vn.edu.hanu.exam.domain.Choice;
import vn.edu.hanu.exam.domain.Exam;
import vn.edu.hanu.exam.domain.Question;
import vn.edu.hanu.exam.domain.attempt.AttemptChoice;
import vn.edu.hanu.exam.domain.attempt.AttemptHistoryEntry;
import vn.edu.hanu.exam.domain.attempt.AttemptQuestion;
import vn.edu.hanu.exam.domain.attempt.AttemptScore;
import vn.edu.hanu.exam.domain.attempt.AttemptStatus;
import vn.edu.hanu.exam.domain.attempt.ExamAttempt;
import vn.edu.hanu.exam.domain.attempt.SavedAnswer;
import vn.edu.hanu.exam.domain.attempt.StoredAttemptResult;

public interface AttemptRepository {
    Optional<Exam> findExamById(long examId);

    Optional<Exam> findExamByIdForUpdate(long examId);

    Optional<ExamAttempt> findInProgressByExamAndStudent(long examId, long studentId);

    Optional<ExamAttempt> findByIdAndStudent(long attemptId, long studentId);

    Optional<ExamAttempt> findByIdAndStudentForUpdate(long attemptId, long studentId);

    ExamAttempt insertAttempt(long examId, long studentId, OffsetDateTime startedAt, OffsetDateTime deadline);

    List<Question> findQuestionsByExamId(long examId);

    List<Choice> findChoicesByExamId(long examId);

    void insertAttemptQuestions(long attemptId, List<Long> orderedQuestionIds);

    void insertAttemptChoices(long attemptId, long questionId, List<Long> orderedChoiceIds);

    List<AttemptQuestion> findAttemptQuestions(long attemptId);

    List<AttemptChoice> findAttemptChoices(long attemptId);

    boolean containsAttemptChoice(long attemptId, long questionId, long choiceId);

    SavedAnswer upsertAnswer(long attemptId, long questionId, long choiceId, OffsetDateTime savedAt);

    List<SavedAnswer> findSavedAnswers(long attemptId);

    AttemptScore calculateScore(long attemptId);

    boolean finalizeAttempt(
            long attemptId,
            AttemptStatus status,
            OffsetDateTime submittedAt,
            AttemptScore score);

    Optional<StoredAttemptResult> findSubmissionResult(long attemptId, long studentId);

    List<AttemptHistoryEntry> findHistoryByStudentId(
            long studentId);

    Optional<AttemptHistoryEntry> findCompletedAttemptByIdAndStudent(
            long attemptId,
            long studentId);
}
