import { useNavigate } from "react-router";
import { Icon } from "@iconify/react";

export const MultiplayerMenu = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-slate-900">
            {/* Background decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-10 right-10 text-cyan-500/10 animate-bounce delay-200">
                    <Icon icon="mdi:account-group-outline" width="120" />
                </div>
                <div className="absolute bottom-10 left-10 text-purple-500/10 animate-pulse delay-500">
                    <Icon icon="mdi:earth" width="150" />
                </div>
            </div>

            <div className="max-w-md w-full space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="text-center">
                    <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 drop-shadow-sm pb-2">
                        Multiplayer
                    </h1>
                    <p className="text-gray-400 mt-2 text-lg">Choose your path</p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={() => navigate("/config", { state: { mode: "multiplayer" } })}
                        className="group w-full relative overflow-hidden p-6 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 transition-all transform hover:scale-[1.02] shadow-xl shadow-cyan-900/20"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col items-start">
                                <span className="text-2xl font-bold text-white">Start New Game</span>
                                <span className="text-cyan-100 text-sm">Host a room and invite friends</span>
                            </div>
                            <Icon icon="mdi:plus-circle-outline" className="text-white opacity-80 group-hover:opacity-100 transition-opacity" width="40" />
                        </div>
                    </button>

                    <button
                        onClick={() => navigate("/join")}
                        className="group w-full relative overflow-hidden p-6 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all transform hover:scale-[1.02] shadow-xl shadow-purple-900/20"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col items-start">
                                <span className="text-2xl font-bold text-white">Join Existing</span>
                                <span className="text-purple-100 text-sm">Enter a code or link</span>
                            </div>
                            <Icon icon="mdi:login-variant" className="text-white opacity-80 group-hover:opacity-100 transition-opacity" width="40" />
                        </div>
                    </button>
                </div>

                <button
                    onClick={() => navigate(-1)}
                    className="w-full flex items-center justify-center space-x-2 text-slate-400 hover:text-white transition-colors py-2"
                >
                    <Icon icon="mdi:arrow-left" width="20" />
                    <span>Back to Menu</span>
                </button>
            </div>
        </div>
    );
};
