package vn.edu.hanu.exam.service.dashboard;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;

import vn.edu.hanu.exam.exception.TeacherDashboardException;
import vn.edu.hanu.exam.repository.TeacherDashboardRepository;

class TeacherDashboardServiceTests {
    @Test
    void returnsRepositoryDashboardForTeacher() {
        TeacherDashboardRepository repository = mock(TeacherDashboardRepository.class);
        TeacherDashboardSummary expected = new TeacherDashboardSummary(0, 0, 0, 0, List.of());
        when(repository.findByTeacherId(14L)).thenReturn(expected);

        TeacherDashboardSummary actual = new TeacherDashboardService(repository).getDashboard(14L);

        assertEquals(expected, actual);
        verify(repository).findByTeacherId(14L);
    }

    @Test
    void databaseFailureIsMappedToSafeDashboardError() {
        TeacherDashboardRepository repository = mock(TeacherDashboardRepository.class);
        when(repository.findByTeacherId(14L))
                .thenThrow(new DataAccessResourceFailureException("database password leaked"));

        TeacherDashboardException error = assertThrows(
                TeacherDashboardException.class,
                () -> new TeacherDashboardService(repository).getDashboard(14L));

        assertEquals("DATABASE_ERROR", error.code());
        assertEquals("The teacher dashboard could not be read.", error.getMessage());
    }
}
