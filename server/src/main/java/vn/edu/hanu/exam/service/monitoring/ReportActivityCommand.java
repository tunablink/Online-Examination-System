package vn.edu.hanu.exam.service.monitoring;

import vn.edu.hanu.exam.domain.monitoring.ActivityType;

public record ReportActivityCommand(long attemptId, ActivityType activityType) {
}
