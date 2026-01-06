import { Icon } from "@iconify/react";

interface ScoreBoardProps {
    playerScore: number;
    opponentScore: number;
    currentRound: number;
    maxRounds: number;
    playerName: string;
    opponentName?: string;
}

export const ScoreBoard = ({ playerScore, opponentScore, currentRound, maxRounds, playerName, opponentName = "Opponent" }: ScoreBoardProps) => {



    return (
        <div className="flex justify-between items-center bg-slate-800/80 rounded-xl p-4 border border-slate-700 w-full max-w-md mx-auto">
            {/* Player Side */}
            <div className="flex flex-col items-start">
                <span className="text-cyan-400 font-bold truncate max-w-[100px] sm:max-w-[150px]">{playerName}</span>
                <div className="flex gap-1 mt-1">
                    {Array.from({ length: playerScore }).map((_, i) => (
                        <Icon key={i} icon="mdi:lock-open-variant" className="text-yellow-400" width="20" />
                    ))}
                    {Array.from({ length: Math.max(0, 2 - playerScore) }).map((_, i) => (
                        <Icon key={i} icon="mdi:lock" className="text-slate-600" width="20" />
                    ))}
                    {/* Assuming best of 3, you need 2 wins. So show 2 slots? */}
                </div>
            </div>

            {/* Center Info */}
            <div className="flex flex-col items-center">
                <span className="text-xs text-slate-400 uppercase tracking-widest">Round</span>
                <span className="text-2xl font-bold text-white">{currentRound} <span className="text-slate-600 text-lg">/ {maxRounds}</span></span>
            </div>

            {/* Opponent Side */}
            <div className="flex flex-col items-end">
                <span className="text-purple-400 font-bold truncate max-w-[100px] sm:max-w-[150px]">{opponentName}</span>
                <div className="flex gap-1 mt-1 justify-end">
                    {Array.from({ length: opponentScore }).map((_, i) => (
                        <Icon key={i} icon="mdi:lock-open-variant" className="text-yellow-400" width="20" />
                    ))}
                    {Array.from({ length: Math.max(0, 2 - opponentScore) }).map((_, i) => (
                        <Icon key={i} icon="mdi:lock" className="text-slate-600" width="20" />
                    ))}
                </div>
            </div>
        </div>
    );
};
