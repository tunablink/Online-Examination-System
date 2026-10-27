package vn.edu.hanu.exam.repository;

import java.util.List;
import java.util.Optional;

import vn.edu.hanu.exam.domain.monitoring.MonitoredAttempt;
import vn.edu.hanu.exam.domain.monitoring.MonitoringAttemptSnapshot;
import vn.edu.hanu.exam.domain.monitoring.NewSuspiciousActivity;
import vn.edu.hanu.exam.domain.monitoring.SuspiciousActivity;

public interface MonitoringRepository {
    Optional<MonitoredAttempt> lockAttemptOwnedByStudent(long attemptId, long studentId);

    long countWarnings(long attemptId);

    SuspiciousActivity saveActivity(NewSuspiciousActivity activity);

    boolean isExamOwnedByTeacher(long examId, long teacherId);

    List<MonitoringAttemptSnapshot> findExamMonitoring(long examId);
}
