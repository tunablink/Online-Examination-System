package vn.edu.hanu.exam.service.dashboard;

import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

import vn.edu.hanu.exam.exception.TeacherDashboardException;
import vn.edu.hanu.exam.repository.TeacherDashboardRepository;

@Service
public class TeacherDashboardService {
    public static final String DATABASE_ERROR = "DATABASE_ERROR";

    private final TeacherDashboardRepository dashboardRepository;

    public TeacherDashboardService(TeacherDashboardRepository dashboardRepository) {
        this.dashboardRepository = dashboardRepository;
    }

    public TeacherDashboardSummary getDashboard(long teacherId) {
        if (teacherId <= 0) {
            throw new IllegalArgumentException("teacherId must be positive");
        }
        try {
            return dashboardRepository.findByTeacherId(teacherId);
        } catch (DataAccessException | IllegalStateException exception) {
            throw new TeacherDashboardException(
                    DATABASE_ERROR, "The teacher dashboard could not be read.", exception);
        }
    }
}
