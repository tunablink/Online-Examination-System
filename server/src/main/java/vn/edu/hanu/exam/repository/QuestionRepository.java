package vn.edu.hanu.exam.repository;

import java.util.List;
import java.util.Optional;

import vn.edu.hanu.exam.domain.Choice;
import vn.edu.hanu.exam.domain.ExamStatus;
import vn.edu.hanu.exam.domain.Question;

public interface QuestionRepository {
    Optional<ExamStatus> findOwnedExamStatus(long examId, long teacherId);
    Optional<ExamStatus> findOwnedExamStatusForUpdate(long examId, long teacherId);

    Optional<QuestionExamContext> findOwnedQuestionContext(long questionId, long teacherId);
    Optional<QuestionExamContext> findOwnedQuestionContextForUpdate(long questionId, long teacherId);

    Question insertQuestion(long examId, String content, int points, int displayOrder);

    Choice insertChoice(long questionId, String content, boolean correct, int displayOrder);

    List<Question> findAllQuestionsByExamId(long examId);

    List<Choice> findAllChoicesByExamId(long examId);

    Optional<Question> findQuestionById(long questionId);

    List<Choice> findChoicesByQuestionId(long questionId);

    Question updateQuestion(long questionId, String content, int points, int displayOrder);

    int deleteChoicesByQuestionId(long questionId);

    boolean deleteQuestionById(long questionId);
}