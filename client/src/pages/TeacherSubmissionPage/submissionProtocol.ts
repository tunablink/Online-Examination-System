export type SubmissionStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';

export interface TeacherSubmissionData {
  attemptId: number;
  examId: number;
  examTitle: string;
  studentId: number;
  institutionalId: string | null;
  studentFullName: string;
  status: SubmissionStatus;
  startedAt: string;
  deadline: string;
  submittedAt: string | null;
  score: number | null;
  maxScore: number | null;
  correctAnswers: number | null;
  totalQuestions: number | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isNullableInteger(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0);
}

function isStatus(value: unknown): value is SubmissionStatus {
  return value === 'IN_PROGRESS' || value === 'SUBMITTED' || value === 'EXPIRED';
}

export function isTeacherSubmissionData(value: unknown): value is TeacherSubmissionData {
  if (!isRecord(value)) return false;
  if (!isPositiveInteger(value.attemptId)
    || !isPositiveInteger(value.examId)
    || typeof value.examTitle !== 'string'
    || !isPositiveInteger(value.studentId)
    || !(value.institutionalId === null || typeof value.institutionalId === 'string')
    || typeof value.studentFullName !== 'string'
    || !isStatus(value.status)
    || typeof value.startedAt !== 'string'
    || typeof value.deadline !== 'string'
    || !(value.submittedAt === null || typeof value.submittedAt === 'string')
    || !isNullableInteger(value.score)
    || !isNullableInteger(value.maxScore)
    || !isNullableInteger(value.correctAnswers)
    || !isNullableInteger(value.totalQuestions)) {
    return false;
  }

  const resultFields = [value.score, value.maxScore, value.correctAnswers, value.totalQuestions];
  return value.status === 'IN_PROGRESS'
    ? value.submittedAt === null && resultFields.every((field) => field === null)
    : typeof value.submittedAt === 'string' && resultFields.every((field) => typeof field === 'number');
}

export function readSubmissionList(value: unknown): TeacherSubmissionData[] | null {
  if (!isRecord(value) || !Array.isArray(value.submissions)) return null;
  return value.submissions.every(isTeacherSubmissionData) ? value.submissions : null;
}

export function isTerminalSubmission(
  value: TeacherSubmissionData,
): value is TeacherSubmissionData & {
  status: 'SUBMITTED' | 'EXPIRED';
  submittedAt: string;
  score: number;
  maxScore: number;
  correctAnswers: number;
  totalQuestions: number;
} {
  return value.status !== 'IN_PROGRESS'
    && value.submittedAt !== null
    && value.score !== null
    && value.maxScore !== null
    && value.correctAnswers !== null
    && value.totalQuestions !== null;
}
