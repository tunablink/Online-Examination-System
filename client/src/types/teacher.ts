import type {
  ResultReleasePolicy,
} from './examEditor';

export type TeacherExamStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'CLOSED';

export interface TeacherProfile {
  id: number;
  institutionalId: string;
  fullName: string;
  email: string;
  staffId: string;
}

export interface TeacherExamConfiguration {
  passingPercentage: number;

  resultReleasePolicy:
    ResultReleasePolicy;

  randomizeQuestionOrder: boolean;
  randomizeChoiceOrder: boolean;

  monitorTabVisibility: boolean;
  monitorWindowFocus: boolean;
  monitorFullscreenExit: boolean;
  monitorConnectionChanges: boolean;
}

export interface TeacherExam {
  id: string;
  examCode: string;

  title: string;
  courseCode: string;
  courseName: string;

  description: string;

  status: TeacherExamStatus;

  startsAt: string;
  endsAt: string;

  durationMinutes: number;
  questionCount: number;

  assignedStudentCount: number;
  activeAttemptCount: number;
  submittedAttemptCount: number;

  suspiciousActivityCount: number;

  configuration:
    TeacherExamConfiguration;
}
