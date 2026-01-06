import { Icon } from "@iconify/react";


interface GameResultProps {
    playerScore: number;
    opponentScore: number;
    onExit: () => void;
}

export const GameResultModal = ({ playerScore, opponentScore, onExit }: GameResultProps) => {
    const isWin = playerScore > opponentScore;
    const isDraw = playerScore === opponentScore;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl animate-in fade-in duration-500">
            <div className="w-full max-w-md bg-slate-800 border border-slate-600 rounded-2xl p-8 shadow-2xl text-center transform scale-100 animate-in zoom-in-95 duration-500 relative overflow-hidden">

                {/* Background effects */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-20">
                    <div className={`absolute top-[-50%] left-[-50%] w-[200%] h-[200%] animate-spin-slow ${isWin ? 'bg-gradient-to-r from-green-500/30 to-emerald-500/30' : 'bg-gradient-to-r from-red-500/30 to-orange-500/30'}`} />
                </div>

                <div className="mb-6 flex justify-center relative">
                    {isWin ? (
                        <div className="p-6 rounded-full bg-green-500/20 text-green-400 ring-4 ring-green-500/20 shadow-lg shadow-green-500/20 animate-bounce-slow">
                            <Icon icon="mdi:trophy" width="80" />
                        </div>
                    ) : isDraw ? (
                        <div className="p-6 rounded-full bg-yellow-500/20 text-yellow-400 ring-4 ring-yellow-500/20">
                            <Icon icon="mdi:handshake" width="80" />
                        </div>
                    ) : (
                        <div className="p-6 rounded-full bg-red-500/20 text-red-400 ring-4 ring-red-500/20">
                            <Icon icon="mdi:emoticon-cry-outline" width="80" />
                        </div>
                    )}
                </div>

                <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-2 uppercase tracking-wide">
                    {isWin ? "Victory!" : isDraw ? "Draw" : "Defeat"}
                </h1>

                <div className="flex justify-center items-center gap-4 mb-8 text-2xl font-bold text-slate-300">
                    <span className={playerScore > opponentScore ? "text-green-400" : ""}>{playerScore}</span>
                    <span className="text-slate-600">-</span>
                    <span className={opponentScore > playerScore ? "text-red-400" : ""}>{opponentScore}</span>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={onExit}
                        className="w-full py-4 px-6 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all"
                    >
                        Back to Menu
                    </button>
                    {/* Could add Play Again button here later */}
                </div>
            </div>
        </div>
    );
};
