import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import { socketService } from "../services/socket";
import type { WebSocketMessage } from "../services/socket";

interface GameState {
    mode: "single" | "multiplayer";
    config: {
        player_name: string;
        hints_enabled: boolean;
        pin_length: number;
        timer_duration: number;
    };
    room_id?: string;
    player_id?: string;
}

export const SelectPinPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state as GameState;

    const pinLength = state?.config?.pin_length || 5;

    // We need 3 pins (one for each round)
    const [pins, setPins] = useState<string[]>(["", "", ""]);
    const [activeRound, setActiveRound] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isWaiting, setIsWaiting] = useState(false);
    const [copied, setCopied] = useState<"link" | "code" | null>(null);

    // Redirect if no state or not multiplayer (sanity check)
    useEffect(() => {
        if (!state) {
            navigate("/");
            return;
        }
    }, [state, navigate]);

    // Connect WebSocket if multiplayer
    useEffect(() => {
        if (state.mode === "multiplayer") {
            socketService.connect();

            // Listen for game_start
            const unsubscribe = socketService.subscribe((msg: WebSocketMessage) => {
                if (msg.type === "game_start" && msg.payload.room_id === state.room_id) {
                    console.log("Game started!", msg);
                    // Navigate to game page
                    navigate("/game", {
                        state: {
                            ...state,
                            pins: pins,
                            gameStarted: true,
                            initialPayload: msg.payload
                        }
                    });
                }
            });

            return () => {
                unsubscribe();
            };
        }
    }, [state, navigate, pins]);

    // Poll for game start if waiting (fallback for lost WS messages)
    useEffect(() => {
        let intervalId: ReturnType<typeof setInterval>;

        if (isWaiting && state.mode === "multiplayer" && state.room_id) {
            const checkGameStatus = async () => {
                try {
                    const game = await api.getGame(state.room_id!);
                    if (game.status === "playing") {
                        console.log("Game started (polled)!", game);
                        navigate("/game", {
                            state: {
                                ...state,
                                pins: pins,
                                gameStarted: true,
                                initialPayload: { room_id: game.room_id, status: game.status }
                            }
                        });
                    }
                } catch (error) {
                    console.error("Failed to poll game status:", error);
                }
            };

            // Check immediately and then every 2 seconds
            checkGameStatus();
            intervalId = setInterval(checkGameStatus, 2000);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [isWaiting, state, navigate, pins]);

    // Auto-focus first input when round changes
    useEffect(() => {
        const firstInput = document.getElementById(`pin-${activeRound}-0`);
        firstInput?.focus();
    }, [activeRound]);

    const handlePinChange = (roundIndex: number, digitIndex: number, value: string) => {
        if (!/^\d*$/.test(value)) return;

        const currentPin = pins[roundIndex];
        const digits = currentPin.padEnd(pinLength, " ").split("");
        digits[digitIndex] = value;

        const newPin = digits.join("").trim();
        const newPins = [...pins];
        newPins[roundIndex] = newPin;
        setPins(newPins);

        // Auto-advance
        if (value && digitIndex < pinLength - 1) {
            const nextInput = document.getElementById(`pin-${roundIndex}-${digitIndex + 1}`);
            nextInput?.focus();
        }
    };

    const randomizePins = () => {
        const newPins = pins.map(() => {
            let pin = "";
            for (let i = 0; i < pinLength; i++) {
                pin += Math.floor(Math.random() * 10).toString();
            }
            return pin;
        });
        setPins(newPins);
    };

    const copyToClipboard = (type: "link" | "code") => {
        if (!state.room_id) return;

        let text = "";
        if (type === "link") {
            const origin = window.location.origin;
            text = `${origin}/join?room=${state.room_id}`;
        } else {
            text = state.room_id;
        }

        navigator.clipboard.writeText(text).then(() => {
            setCopied(type);
            setTimeout(() => setCopied(null), 2000);
        });
    };

    const isComplete = pins.every(pin => pin.length === pinLength);

    const handleReady = async () => {
        if (!isComplete) return;

        if (state.mode === "multiplayer") {
            setIsSubmitting(true);
            try {
                if (state.room_id && state.player_id) {
                    await api.submitPin(state.room_id, state.player_id, pins);
                    setIsWaiting(true);
                } else {
                    console.error("Missing room_id or player_id");
                    alert("Error: Missing game information.");
                }
            } catch (error) {
                console.error("Failed to submit pins:", error);
                alert("Failed to submit pins. Please try again.");
                setIsSubmitting(false);
            }
        } else {
            // Single player logic
            navigate("/game", {
                state: {
                    ...state,
                    pins
                }
            });
        }
    };

    if (!state) return null;

    if (isWaiting) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 text-white">
                 <div className="flex flex-col items-center space-y-4 animate-in fade-in zoom-in duration-500">
                    <Icon icon="line-md:loading-twotone-loop" width="80" className="text-cyan-500" />
                    <h2 className="text-2xl font-bold">Waiting for Opponent...</h2>
                    <p className="text-slate-400">Your pins are locked in. The game will start soon.</p>
                    {state.room_id && (
                        <div className="mt-4 p-6 bg-slate-800 rounded-xl border border-slate-700 flex flex-col items-center gap-4">
                             <div className="text-sm text-slate-400">Room ID</div>
                             <code className="text-xl font-mono text-cyan-400 select-all bg-slate-900 px-4 py-2 rounded">{state.room_id}</code>
                             <div className="flex gap-2">
                                <button
                                    onClick={() => copyToClipboard("link")}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 rounded-lg transition-colors text-sm font-bold"
                                >
                                    {copied === "link" ? <Icon icon="mdi:check" /> : <Icon icon="mdi:link-variant" />}
                                    {copied === "link" ? "Copied!" : "Copy Link"}
                                </button>
                                <button
                                    onClick={() => copyToClipboard("code")}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 text-slate-300 hover:bg-slate-600 rounded-lg transition-colors text-sm"
                                >
                                    {copied === "code" ? <Icon icon="mdi:check" /> : <Icon icon="mdi:content-copy" />}
                                    {copied === "code" ? "Copied" : "Copy Code"}
                                </button>
                             </div>
                        </div>
                    )}
                 </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-slate-900">
            {/* Background decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-20 left-20 text-cyan-500/10 animate-pulse delay-300">
                    <Icon icon="mdi:form-textbox-password" width="100" />
                </div>
                <div className="absolute bottom-20 right-20 text-purple-500/10 animate-bounce delay-700">
                    <Icon icon="mdi:shield-key-outline" width="120" />
                </div>
            </div>

            <div className="max-w-2xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 drop-shadow-sm pb-2">
                        Select Your Pins
                    </h1>
                    <p className="text-gray-400 mt-2">
                        Choose secret pins for all 3 rounds. Don't let your opponent guess them!
                    </p>

                    {/* Room Info Section */}
                    {state.mode === 'multiplayer' && state.room_id && (
                        <div className="mt-6 p-4 bg-slate-800/80 backdrop-blur rounded-xl border border-slate-700 inline-flex flex-col items-center gap-2 shadow-lg">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Invite Opponent</span>
                            <div className="flex items-center gap-3">
                                <code className="text-lg font-mono text-cyan-400 bg-slate-900 px-3 py-1 rounded select-all">
                                    {state.room_id}
                                </code>
                                <div className="h-6 w-px bg-slate-700"></div>
                                <button
                                    onClick={() => copyToClipboard("link")}
                                    className="p-2 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors relative group"
                                    title="Copy Invite Link"
                                >
                                    {copied === "link" ? <Icon icon="mdi:check" width="20" /> : <Icon icon="mdi:link-variant" width="20" />}
                                </button>
                                <button
                                    onClick={() => copyToClipboard("code")}
                                    className="p-2 hover:bg-slate-700 text-slate-400 rounded-lg transition-colors relative group"
                                    title="Copy Room Code"
                                >
                                    {copied === "code" ? <Icon icon="mdi:check" width="20" /> : <Icon icon="mdi:content-copy" width="20" />}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-slate-700 space-y-8">

                    {/* Round Tabs */}
                    <div className="flex justify-center space-x-4">
                        {[0, 1, 2].map((i) => (
                            <button
                                key={i}
                                onClick={() => setActiveRound(i)}
                                disabled={isSubmitting}
                                className={`px-4 py-2 rounded-lg transition-all ${activeRound === i
                                    ? "bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-500/20"
                                    : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                                    }`}
                            >
                                Round {i + 1}
                                {pins[i].length === pinLength && (
                                    <Icon icon="mdi:check-circle" className="inline-block ml-2 text-green-400" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Pin Input Area */}
                    <div className="text-center space-y-4 min-h-[120px]">
                        <h3 className="text-xl text-slate-200 font-medium">
                            Round {activeRound + 1} Secret Pin
                        </h3>
                        <div className="flex justify-center gap-2 sm:gap-4">
                            {Array.from({ length: pinLength }).map((_, idx) => (
                                <input
                                    key={idx}
                                    id={`pin-${activeRound}-${idx}`}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={pins[activeRound][idx] || ""}
                                    onChange={(e) => handlePinChange(activeRound, idx, e.target.value)}
                                    disabled={isSubmitting}
                                    // Handle Backspace to move previous
                                    onKeyDown={(e) => {
                                        if (e.key === "Backspace" && !pins[activeRound][idx] && idx > 0) {
                                            document.getElementById(`pin-${activeRound}-${idx - 1}`)?.focus();
                                        }
                                    }}
                                    className="w-12 h-14 sm:w-16 sm:h-20 text-center text-2xl sm:text-4xl font-bold bg-slate-900 border-2 border-slate-600 rounded-lg focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 text-white transition-all caret-cyan-400 disabled:opacity-50"
                                />
                            ))}
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-700/50">
                        <button
                            onClick={randomizePins}
                            disabled={isSubmitting}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-600 text-slate-300 font-bold hover:bg-slate-800 transition-all hover:text-white disabled:opacity-50"
                        >
                            <Icon icon="mdi:shuffle-variant" width="20" />
                            Randomize All
                        </button>
                        <button
                            onClick={handleReady}
                            disabled={!isComplete || isSubmitting}
                            className="flex-[2] bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-green-500/20 transform transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <Icon icon="eos-icons:loading" width="24" className="animate-spin" />
                            ) : (
                                <>
                                    <Icon icon="mdi:check-bold" width="20" />
                                    I'm Ready
                                </>
                            )}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};
