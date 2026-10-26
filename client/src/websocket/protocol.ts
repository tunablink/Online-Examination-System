export type ClientMessageType =
  | "PING"
  | "REGISTER"
  | "LOGIN"
  | "CREATE_EXAM"
  | "GET_TEACHER_EXAMS"
  | "GET_EXAM"
  | "UPDATE_EXAM"
  | "PUBLISH_EXAM"
  | "CLOSE_EXAM"
  | "DELETE_EXAM";

export type ServerMessageType = 
  | "CONNECTED"
  | "PONG"
  | "REGISTERED"
  | "LOGGED_IN"
  | "EXAM_CREATED"
  | "TEACHER_EXAMS"
  | "EXAM_DETAILS"
  | "EXAM_UPDATED"
  | "EXAM_PUBLISHED"
  | "EXAM_CLOSED"
  | "EXAM_DELETED"
  | "ERROR";

export type UserRole =
  | "STUDENT"
  | "TEACHER";


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

export interface ClientMessage{
    requestId: string;
    type: ClientMessageType;
    payload: Record<string, unknown>;
}

export interface ProtocolError{
    code: string;
    message: string;
}

export interface ServerMessageData{
  message?: string;
  sessionId?: string;
  serverTime?: string;
  id?: number;
  username?: string;
  fullName?: string;
  email?: string;
  role?: UserRole;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  title?: string;
  description?: string;
  durationMinutes?: number;
  status?: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  createdBy?: number;
  examId?: number;
  exams?: ServerExam[];
}

export interface ServerExam {
  id: number;
  title: string;
  description: string | null;
  durationMinutes: number;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServerMessage{
    requestId: string | null;
    type: ServerMessageType;
    data: ServerMessageData | null;
    error: ProtocolError | null;
}
