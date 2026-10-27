export type ResultOutcome =
  | 'PASSED'
  | 'FAILED';

export interface ExamResult {
  id: string;
  examId: string;
  attemptId: string;

  examTitle: string;
  examCode: string;
  courseCode: string;
  courseName: string;

  submittedAt: string;
  durationSpentSeconds: number;

  score: number;
  totalScore: number;

  correctAnswerCount: number;
  totalQuestionCount: number;

  passingScore: number;
  outcome: ResultOutcome;
}

export type AttemptHistoryStatus =
  | 'AWAITING_RESULT'
  | 'RESULT_RELEASED'
  | 'MISSED';

export interface AttemptHistoryItem {
  attemptId: string;
  examId: string;

  examTitle: string;
  examCode: string;
  courseCode: string;
  courseName: string;

  submittedAt?: string;
  scheduledAt?: string;

  status: AttemptHistoryStatus;

  score?: number;
  totalScore?: number;
  outcome?: ResultOutcome;
}
