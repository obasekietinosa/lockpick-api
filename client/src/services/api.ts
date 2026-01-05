export interface GameConfig {
    player_name: string;
    hints_enabled: boolean;
    pin_length: number;
    timer_duration: number;
    is_private: boolean;
}

export interface JoinPayload {
    player_name: string;
    room_id: string;
}

export interface JoinGameResponse {
    config: GameConfig;
    player_id: string;
    room_id: string;
    status: string;
}

export interface SubmitPinPayload {
    pins: string[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.lockpick.co';

export const api = {
    createGame: async (config: GameConfig): Promise<JoinGameResponse> => {
        const payload = {
            config: config,
            player_name: config.player_name
        };

        const response = await fetch(`${API_BASE_URL}/games`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`Failed to create game: ${response.statusText}`);
        }

        return response.json();
    },

    joinGame: async (payload: JoinPayload): Promise<JoinGameResponse> => {
        const response = await fetch(`${API_BASE_URL}/games/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`Failed to join game: ${response.statusText}`);
        }

        return response.json();
    },

    submitPin: async (roomId: string, playerId: string, pins: string[]): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/games/${roomId}/players/${playerId}/pin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ pins }),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Failed to submit pin: ${text}`);
        }
    },

    getGame: async (roomId: string): Promise<JoinGameResponse> => {
        const response = await fetch(`${API_BASE_URL}/games/${roomId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to get game state: ${response.statusText}`);
        }

        return response.json();
    }
};
