import { useState, useEffect, useCallback, useRef } from 'react';
import { socketService, type WebSocketMessage } from '../services/socket';

export type GuessFeedback = 'correct' | 'present' | 'absent';

export interface Guess {
    values: string[];
    feedback: GuessFeedback[];
    timestamp: number;
}

export interface GameConfig {
    pinLength: number;
    hintsEnabled: boolean;
    timerDuration: number; // in seconds
    maxRounds: number;
    playerPins?: string[];
    mode: 'single' | 'multiplayer';
    roomId?: string;
    playerId?: string;
}

export interface RoundResult {
    winner: 'player' | 'opponent' | 'draw' | null;
    reason: 'guessed' | 'timeout' | 'surrender' | null;
    score: number;
}

// SP Bot config
const OPPONENT_GUESS_INTERVAL = 2000;

export const useGameLogic = (config: GameConfig) => {
    // Game State
    const [currentRound, setCurrentRound] = useState(1);
    const [playerScore, setPlayerScore] = useState(0);
    const [opponentScore, setOpponentScore] = useState(0);
    const [isGameOver, setIsGameOver] = useState(false);

    // Round State
    const [secretPin, setSecretPin] = useState<string[]>([]);
    const [guesses, setGuesses] = useState<Guess[]>([]);
    const [currentGuess, setCurrentGuess] = useState<string[]>(Array(config.pinLength).fill(''));
    const [timeLeft, setTimeLeft] = useState(config.timerDuration);
    const [isRoundActive, setIsRoundActive] = useState(false);
    const [roundResult, setRoundResult] = useState<RoundResult | null>(null);

    // Pending Round Start (for MP race conditions)
    const [pendingRoundStart, setPendingRoundStart] = useState<number | null>(null);

    // Opponent State
    const [opponentGuesses, setOpponentGuesses] = useState<Guess[]>([]);

    // Refs
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const opponentTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // --- Helpers ---

    const generatePin = useCallback((length: number) => {
        return Array.from({ length }, () => Math.floor(Math.random() * 10).toString());
    }, []);

    const calculateFeedback = useCallback((guess: string[], secret: string[]): GuessFeedback[] => {
        const feedback: GuessFeedback[] = Array(guess.length).fill('absent');
        const usedSecretIndices = new Set<number>();
        const usedGuessIndices = new Set<number>();

        // 1. Check for correct positions (Green)
        for (let i = 0; i < guess.length; i++) {
            if (guess[i] === secret[i]) {
                feedback[i] = 'correct';
                usedSecretIndices.add(i);
                usedGuessIndices.add(i);
            }
        }

        // 2. Check for present numbers (Orange) - only if hints enabled
        if (config.hintsEnabled) {
            for (let i = 0; i < guess.length; i++) {
                if (!usedGuessIndices.has(i)) {
                    for (let j = 0; j < secret.length; j++) {
                        if (!usedSecretIndices.has(j) && secret[j] === guess[i]) {
                            feedback[i] = 'present';
                            usedSecretIndices.add(j);
                            break;
                        }
                    }
                }
            }
        }

        return feedback;
    }, [config.hintsEnabled]);

    const mapServerHints = useCallback((hints: number[]): GuessFeedback[] => {
        return hints.map(h => {
            if (h === 2) return 'correct';
            if (h === 1) return 'present';
            return 'absent';
        });
    }, []);


    // --- Actions ---

    const startRound = useCallback((roundNum?: number) => {
        if (config.mode === 'single') {
            const newPin = generatePin(config.pinLength);
            setSecretPin(newPin);
        }
        // In multiplayer, secretPin is unknown/managed by server

        if (roundNum) setCurrentRound(roundNum);

        setGuesses([]);
        setOpponentGuesses([]);
        setCurrentGuess(Array(config.pinLength).fill(''));
        setTimeLeft(config.timerDuration);
        // Do not clear roundResult here; let the user dismiss the modal via nextRound
        setIsRoundActive(true);
    }, [config.pinLength, config.timerDuration, config.mode, generatePin]);

    const submitGuess = useCallback(() => {
        if (!isRoundActive) return;
        if (currentGuess.some(digit => digit === '')) return;

        if (config.mode === 'multiplayer') {
             if (!config.roomId || !config.playerId) return;

             socketService.sendMessage({
                 type: 'guess',
                 room_id: config.roomId,
                 player_id: config.playerId,
                 payload: {
                     guess: currentGuess.join(''),
                     room_id: config.roomId, // Redundant but safe based on server types
                     player_id: config.playerId
                 }
             });
             // We don't update local state yet; wait for server response
             return;
        }

        // Single Player Logic
        const feedback = calculateFeedback(currentGuess, secretPin);
        const newGuess: Guess = {
            values: [...currentGuess],
            feedback,
            timestamp: Date.now(),
        };

        setGuesses(prev => [newGuess, ...prev]);
        setCurrentGuess(Array(config.pinLength).fill(''));

        if (feedback.every(f => f === 'correct')) {
            endRound('player', 'guessed');
        }
    }, [isRoundActive, currentGuess, secretPin, calculateFeedback, config.pinLength, config.mode, config.roomId, config.playerId]);

    const endRound = useCallback((winner: 'player' | 'opponent' | 'draw', reason: 'guessed' | 'timeout' | 'surrender') => {
        setIsRoundActive(false);
        if (timerRef.current) clearInterval(timerRef.current);
        if (opponentTimerRef.current) clearInterval(opponentTimerRef.current);

        setRoundResult({ winner, reason, score: 0 }); // Score is tracked globally

        if (config.mode === 'single') {
            if (winner === 'player') setPlayerScore(s => s + 1);
            if (winner === 'opponent') setOpponentScore(s => s + 1);
        }
        // In multiplayer, score comes from server or we update it based on events
    }, [config.mode]);

    const nextRound = useCallback(() => {
        setRoundResult(null); // Clear modal when user acknowledges

        if (config.mode === 'multiplayer') {
            // Check for pending round start
            if (pendingRoundStart !== null) {
                console.log("Consuming pending round start:", pendingRoundStart);
                startRound(pendingRoundStart);
                setPendingRoundStart(null);
            }

            // Notify server we are ready for next round (if supported/required)
            if (config.roomId && config.playerId) {
                socketService.sendMessage({
                    type: 'player_ready',
                    room_id: config.roomId,
                    player_id: config.playerId
                });
            }
            return;
        }

        if (currentRound < config.maxRounds) {
            setCurrentRound(prev => prev + 1);
            startRound();
        } else {
            setIsGameOver(true);
        }
    }, [currentRound, config.maxRounds, config.mode, startRound, pendingRoundStart, config.roomId, config.playerId]);

    // Opponent Logic (Bot)
    const opponentMakeGuess = useCallback(() => {
        const currentRoundIndex = currentRound - 1;
        const playerSecretStr = config.playerPins?.[currentRoundIndex];

        if (!playerSecretStr) return;

        const botGuess = generatePin(config.pinLength);
        const playerSecret = playerSecretStr.split('');
        const feedback = calculateFeedback(botGuess, playerSecret);

        const newGuess: Guess = {
            values: botGuess,
            feedback,
            timestamp: Date.now()
        };

        setOpponentGuesses(prev => [newGuess, ...prev]);

        if (feedback.every(f => f === 'correct')) {
            endRound('opponent', 'guessed');
        }
    }, [config.pinLength, config.playerPins, currentRound, calculateFeedback, endRound, generatePin]);


    // --- Effects ---

    // Multiplayer Socket Listeners
    useEffect(() => {
        if (config.mode !== 'multiplayer' || !config.roomId) return;

        const handleMessage = (msg: WebSocketMessage) => {
            // Critical: Filter messages by room_id
            const msgRoomId = msg.payload?.room_id;

            // Note: game_start messages might come from global channel?
            // But we are in-game, so we expect messages for THIS room.
            if (msgRoomId && msgRoomId !== config.roomId) {
                // console.log("Ignoring message for other room:", msgRoomId);
                return;
            }

            if (msg.type === 'guess_result') {
                const { player_id, guess, hints } = msg.payload;
                const guessArr = guess.split('');
                const feedback = mapServerHints(hints || []);

                const newGuess: Guess = {
                    values: guessArr,
                    feedback,
                    timestamp: Date.now()
                };

                if (player_id === config.playerId) {
                    setGuesses(prev => [newGuess, ...prev]);
                    setCurrentGuess(Array(config.pinLength).fill('')); // Clear input
                } else {
                    setOpponentGuesses(prev => [newGuess, ...prev]);
                }
            }
            else if (msg.type === 'round_end') {
                console.log('Round End Received for Room:', config.roomId, msg.payload);
                const { winner_id, scores } = msg.payload || {};

                // Use loose equality for safety if IDs are numbers vs strings, though they should be strings.
                const winner = winner_id === config.playerId ? 'player' : (winner_id ? 'opponent' : 'draw');

                // Update scores
                if (scores && config.playerId) {
                    setPlayerScore(scores[config.playerId] || 0);
                    // Find opponent score
                    const opponentId = Object.keys(scores).find(id => id !== config.playerId);
                    if (opponentId) setOpponentScore(scores[opponentId]);
                } else {
                    // Fallback score update if scores not provided
                    if (winner === 'player') setPlayerScore(s => s + 1);
                    if (winner === 'opponent') setOpponentScore(s => s + 1);
                }

                endRound(winner, 'guessed');
            }
            else if (msg.type === 'round_start') {
                const { round } = msg.payload;
                console.log('Round Start Received:', round);

                // If we are currently showing a round result modal (implied by round > 1),
                // we MUST wait for the user to dismiss it before starting the next round.
                // We queue the round start.
                if (round > 1) {
                    console.log("Queueing round start:", round);
                    setPendingRoundStart(round);
                } else {
                    startRound(round);
                }
            }
            else if (msg.type === 'game_end') {
                // const { winner_id } = msg.payload;
                // Ensure scores are final?
                setIsGameOver(true);
            }
        };

        const unsubscribe = socketService.subscribe(handleMessage);
        return () => unsubscribe();
    }, [config.mode, config.playerId, config.pinLength, mapServerHints, endRound, startRound, config.roomId]);


    // Timer Logic (Local)
    useEffect(() => {
        if (isRoundActive && config.timerDuration > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) return 0;
                    return prev - 1;
                });
            }, 1000);
        }

        if (isRoundActive && config.mode === 'single') {
            opponentTimerRef.current = setInterval(() => {
                opponentMakeGuess();
            }, OPPONENT_GUESS_INTERVAL);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (opponentTimerRef.current) clearInterval(opponentTimerRef.current);
        };
    }, [isRoundActive, config.timerDuration, config.mode, endRound, opponentMakeGuess]);

    // Auto-consume pending round start if modal is closed
    useEffect(() => {
        if (pendingRoundStart !== null && roundResult === null) {
            console.log("Auto-consuming pending round start:", pendingRoundStart);
            startRound(pendingRoundStart);
            setPendingRoundStart(null);
        }
    }, [pendingRoundStart, roundResult, startRound]);

    // Timeout Logic
    useEffect(() => {
        if (timeLeft === 0 && isRoundActive) {
            if (config.mode === 'single') {
                endRound('opponent', 'timeout');
            } else {
                // In MP, server handles timeout. We just wait for round_end msg.
                // But we can stop local timer.
            }
        }
    }, [timeLeft, isRoundActive, config.mode, endRound]);


    // Initial Start
    useEffect(() => {
        // In multiplayer, we might need to wait for start, OR we are already started.
        // If we are here, round 1 is likely active.
        startRound();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        // State
        currentRound,
        playerScore,
        opponentScore,
        isGameOver,
        timeLeft,
        isRoundActive,
        guesses,
        opponentGuesses,
        currentGuess,
        roundResult,
        secretPin,

        // Actions
        setCurrentGuess,
        submitGuess,
        nextRound,
        startRound
    };
};
