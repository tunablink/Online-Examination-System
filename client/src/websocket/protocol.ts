export type ClientMessageType =
  | "PING"
  | "REGISTER"
  | "LOGIN";

export type ServerMessageType = 
  | "CONNECTED"
  | "PONG"
  | "REGISTERED"
  | "LOGGED_IN"
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
}

export interface ServerMessage{
    requestId: string | null;
    type: ServerMessageType;
    data: ServerMessageData | null;
    error: ProtocolError | null;
}
