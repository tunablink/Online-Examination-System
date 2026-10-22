import type {
  MonitoredStudentSession,
  SuspiciousActivityEvent,
} from '../types/monitoring';

export const MOCK_MONITORED_SESSIONS:
  MonitoredStudentSession[] = [
    {
      sessionId: 'session-001',
      attemptId: 'attempt-java-101',
      examId: 'exam-java-001',

      studentId: '22010482',
      studentName: 'Alex Nguyen',

      connectionStatus: 'ONLINE',
      attemptStatus: 'TAKING',

      answeredQuestionCount: 26,
      totalQuestionCount: 40,

      remainingSeconds: 34 * 60 + 18,
      suspiciousActivityCount: 1,

      lastSeenAt:
        '2026-10-21T16:15:42+07:00',
    },

    {
      sessionId: 'session-002',
      attemptId: 'attempt-java-102',
      examId: 'exam-java-001',

      studentId: '22010517',
      studentName: 'Linh Pham',

      connectionStatus: 'ONLINE',
      attemptStatus: 'TAKING',

      answeredQuestionCount: 31,
      totalQuestionCount: 40,

      remainingSeconds: 29 * 60 + 4,
      suspiciousActivityCount: 0,

      lastSeenAt:
        '2026-10-21T16:15:44+07:00',
    },

    {
      sessionId: 'session-003',
      attemptId: 'attempt-java-103',
      examId: 'exam-java-001',

      studentId: '22010621',
      studentName: 'Hai Yen Nguyen',

      connectionStatus: 'DISCONNECTED',
      attemptStatus: 'TAKING',

      answeredQuestionCount: 18,
      totalQuestionCount: 40,

      remainingSeconds: 37 * 60 + 51,
      suspiciousActivityCount: 3,

      lastSeenAt:
        '2026-10-21T16:13:02+07:00',
    },

    {
      sessionId: 'session-004',
      attemptId: 'attempt-java-104',
      examId: 'exam-java-001',

      studentId: '22010703',
      studentName: 'Hoang Yen Tran',

      connectionStatus: 'ONLINE',
      attemptStatus: 'SUBMITTED',

      answeredQuestionCount: 40,
      totalQuestionCount: 40,

      remainingSeconds: 0,
      suspiciousActivityCount: 0,

      lastSeenAt:
        '2026-10-21T16:08:37+07:00',
    },

    {
      sessionId: 'session-005',
      attemptId: 'attempt-java-105',
      examId: 'exam-java-001',

      studentId: '22010788',
      studentName: 'Phanh Le',

      connectionStatus: 'ONLINE',
      attemptStatus: 'TAKING',

      answeredQuestionCount: 22,
      totalQuestionCount: 40,

      remainingSeconds: 32 * 60 + 46,
      suspiciousActivityCount: 2,

      lastSeenAt:
        '2026-10-21T16:15:40+07:00',
    },

    {
      sessionId: 'session-pattern-001',
      attemptId: 'attempt-pattern-101',
      examId: 'exam-patterns-001',

      studentId: '22010802',
      studentName: 'Minh Anh Do',

      connectionStatus: 'ONLINE',
      attemptStatus: 'NOT_STARTED',

      answeredQuestionCount: 0,
      totalQuestionCount: 25,

      remainingSeconds: 60 * 60,
      suspiciousActivityCount: 0,

      lastSeenAt:
        '2026-10-21T16:10:00+07:00',
    },
  ];

export const MOCK_SUSPICIOUS_ACTIVITIES:
  SuspiciousActivityEvent[] = [
    {
      id: 'activity-001',

      examId: 'exam-java-001',
      attemptId: 'attempt-java-103',

      studentId: '22010621',
      studentName: 'Hai Yen Nguyen',

      type: 'DISCONNECTED',
      severity: 'MEDIUM',

      occurredAt:
        '2026-10-21T16:13:02+07:00',

      description:
        'The WebSocket connection was closed while the attempt was still active.',
    },

    {
      id: 'activity-002',

      examId: 'exam-java-001',
      attemptId: 'attempt-java-103',

      studentId: '22010621',
      studentName: 'Hai Yen Nguyen',

      type: 'TAB_HIDDEN',
      severity: 'LOW',

      occurredAt:
        '2026-10-21T16:08:16+07:00',

      description:
        'The examination tab became hidden for more than the configured threshold.',
    },

    {
      id: 'activity-003',

      examId: 'exam-java-001',
      attemptId: 'attempt-java-103',

      studentId: '22010621',
      studentName: 'Hai Yen Nguyen',

      type: 'FULLSCREEN_EXIT',
      severity: 'HIGH',

      occurredAt:
        '2026-10-21T16:02:31+07:00',

      description:
        'The client reported that fullscreen mode was exited during the attempt.',
    },

    {
      id: 'activity-004',

      examId: 'exam-java-001',
      attemptId: 'attempt-java-105',

      studentId: '22010788',
      studentName: 'Phanh Le',

      type: 'RAPID_ANSWER_CHANGE',
      severity: 'MEDIUM',

      occurredAt:
        '2026-10-21T16:11:27+07:00',

      description:
        'Multiple answer changes were recorded within a short configured interval.',
    },

    {
      id: 'activity-005',

      examId: 'exam-java-001',
      attemptId: 'attempt-java-105',

      studentId: '22010788',
      studentName: 'Phanh Le',

      type: 'WINDOW_BLUR',
      severity: 'LOW',

      occurredAt:
        '2026-10-21T16:06:44+07:00',

      description:
        'The browser window lost focus during the active examination.',
    },

    {
      id: 'activity-006',

      examId: 'exam-java-001',
      attemptId: 'attempt-java-101',

      studentId: '22010482',
      studentName: 'Alex Nguyen',

      type: 'RECONNECTED',
      severity: 'LOW',

      occurredAt:
        '2026-10-21T15:58:20+07:00',

      description:
        'The client reconnected after a temporary network interruption.',
    },
  ];