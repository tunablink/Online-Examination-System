export type ClientMessageType =
  | 'PING'
  | 'REGISTER'
  | 'LOGIN'
  | 'GET_PROFILE'
  | 'UPDATE_PROFILE'
  | 'CHANGE_PASSWORD'
  | 'GET_STUDENTS'
  | 'GET_STUDENT'
  | 'GET_TEACHER_DASHBOARD'
  | 'CREATE_EXAM'
  | 'GET_TEACHER_EXAMS'
  | 'GET_EXAM'
  | 'UPDATE_EXAM'
  | 'PUBLISH_EXAM'
  | 'CLOSE_EXAM'
  | 'DELETE_EXAM'
  | 'CREATE_QUESTION'
  | 'UPDATE_QUESTION'
  | 'DELETE_QUESTION'
  | 'GET_EXAM_QUESTIONS'
  | 'GET_AVAILABLE_EXAMS'
  | 'GET_AVAILABLE_EXAM'
  | 'START_EXAM'
  | 'GET_EXAM_ATTEMPT'
  | 'SAVE_ANSWER'
  | 'SUBMIT_EXAM'
  | 'GET_ATTEMPT_HISTORY'
  | 'GET_ATTEMPT_RESULT'
  | 'REPORT_ACTIVITY'
  | 'GET_EXAM_MONITORING';

export type ServerMessageType =
  | 'CONNECTED'
  | 'PONG'
  | 'REGISTERED'
  | 'LOGGED_IN'
  | 'PROFILE_DETAILS'
  | 'PROFILE_UPDATED'
  | 'PASSWORD_CHANGED'
  | 'STUDENTS'
  | 'STUDENT_DETAILS'
  | 'TEACHER_DASHBOARD'
  | 'EXAM_CREATED'
  | 'TEACHER_EXAMS'
  | 'EXAM_DETAILS'
  | 'EXAM_UPDATED'
  | 'EXAM_PUBLISHED'
  | 'EXAM_CLOSED'
  | 'EXAM_DELETED'
  | 'QUESTION_CREATED'
  | 'QUESTION_UPDATED'
  | 'QUESTION_DELETED'
  | 'EXAM_QUESTIONS'
  | 'AVAILABLE_EXAMS'
  | 'AVAILABLE_EXAM_DETAILS'
  | 'EXAM_STARTED'
  | 'EXAM_ATTEMPT_DETAILS'
  | 'ANSWER_SAVED'
  | 'EXAM_SUBMITTED'
  | 'ATTEMPT_HISTORY'
  | 'ATTEMPT_RESULT'
  | 'ACTIVITY_RECORDED'
  | 'EXAM_MONITORING'
  | 'ERROR';

export type UserRole =
  | 'STUDENT'
  | 'TEACHER';

export type ExamStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'CLOSED';

export interface RegisterPayload {
  username: string;
  password: string;
  fullName: string;
  email: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface CreateExamPayload {
  title: string;
  description: string;
  durationMinutes: number;
  scheduledAt: string;
}

export interface GetExamPayload {
  examId: number;
}

export interface UpdateExamPayload {
  examId: number;
  title: string;
  description: string;
  durationMinutes: number;
  scheduledAt: string;
}

export interface ExamIdPayload {
  examId: number;
}

export interface GetExamQuestionsPayload {
  examId: number;
}

export interface CreateQuestionChoicePayload {
  content: string;
  correct: boolean;
  displayOrder: number;
}

export interface CreateQuestionPayload {
  examId: number;
  content: string;
  points: number;
  displayOrder: number;
  choices: CreateQuestionChoicePayload[];
}

export interface UpdateQuestionPayload {
  questionId: number;
  content: string;
  points: number;
  displayOrder: number;
  choices: CreateQuestionChoicePayload[];
}

export interface DeleteQuestionPayload {
  questionId: number;
}

export interface TeacherChoiceData {
  id: number;
  questionId: number;
  content: string;
  correct: boolean;
  displayOrder: number;
}

export interface TeacherQuestionData {
  id: number;
  examId: number;
  content: string;
  points: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  choices: TeacherChoiceData[];
}

export interface GetAvailableExamPayload {
  examId: number;
}

export interface StartExamPayload {
  examId: number;
}

export interface GetExamAttemptPayload {
  attemptId: number;
}

export interface SaveAnswerPayload {
  attemptId: number;
  questionId: number;
  choiceId: number;
}

export interface SubmitExamPayload {
  attemptId: number;
}

export interface GetAttemptResultPayload {
  attemptId: number;
}

export type MonitoringActivityType =
  | 'TAB_HIDDEN'
  | 'WINDOW_BLUR'
  | 'DISCONNECTED'
  | 'RECONNECTED';

export type MonitoringRule =
  | MonitoringActivityType
  | 'MULTIPLE_WARNING_THRESHOLD';

export type MonitoringSeverity = 'INFO' | 'WARNING';

export interface SuspiciousActivityData {
  id: number;
  attemptId: number;
  rule: MonitoringRule;
  severity: MonitoringSeverity;
  description: string;
  occurredAt: string;
  recordedAt: string;
}

export interface MonitoringAttemptData {
  attemptId: number;
  studentId: number;
  studentUsername: string;
  studentFullName: string;
  attemptStatus: 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';
  deadline: string;
  warningCount: number;
  latestSuspiciousActivity: SuspiciousActivityData | null;
}

export interface ExamMonitoringData {
  examId: number;
  attempts: MonitoringAttemptData[];
  interpretation: string;
}

export interface ActivityRecordedData {
  activity: SuspiciousActivityData;
  thresholdActivity: SuspiciousActivityData | null;
  warningCount: number;
  interpretation: string;

}

export interface ExamDetailsData {
  id: number;
  title: string;
  description: string | null;
  durationMinutes: number;
  scheduledAt: string | null;
  status: ExamStatus;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileData {
  id: number;
  username: string;
  fullName: string;
  email: string;
  department: string | null;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudentDirectoryData {
  id: number;
  username: string;
  fullName: string;
  email: string;
  active: boolean;
  createdAt: string;
}

export type ServerExam = ExamDetailsData;

export interface TeacherDashboardExamData {
  id: number;
  title: string;
  description: string | null;
  durationMinutes: number;
  status: ExamStatus;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherDashboardData {
  totalExams: number;
  draftExamCount: number;
  publishedExamCount: number;
  closedExamCount: number;
  recentExams: TeacherDashboardExamData[];
}

export interface AvailableExamDetailsData {
  id: number;
  title: string;
  description: string | null;
  durationMinutes: number;
  questionCount: number;
  totalPoints: number;
  scheduledAt: string | null;
}

export interface ClientMessage {
  requestId: string;
  type: ClientMessageType;
  payload: Record<string, unknown>;
}

export interface ProtocolError {
  code: string;
  message: string;
}

export interface ServerMessageData {
  message?: string;
  sessionId?: string;
  serverTime?: string;

  id?: number;
  username?: string;
  fullName?: string;
  email?: string;
  department?: string | null;
  role?: UserRole;
  active?: boolean;
  students?: StudentDirectoryData[];

  title?: string;
  description?: string | null;
  durationMinutes?: number;
  scheduledAt?: string | null;
  status?: ExamStatus;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;

  exams?: unknown[];
  attempts?: unknown[];
  examId?: number;
  examTitle?: string;
  content?: string;
  points?: number;
  displayOrder?: number;
  attemptId?: number;
  questionId?: number;
  choiceId?: number;
  savedAt?: string;
  startedAt?: string;
  submittedAt?: string;
  score?: number;
  maxScore?: number;
  correctAnswers?: number;
  totalQuestions?: number;
  choices?: TeacherChoiceData[];
  questions?: TeacherQuestionData[];

  totalExams?: number;
  draftExamCount?: number;
  publishedExamCount?: number;
  closedExamCount?: number;
  recentExams?: TeacherDashboardExamData[];

  activity?: SuspiciousActivityData;
  thresholdActivity?: SuspiciousActivityData | null;
  warningCount?: number;
  interpretation?: string;
}

export interface ServerMessage {
  requestId: string | null;
  type: ServerMessageType;
  data: ServerMessageData | null;
  error: ProtocolError | null;
}
