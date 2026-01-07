import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { useGameLogic } from "../hooks/useGameLogic";
import { ScoreBoard } from "../components/game/ScoreBoard";
import { GameTimer } from "../components/game/GameTimer";
import { PinInput } from "../components/game/PinInput";
import { GuessHistory } from "../components/game/GuessHistory";
import { PinDisplay } from "../components/game/PinDisplay";
import { RoundResultModal } from "../components/game/RoundResultModal";
import { GameResultModal } from "../components/game/GameResultModal";
import { Icon } from "@iconify/react";

export const GamePage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Safety check for state
    const state = location.state;

    useEffect(() => {
        if (!state) {
            navigate("/");
        }
    }, [state, navigate]);

    // Construct Config for Hook
    // Default config if something is missing
    const config = {
        pinLength: state?.config?.pin_length || 5,
        hintsEnabled: state?.config?.hints_enabled ?? true,
        timerDuration: state?.config?.timer_duration || 180, // Default 3 mins
        maxRounds: 3,
        mode: state?.mode || 'single',
        roomId: state?.room_id,
        playerId: state?.player_id,
    };

    // Get current round's player pin
    const playerPins = state?.pins || ["", "", ""];

    // We can't access hook state initialized conditionally, but we can access it inside component.
    // The hook needs the current round pin, but `useGameLogic` manages `currentRound`.
    // We should pass the FULL array of pins to the hook or fetch it based on round index inside the component.
    // The hook in `useGameLogic` currently takes `playerPin` as a single string.
    // Let's modify usage:
    // The hook updates `currentRound`. We can get the pin for that round.
    // But hooks can't re-run with DIFFERENT initial props reactively logic-wise if we just pass `playerPins[round]`.
    // Actually, passing `playerPins[currentRound - 1]` is fine as long as `useGameLogic` reacts to prop changes if needed
    // OR we pass the whole array.
    // `useGameLogic` currently takes `playerSecretPinRound`.
    // We need to make sure `useGameLogic` uses the *current* round's pin for bot logic.

    // Wait, I can't call hooks conditionally or inside loops.
    // I need access to `currentRound` *from* the hook to know which pin to pass *to* the hook?
    // That's a circular dependency.
    // Better: Helper function inside hook that takes the round index or just pass all pins to hook.

    // For now, let's assume `useGameLogic` handles internal round updating, and we need to provide the *current* secret
    // for the *current* round.
    // BUT `currentRound` is state *inside* the hook.
    // So the hook needs to accept `allPlayerPins`.

    // NOTE: I will probably need to Refactor `useGameLogic` slightly to accept `string[]` for pins,
    // or just assume Single Player doesn't need player pin for anything other than displaying?
    // Oh wait, the BOT needs to guess the PLAYER'S pin. So yes, the logic needs it.

    // Quick fix: Update `useGameLogic` to take array of pins.
    // OR: pass a getter function `(round) => pin`.

    // Let's implement GamePage assuming I'll fix the hook signature in a second strictly if needed.
    // Actually, `useGameLogic` logic for `opponentMakeGuess` depends on `playerSecretPinRound`.
    // If I pass `playerPins[currentRound - 1]` to the hook, does it work?
    // `currentRound` is returned by the hook.
    // So I can't pass `playerPins[hook.currentRound]` to the hook definition.

    // Solution: Pass the whole `playerPins` array to `useGameLogic`.

    // For this step, I'll pass the whole array. I'll need to update `useGameLogic` after this file writing.

    // To avoid errors, I'll create the component passing the array, and then immediately update the hook.

    const {
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
        setCurrentGuess,
        submitGuess,
        nextRound
    } = useGameLogic({ ...config, playerPins }); // Passing playerPins array

    if (!state) return null;

    return (
        <div className="min-h-screen bg-slate-900 text-slate-200 p-4 font-sans flex flex-col relative overflow-hidden">

            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, slate-600 1px, transparent 0)', backgroundSize: '40px 40px' }}
            />

            {/* Header / Scoreboard */}
            <div className="mb-4 sm:mb-8 relative z-10">
                <ScoreBoard
                    playerScore={playerScore}
                    opponentScore={opponentScore}
                    currentRound={currentRound}
                    maxRounds={3}
                    playerName={state.config.player_name || "Player"}
                />
            </div>

            {/* Main Game Area */}
            <main className="flex-1 max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-6 pb-20">

                {/* Left: Player History */}
                <div className="md:col-span-3 order-2 md:order-1 flex flex-col gap-2">
                    <h3 className="text-center text-slate-400 text-sm uppercase tracking-wider font-bold mb-2">Your Guesses</h3>
                    <div className="bg-slate-800/50 rounded-2xl border border-slate-700 flex-1 min-h-[150px] md:min-h-[300px] shadow-inner relative">
                        <div className="absolute inset-0 overflow-hidden rounded-2xl">
                            <GuessHistory guesses={guesses} />
                        </div>
                    </div>
                </div>

                {/* Center: Interaction */}
                <div className="md:col-span-6 order-1 md:order-2 flex flex-col items-center justify-start space-y-8 pt-4">

                    {/* Mobile Only: Latest Guess */}
                    <div className="md:hidden w-full flex flex-col items-center space-y-2 animate-in fade-in slide-in-from-top-4">
                        {guesses.length > 0 && (
                            <div className="w-full max-w-md bg-slate-800/50 border border-slate-700 rounded-xl p-4 shadow-lg">
                                <div className="text-center text-xs text-slate-400 uppercase tracking-wider font-bold mb-2">Latest Guess</div>
                                <div className="flex justify-center">
                                    <PinDisplay values={guesses[0].values} feedback={guesses[0].feedback} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Timer */}
                    <GameTimer timeLeft={timeLeft} totalTime={config.timerDuration} />

                    {/* Input Area */}
                    <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-md p-6 rounded-2xl border border-slate-600 shadow-2xl relative">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-slate-700 rounded-full text-xs text-slate-300 font-bold uppercase tracking-wider border border-slate-600">
                            Enter Guess
                        </div>

                        <PinInput
                            length={config.pinLength}
                            value={currentGuess}
                            onChange={setCurrentGuess}
                            onComplete={(val) => submitGuess(val)}
                            disabled={!isRoundActive}
                        />

                        <button
                            onClick={() => submitGuess()}
                            disabled={!isRoundActive || currentGuess.some(d => d === "")}
                            className="mt-6 w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:grayscale transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 text-lg"
                        >
                            <Icon icon="mdi:lock-open-check" width="24" />
                            Submit Attempt
                        </button>
                    </div>

                    {/* Secret Pin Reveal (Maybe show what we are defending?) */}
                    <div className="text-center">
                        <p className="text-slate-500 text-xs uppercase mb-2">Defending Pin</p>
                        <div className="flex gap-1 justify-center opacity-70">
                            {playerPins[currentRound - 1]?.split('').map((char: string, i: number) => (
                                <div key={i} className="w-6 h-8 bg-slate-800 border border-slate-700 rounded flex items-center justify-center text-slate-400 font-mono">
                                    {char}
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Right: Opponent Status */}
                <div className="md:col-span-3 order-3 flex flex-col gap-2">
                    <h3 className="text-center text-slate-400 text-sm uppercase tracking-wider font-bold mb-2">Opponent's Last Move</h3>
                    <div className="bg-slate-800/50 rounded-2xl border border-slate-700 flex-1 min-h-[300px] shadow-inner p-4 flex flex-col">

                        {opponentGuesses.length > 0 ? (
                            <div className="space-y-4">
                                <div className="text-center text-purple-400 font-bold mb-2">Latest Guess</div>
                                <div className="flex justify-center flex-wrap gap-2">
                                    {/* Just show simple blocks for feedback, maybe not full massive display if space limited?
                                         Actually reuse PinDisplay but scale down if needed.
                                     */}
                                    <PinDisplay values={opponentGuesses[0].values} feedback={opponentGuesses[0].feedback} />
                                </div>

                                <div className="mt-8 border-t border-slate-700/50 pt-4">
                                    <div className="text-xs text-slate-500 uppercase text-center mb-2">History</div>
                                    <div className="space-y-2 opacity-60 scale-90 origin-top">
                                        {opponentGuesses.slice(1, 4).map((g, i) => (
                                            <PinDisplay key={i} values={g.values} feedback={g.feedback} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                                <Icon icon="mdi:robot-confused-outline" width="48" />
                                <p>Waiting for move...</p>
                            </div>
                        )}

                    </div>
                </div>

            </main>

            {/* Modals */}
            {roundResult && (
                <RoundResultModal
                    result={roundResult}
                    onNextRound={nextRound}
                    currentRound={currentRound}
                    maxRounds={3}
                />
            )}

            {isGameOver && (
                <GameResultModal
                    playerScore={playerScore}
                    opponentScore={opponentScore}
                    onExit={() => navigate('/')}
                />
            )}

            {/* Waiting Overlay for Multiplayer */}
            {!isRoundActive && !roundResult && !isGameOver && config.mode === 'multiplayer' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="flex flex-col items-center gap-4 p-8 bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl">
                        <Icon icon="mdi:loading" width="48" className="animate-spin text-cyan-400" />
                        <p className="text-lg text-slate-300 font-medium tracking-wide">Waiting for opponent...</p>
                    </div>
                </div>
            )}
        </div>
    );
};
