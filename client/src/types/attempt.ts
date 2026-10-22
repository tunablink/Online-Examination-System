export interface ExamChoice {
  id: string;
  content: string;
}

export interface ExamQuestion {
  id: string;
  content: string;
  points: number;
  choices: ExamChoice[];
}

export interface ExamAttempt {
  id: string;
  examId: string;
  examTitle: string;
  examCode: string;
  courseCode: string;
  startedAt: string;
  durationSeconds: number;
  questions: ExamQuestion[];
}

export type AnswerMap = Record<string, string>;

export type AutosaveStatus =
  | 'IDLE'
  | 'SAVING'
  | 'SAVED'
  | 'ERROR';