package vn.edu.hanu.exam.repository;

import vn.edu.hanu.exam.service.dashboard.TeacherDashboardSummary;

public interface TeacherDashboardRepository {
    TeacherDashboardSummary findByTeacherId(long teacherId);
}
