export type ResultReleasePolicy =
  | 'IMMEDIATE'
  | 'AFTER_EXAM_CLOSES'
  | 'MANUAL';

export interface ExamEditorForm {
  title: string;
  examCode: string;

  courseCode: string;
  courseName: string;

  description: string;

  startsAt: string;
  endsAt: string;

  durationMinutes: string;
  passingPercentage: string;

  resultReleasePolicy:
    ResultReleasePolicy;

  randomizeQuestionOrder: boolean;
  randomizeChoiceOrder: boolean;

  monitorTabVisibility: boolean;
  monitorWindowFocus: boolean;
  monitorFullscreenExit: boolean;
  monitorConnectionChanges: boolean;
}

export interface ExamEditorValidationErrors {
  title?: string;
  examCode?: string;

  courseCode?: string;
  courseName?: string;

  startsAt?: string;
  endsAt?: string;

  durationMinutes?: string;
  passingPercentage?: string;
}