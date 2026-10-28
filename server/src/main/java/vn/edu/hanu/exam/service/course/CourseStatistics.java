package vn.edu.hanu.exam.service.course;

import java.util.List;

public record CourseStatistics(Double averageScorePercent, List<ExamStatistics> exams) {
    public record ExamStatistics(long examId, long questionCount, long submissionCount) {}
}
