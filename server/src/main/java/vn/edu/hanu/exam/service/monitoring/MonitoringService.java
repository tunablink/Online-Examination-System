package vn.edu.hanu.exam.service.monitoring;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.hanu.exam.domain.monitoring.ActivitySeverity;
import vn.edu.hanu.exam.domain.monitoring.ActivityType;
import vn.edu.hanu.exam.domain.monitoring.MonitoredAttempt;
import vn.edu.hanu.exam.domain.monitoring.MonitoringRule;
import vn.edu.hanu.exam.domain.monitoring.NewSuspiciousActivity;
import vn.edu.hanu.exam.domain.monitoring.SuspiciousActivity;
import vn.edu.hanu.exam.exception.MonitoringException;
import vn.edu.hanu.exam.repository.MonitoringRepository;

@Service
public class MonitoringService {
    public static final int WARNING_THRESHOLD = 3;
    public static final String ATTEMPT_NOT_ACCESSIBLE = "ATTEMPT_NOT_ACCESSIBLE";
    public static final String EXAM_NOT_ACCESSIBLE = "EXAM_NOT_ACCESSIBLE";
    public static final String DATABASE_ERROR = "DATABASE_ERROR";
    public static final String INTERPRETATION =
            "Monitoring signals require teacher review and do not prove cheating.";

    private final MonitoringRepository monitoringRepository;

    public MonitoringService(MonitoringRepository monitoringRepository) {
        this.monitoringRepository = monitoringRepository;
    }

    @Transactional
    public ActivityRecorded reportActivity(long studentId, ReportActivityCommand command) {
        if (studentId <= 0 || command == null || command.attemptId() <= 0
                || command.activityType() == null) {
            throw new IllegalArgumentException("A valid student, attempt and activity type are required.");
        }

        try {
            MonitoredAttempt attempt = monitoringRepository
                    .lockAttemptOwnedByStudent(command.attemptId(), studentId)
                    .orElseThrow(MonitoringService::attemptNotAccessible);
            OffsetDateTime serverTime = OffsetDateTime.now(ZoneOffset.UTC);
            ActivityType activityType = command.activityType();
            ActivitySeverity severity = activityType.contributesWarning()
                    ? ActivitySeverity.WARNING
                    : ActivitySeverity.INFO;
            SuspiciousActivity recorded = monitoringRepository.saveActivity(
                    new NewSuspiciousActivity(
                            attempt.attemptId(),
                            MonitoringRule.valueOf(activityType.name()),
                            severity,
                            descriptionFor(activityType),
                            serverTime));

            long warningCount = monitoringRepository.countWarnings(attempt.attemptId());
            SuspiciousActivity thresholdActivity = null;
            if (activityType.contributesWarning() && warningCount == WARNING_THRESHOLD) {
                thresholdActivity = monitoringRepository.saveActivity(
                        new NewSuspiciousActivity(
                                attempt.attemptId(),
                                MonitoringRule.MULTIPLE_WARNING_THRESHOLD,
                                ActivitySeverity.WARNING,
                                "The attempt reached the configured warning threshold.",
                                serverTime));
            }
            return new ActivityRecorded(recorded, thresholdActivity, warningCount, INTERPRETATION);
        } catch (MonitoringException exception) {
            throw exception;
        } catch (DataAccessException | IllegalStateException exception) {
            throw databaseError(exception);
        }
    }

    @Transactional(readOnly = true)
    public ExamMonitoringSummary getExamMonitoring(long teacherId, long examId) {
        if (teacherId <= 0 || examId <= 0) {
            throw new IllegalArgumentException("A valid teacher and exam are required.");
        }
        try {
            if (!monitoringRepository.isExamOwnedByTeacher(examId, teacherId)) {
                throw examNotAccessible();
            }
            return new ExamMonitoringSummary(
                    examId, monitoringRepository.findExamMonitoring(examId), INTERPRETATION);
        } catch (MonitoringException exception) {
            throw exception;
        } catch (DataAccessException | IllegalStateException exception) {
            throw databaseError(exception);
        }
    }

    private static String descriptionFor(ActivityType type) {
        return switch (type) {
            case TAB_HIDDEN -> "The examination tab became hidden.";
            case WINDOW_BLUR -> "The examination window lost focus.";
            case DISCONNECTED -> "The student connection was interrupted.";
            case RECONNECTED -> "The student connection was restored.";
        };
    }

    private static MonitoringException attemptNotAccessible() {
        return new MonitoringException(
                ATTEMPT_NOT_ACCESSIBLE,
                "The attempt is not available to this student.");
    }

    private static MonitoringException examNotAccessible() {
        return new MonitoringException(
                EXAM_NOT_ACCESSIBLE,
                "The exam monitoring data is not available to this teacher.");
    }

    private static MonitoringException databaseError(RuntimeException cause) {
        return new MonitoringException(
                DATABASE_ERROR,
                "Monitoring data could not be processed.",
                cause);
    }
}
