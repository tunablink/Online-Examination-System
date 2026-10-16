export type ClientMessageType = "PING";

export type ServerMessageType = 
    | "CONNECTED"
    | "PONG"
    | "ERROR";

export interface Base {
    requestId: string;
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
}

export interface ServerMessage{
    requestId: string | null;
    type: ServerMessageType | null;
    data: ServerMessageData | null;
    error: ProtocolError | null;
}
