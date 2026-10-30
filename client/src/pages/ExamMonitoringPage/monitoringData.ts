import type { ExamMonitoringData, MonitoringAttemptData, ServerExam } from '../../websocket/protocol';

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const id = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const date = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));
export function readMonitoring(value: unknown, examId: number): ExamMonitoringData | null {
  if (!record(value) || value.examId !== examId || !Array.isArray(value.attempts)
    || typeof value.interpretation !== 'string') return null;
  const valid = value.attempts.every((a: unknown) => {
    if (!record(a) || !id(a.attemptId) || !id(a.studentId) || typeof a.studentFullName !== 'string'
      || !(a.studentInstitutionalId === null || typeof a.studentInstitutionalId === 'string')
      || !['IN_PROGRESS', 'SUBMITTED', 'EXPIRED'].includes(String(a.attemptStatus)) || !date(a.deadline)
      || typeof a.warningCount !== 'number' || !Number.isSafeInteger(a.warningCount) || a.warningCount < 0) return false;
    const event = a.latestSuspiciousActivity;
    return event === null || (record(event) && id(event.id) && event.attemptId === a.attemptId
      && ['TAB_HIDDEN', 'WINDOW_BLUR', 'DISCONNECTED', 'RECONNECTED', 'MULTIPLE_WARNING_THRESHOLD'].includes(String(event.rule))
      && ['INFO', 'WARNING'].includes(String(event.severity)) && typeof event.description === 'string'
      && date(event.occurredAt) && date(event.recordedAt));
  });
  if (!valid || new Set(value.attempts.map((a: MonitoringAttemptData) => a.attemptId)).size !== value.attempts.length) return null;
  return value as unknown as ExamMonitoringData;
}

export function readExams(value: unknown): ServerExam[] | null {
  if (!Array.isArray(value) || !value.every((exam: unknown) => record(exam) && id(exam.id)
    && typeof exam.title === 'string' && ['DRAFT', 'PUBLISHED', 'CLOSED'].includes(String(exam.status))
    && typeof exam.durationMinutes === 'number' && Number.isSafeInteger(exam.durationMinutes) && exam.durationMinutes > 0
    && (exam.scheduledAt === null || date(exam.scheduledAt))
    && (exam.entryClosesAt == null || date(exam.entryClosesAt))
    && (exam.courseName == null || typeof exam.courseName === 'string'))) return null;
  return value as ServerExam[];
}

export type AttemptFilter = 'ALL' | MonitoringAttemptData['attemptStatus'] | 'WARNINGS';
export function isMonitoringExamAvailable(exam: Pick<ServerExam, 'status' | 'entryClosesAt'>, now: number): boolean {
  if (exam.status !== 'PUBLISHED') return false;
  // Preserve the existing policy for legacy exams without a configured closing time.
  if (exam.entryClosesAt == null) return true;
  const closesAt = Date.parse(exam.entryClosesAt);
  return Number.isFinite(closesAt) && now < closesAt;
}

export function filterAttempts(attempts: MonitoringAttemptData[], filter: AttemptFilter, query: string) {
  const search = query.trim().toLocaleLowerCase();
  return attempts.filter((a) => (filter === 'ALL' || (filter === 'WARNINGS' ? a.warningCount > 0 : a.attemptStatus === filter))
    && `${a.studentFullName} ${a.studentInstitutionalId ?? ''} ${a.attemptId}`.toLocaleLowerCase().includes(search))
    .sort((a, b) => Number(b.attemptStatus === 'IN_PROGRESS') - Number(a.attemptStatus === 'IN_PROGRESS')
      || b.warningCount - a.warningCount || a.studentFullName.localeCompare(b.studentFullName) || a.attemptId - b.attemptId);
}

export function formatMonitoringDate(value: string | null | undefined) {
  return value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('en-GB') : 'Not scheduled';
}
