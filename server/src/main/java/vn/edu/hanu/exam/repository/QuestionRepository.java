package vn.edu.hanu.exam.repository;

import java.util.List;
import java.util.Optional;

import vn.edu.hanu.exam.domain.Choice;
import vn.edu.hanu.exam.domain.ExamStatus;
import vn.edu.hanu.exam.domain.Question;

public interface QuestionRepository {
    Optional<ExamStatus> findOwnedExamStatusForUpdate(long examId, long teacherId);

    Question insertQuestion(long examId, String content, int points, int displayOrder);

    Choice insertChoice(long questionId, String content,boolean correct, int displayOrder);

    List<Question> findAllQuestionsByExamId(long examId);

    List<Choice> findAllChoicesByExamId(long examId);
}