export type SessionConnectionStatus =
  | 'ONLINE'
  | 'DISCONNECTED';

export type AttemptMonitoringStatus =
  | 'NOT_STARTED'
  | 'TAKING'
  | 'SUBMITTED';

export type SuspiciousSeverity =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH';

export type SuspiciousActivityType =
  | 'TAB_HIDDEN'
  | 'WINDOW_BLUR'
  | 'FULLSCREEN_EXIT'
  | 'DISCONNECTED'
  | 'RECONNECTED'
  | 'RAPID_ANSWER_CHANGE';

export interface MonitoredStudentSession {
  sessionId: string;
  attemptId: string;
  examId: string;

  studentId: string;
  studentName: string;

  connectionStatus:
    SessionConnectionStatus;

  attemptStatus:
    AttemptMonitoringStatus;

  answeredQuestionCount: number;
  totalQuestionCount: number;

  remainingSeconds: number;
  suspiciousActivityCount: number;

  lastSeenAt: string;
}

export interface SuspiciousActivityEvent {
  id: string;

  examId: string;
  attemptId: string;

  studentId: string;
  studentName: string;

  type: SuspiciousActivityType;
  severity: SuspiciousSeverity;

  occurredAt: string;

  description: string;
}