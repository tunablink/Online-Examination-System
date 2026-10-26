package vn.edu.hanu.exam.repository;

import vn.edu.hanu.exam.domain.ExamStatus;

public record QuestionExamContext(long questionId, long examId, ExamStatus examStatus) {
}
