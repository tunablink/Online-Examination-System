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

export interface ExamAttempt {
  attemptId: number;
  examId: number;
  examTitle: string;
  status: AttemptStatus;
  startedAt: string;
  deadline: string;
  questions: ExamQuestion[];
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
    attempt.questions.length === 0
  ) {
    return false;
  }

  return attempt.questions.every((questionValue) => {
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
}
