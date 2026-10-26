export type ClientMessageType =
  | 'PING'
  | 'REGISTER'
  | 'LOGIN'
  | 'GET_TEACHER_DASHBOARD'
  | 'CREATE_EXAM'
  | 'GET_TEACHER_EXAMS'
  | 'GET_EXAM'
  | 'UPDATE_EXAM'
  | 'PUBLISH_EXAM'
  | 'CLOSE_EXAM'
  | 'DELETE_EXAM'
  | 'CREATE_QUESTION'
  | 'GET_EXAM_QUESTIONS'
  | 'GET_AVAILABLE_EXAMS'
  | 'GET_AVAILABLE_EXAM';

export type ServerMessageType =
  | 'CONNECTED'
  | 'PONG'
  | 'REGISTERED'
  | 'LOGGED_IN'
  | 'TEACHER_DASHBOARD'
  | 'EXAM_CREATED'
  | 'TEACHER_EXAMS'
  | 'EXAM_DETAILS'
  | 'EXAM_UPDATED'
  | 'EXAM_PUBLISHED'
  | 'EXAM_CLOSED'
  | 'EXAM_DELETED'
  | 'QUESTION_CREATED'
  | 'EXAM_QUESTIONS'
  | 'AVAILABLE_EXAMS'
  | 'AVAILABLE_EXAM_DETAILS'
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
}

export interface GetExamPayload {
  examId: number;
}

export interface UpdateExamPayload {
  examId: number;
  title: string;
  description: string;
  durationMinutes: number;
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

export interface ExamDetailsData {
  id: number;
  title: string;
  description: string | null;
  durationMinutes: number;
  status: ExamStatus;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

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
  role?: UserRole;
  active?: boolean;

  title?: string;
  description?: string | null;
  durationMinutes?: number;
  status?: ExamStatus;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;

  exams?: ExamDetailsData[];
  examId?: number;
  content?: string;
  points?: number;
  displayOrder?: number;
  choices?: TeacherChoiceData[];
  questions?: TeacherQuestionData[];

  totalExams?: number;
  draftExamCount?: number;
  publishedExamCount?: number;
  closedExamCount?: number;
  recentExams?: TeacherDashboardExamData[];
}

export interface ServerMessage {
  requestId: string | null;
  type: ServerMessageType;
  data: ServerMessageData | null;
  error: ProtocolError | null;
}
