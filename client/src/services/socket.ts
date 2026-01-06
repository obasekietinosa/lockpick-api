export type WebSocketMessage = {
    type: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload?: any;
    room_id?: string;
    player_id?: string;
};

type MessageHandler = (message: WebSocketMessage) => void;

class WebSocketService {
    private socket: WebSocket | null = null;
    private handlers: MessageHandler[] = [];
    private url: string;

    constructor(url: string) {
        this.url = url;
    }

    connect() {
        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            console.log('WebSocket already connected or connecting');
            return;
        }

        console.log('Connecting to WebSocket:', this.url);
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
            console.log('WebSocket connected');
        };

        this.socket.onmessage = (event) => {
            try {
                const message: WebSocketMessage = JSON.parse(event.data);
                console.log('WS Recv:', message);
                this.handlers.forEach(handler => handler(message));
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.socket.onclose = () => {
            console.log('WebSocket disconnected');
            this.socket = null;
        };
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }

    subscribe(handler: MessageHandler) {
        this.handlers.push(handler);
        return () => {
            this.handlers = this.handlers.filter(h => h !== handler);
        };
    }

    sendMessage(message: WebSocketMessage) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket not connected. Message not sent:', message);
        }
    }

    isConnected(): boolean {
        return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
    }
}

// Export a singleton instance
// Determine WS URL from Env or default
const API_URL = import.meta.env.VITE_API_URL || 'https://api.lockpick.co';
const WS_URL = API_URL.replace(/^http/, 'ws') + '/ws';

export const socketService = new WebSocketService(WS_URL);
