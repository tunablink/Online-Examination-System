export interface ExamChoice {
  id: number;
  content: string;
  displayOrder: number;
}

export interface ExamQuestion {
  id: number;
  content: string;
  points: number;
  displayOrder: number;
  choices: ExamChoice[];
}

export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';

export interface SavedAnswer {
  questionId: number;
  choiceId: number;
  savedAt: string;
}

export interface ExamAttempt {
  attemptId: number;
  examId: number;
  examTitle: string;
  status: AttemptStatus;
  startedAt: string;
  deadline: string;
  questions: ExamQuestion[];
  answers: SavedAnswer[];
  result: ExamSubmissionResult | null;
}

export interface ExamSubmissionResult {
  attemptId: number;
  examId: number;
  status: 'SUBMITTED' | 'EXPIRED';
  submittedAt: string;
  score: number;
  maxScore: number;
  correctAnswers: number;
  totalQuestions: number;
}

export interface StudentAttemptResult {
  attemptId: number;
  examId: number;
  examTitle: string;
  courseName?: string | null;
  description?: string | null;
  status: 'SUBMITTED' | 'EXPIRED';
  startedAt: string;
  submittedAt: string;
  score: number;
  maxScore: number;
  correctAnswers: number;
  totalQuestions: number;
}

export interface AttemptHistoryResult {
  attempts: StudentAttemptResult[];
}

export type AnswerMap = Partial<Record<number, number>>;

export function isExamAttempt(value: unknown): value is ExamAttempt {
  if (typeof value !== 'object' || value === null) return false;

  const attempt = value as Record<string, unknown>;
  if (
    typeof attempt.attemptId !== 'number' ||
    typeof attempt.examId !== 'number' ||
    typeof attempt.examTitle !== 'string' ||
    !['IN_PROGRESS', 'SUBMITTED', 'EXPIRED'].includes(String(attempt.status)) ||
    typeof attempt.startedAt !== 'string' ||
    typeof attempt.deadline !== 'string' ||
    !Array.isArray(attempt.questions) ||
    attempt.questions.length === 0 ||
    !Array.isArray(attempt.answers) ||
    !(attempt.result === null || isExamSubmissionResult(attempt.result))
  ) {
    return false;
  }

  const validQuestions = attempt.questions.every((questionValue) => {
    if (typeof questionValue !== 'object' || questionValue === null) return false;
    const question = questionValue as Record<string, unknown>;
    if (
      typeof question.id !== 'number' ||
      typeof question.content !== 'string' ||
      typeof question.points !== 'number' ||
      typeof question.displayOrder !== 'number' ||
      !Array.isArray(question.choices)
    ) {
      return false;
    }

    return question.choices.every((choiceValue) => {
      if (typeof choiceValue !== 'object' || choiceValue === null) return false;
      const choice = choiceValue as Record<string, unknown>;
      return typeof choice.id === 'number' &&
        typeof choice.content === 'string' &&
        typeof choice.displayOrder === 'number';
    });
  });

  return validQuestions && attempt.answers.every((answerValue) => {
    if (typeof answerValue !== 'object' || answerValue === null) return false;
    const answer = answerValue as Record<string, unknown>;
    return typeof answer.questionId === 'number'
      && typeof answer.choiceId === 'number'
      && typeof answer.savedAt === 'string';
  });
}

export function isExamSubmissionResult(value: unknown): value is ExamSubmissionResult {
  if (typeof value !== 'object' || value === null) return false;
  const result = value as Record<string, unknown>;
  return typeof result.attemptId === 'number'
    && typeof result.examId === 'number'
    && (result.status === 'SUBMITTED' || result.status === 'EXPIRED')
    && typeof result.submittedAt === 'string'
    && typeof result.score === 'number'
    && typeof result.maxScore === 'number'
    && typeof result.correctAnswers === 'number'
    && typeof result.totalQuestions === 'number';
}

/** Only a matching, terminal server snapshot may trigger result navigation. */
export function getConfirmedAttemptResult(
  value: unknown,
  attemptId: number,
  examId: number,
): ExamSubmissionResult | null {
  if (!isExamAttempt(value) || value.attemptId !== attemptId || value.examId !== examId
    || value.status === 'IN_PROGRESS' || value.result === null) return null;
  const result = value.result;
  return result.attemptId === attemptId && result.examId === examId && result.status === value.status
    ? result : null;
}

export function isStudentAttemptResult(value: unknown): value is StudentAttemptResult {
  if (typeof value !== 'object' || value === null) return false;
  const result = value as Record<string, unknown>;
  return typeof result.attemptId === 'number'
    && typeof result.examId === 'number'
    && typeof result.examTitle === 'string'
    && (result.courseName === undefined || result.courseName === null || typeof result.courseName === 'string')
    && (result.description === undefined || result.description === null || typeof result.description === 'string')
    && (result.status === 'SUBMITTED' || result.status === 'EXPIRED')
    && typeof result.startedAt === 'string'
    && typeof result.submittedAt === 'string'
    && typeof result.score === 'number'
    && typeof result.maxScore === 'number'
    && typeof result.correctAnswers === 'number'
    && typeof result.totalQuestions === 'number';
}

export function isAttemptHistoryResult(value: unknown): value is AttemptHistoryResult {
  if (typeof value !== 'object' || value === null) return false;
  const result = value as Record<string, unknown>;
  return Array.isArray(result.attempts)
    && result.attempts.every(isStudentAttemptResult);
}
