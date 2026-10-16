import { useCallback, useEffect,  useRef,  useState } from "react";
import type {
    ClientMessage,
    ClientMessageType,
    ServerMessage,
} from "./protocol";

//dong goi WebSocket khoi component gdien
export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

const WEBSOCKET_URL = 'ws://localhost:8081/ws';

export function useExamWebSocket(){
    const socketRef = useRef<WebSocket | null>(null);

    const [status, setStatus] = useState<ConnectionStatus>("connecting");

    const [lastMessage, setLastMessage] = useState<ServerMessage | null>(null);

    useEffect(() => {
        const socket = new WebSocket(WEBSOCKET_URL);

        socketRef.current = socket;

        socket.onopen = () =>{
            setStatus("connected");
        }

        socket.onmessage = (event: MessageEvent<string>) => {
            try{
                const message = JSON.parse(event.data) as ServerMessage;
                setLastMessage(message);
            } catch (error){
                console.error('The server returned invalid JSON:', error);
            }
        };

        socket.onerror = () =>{
            setStatus('error');
        }

        socket.onclose = () =>{
            setStatus('disconnected');
            if (socketRef.current === socket){
                socketRef.current = null;
            }
        };

        return () => {
            if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING){
                socket.close();
            }

            if (socketRef.current === socket){
                socketRef.current = null;
            }
        };
    }, []
)                    

const sendMessage = useCallback(
    (
        type: ClientMessageType,
        payload: Record<string, unknown> = {},
    ) : string | null => {
        const socket = socketRef.current;

        if(
            socket === null || socket.readyState !== WebSocket.OPEN
        ){
            return null;
        }

        const requestId = crypto.randomUUID();

        const message: ClientMessage = {
            requestId,
            type,
            payload
        };

        socket.send(JSON.stringify(message));
        return requestId;
        
    }, [],
);

return {
    status,
    lastMessage,
    sendMessage,
};  
}

