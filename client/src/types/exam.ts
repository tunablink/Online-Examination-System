export type ExamStatus =
  | 'UPCOMING'
  | 'AVAILABLE'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'RESULT_RELEASED';

export interface StudentExam {
  id: string;
  examCode: string;

  title: string;
  courseCode: string;
  courseName: string;

  startsAt: string;
  endsAt: string;

  durationMinutes: number;
  questionCount: number;

  status: ExamStatus;

  score?: number;
  totalScore?: number;
}

export interface StudentProfile {
  id: number;
  studentId: string;
  username: string;
  fullName: string;
  email: string;
}