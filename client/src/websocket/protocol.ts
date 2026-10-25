export type ClientMessageType =
  | 'PING'
  | 'REGISTER'
  | 'LOGIN'
  | 'CREATE_EXAM'
  | 'GET_TEACHER_EXAMS'
  | 'GET_EXAM'
  | 'CREATE_QUESTION'
  | 'GET_EXAM_QUESTIONS'
  | 'GET_AVAILABLE_EXAMS'
  | 'GET_AVAILABLE_EXAM';

export type ServerMessageType =
  | 'CONNECTED'
  | 'PONG'
  | 'REGISTERED'
  | 'LOGGED_IN'
  | 'EXAM_CREATED'
  | 'TEACHER_EXAMS'
  | 'EXAM_DETAILS'
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

export interface GetExamQuestionsPayload {
  examId: number;
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
}

export interface ServerMessage {
  requestId: string | null;
  type: ServerMessageType;
  data: ServerMessageData | null;
  error: ProtocolError | null;
}