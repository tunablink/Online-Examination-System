package vn.edu.hanu.exam.service.dashboard;

import java.util.List;

public record TeacherDashboardSummary(
        long totalExams,
        long draftExamCount,
        long publishedExamCount,
        long closedExamCount,
        List<RecentExamSummary> recentExams) {
    public TeacherDashboardSummary {
        recentExams = List.copyOf(recentExams);
    }
}
