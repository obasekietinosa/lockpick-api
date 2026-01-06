import { Icon } from "@iconify/react";
import type { RoundResult as RoundResultType } from "../../hooks/useGameLogic";

interface RoundResultProps {
    result: RoundResultType;
    onNextRound: () => void;
    currentRound: number;
    maxRounds: number;
}

export const RoundResultModal = ({ result, onNextRound, currentRound, maxRounds }: RoundResultProps) => {
    const isWin = result.winner === 'player';
    const isDraw = result.winner === 'draw';

    // Check if this was the last round
    const isLastRound = currentRound >= maxRounds;
    const buttonText = isLastRound ? "See Game Result" : "Next Round";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-sm bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl text-center transform scale-100 animate-in zoom-in-95 duration-300">

                <div className="mb-4 flex justify-center">
                    {isWin ? (
                        <div className="p-4 rounded-full bg-green-500/20 text-green-400">
                            <Icon icon="mdi:trophy-outline" width="60" />
                        </div>
                    ) : isDraw ? (
                        <div className="p-4 rounded-full bg-yellow-500/20 text-yellow-400">
                            <Icon icon="mdi:handshake-outline" width="60" />
                        </div>
                    ) : (
                        <div className="p-4 rounded-full bg-red-500/20 text-red-400">
                            <Icon icon="mdi:emoticon-sad-outline" width="60" />
                        </div>
                    )}
                </div>

                <h2 className="text-3xl font-bold text-white mb-2">
                    {isWin ? "Round Won!" : isDraw ? "Round Draw" : "Round Lost"}
                </h2>

                <p className="text-slate-400 mb-8">
                    {result.reason === 'guessed' && isWin && "You guessed the pin!"}
                    {result.reason === 'guessed' && !isWin && "Opponent guessed your pin!"}
                    {result.reason === 'timeout' && "Time ran out!"}
                </p>

                <button
                    onClick={onNextRound}
                    className="w-full py-3 px-6 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                    {buttonText}
                </button>
            </div>
        </div>
    );
};
