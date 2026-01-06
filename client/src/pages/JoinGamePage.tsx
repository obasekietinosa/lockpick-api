import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Icon } from "@iconify/react";
import { api } from "../services/api";

export const JoinGamePage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [name, setName] = useState("");
    const [gameId, setGameId] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Auto-fill from URL
    useEffect(() => {
        const roomFromUrl = searchParams.get("room");
        if (roomFromUrl) {
            setGameId(roomFromUrl);
        }
    }, [searchParams]);

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();

        setIsLoading(true);
        try {
            console.log("Joining game:", { name, gameId });
            // Clean up game ID in case they pasted a full URL
            let cleanGameId = gameId.trim();
            if (cleanGameId.includes('?room=')) {
                cleanGameId = cleanGameId.split('?room=')[1];
            }
            // Basic UUID check or length check? Nah, let API handle it.

            const response = await api.joinGame({
                player_name: name,
                room_id: cleanGameId
            });
            console.log("Game joined:", response);
            // Navigate to game/lobby with the response data (config etc)
            navigate("/select-pin", { state: { ...response, mode: "multiplayer" } });
        } catch (error) {
            console.error("Failed to join game:", error);
            // TODO: Better error handling
            alert("Failed to join game. Please check the Game ID and try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-slate-900">
            {/* Background decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-1/4 left-10 text-purple-500/10 animate-pulse">
                    <Icon icon="mdi:controller-classic-outline" width="100" />
                </div>
                <div className="absolute bottom-1/4 right-10 text-pink-500/10 animate-bounce delay-500">
                    <Icon icon="mdi:login-variant" width="120" />
                </div>
            </div>

            <div className="max-w-md w-full space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 drop-shadow-sm pb-2">
                        Join Game
                    </h1>
                    <p className="text-gray-400 mt-2">Enter the arena</p>
                </div>

                <form onSubmit={handleJoin} className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-slate-700 space-y-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-300">Player Name</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                                <Icon icon="mdi:account" width="20" />
                            </span>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none text-white transition-all placeholder:text-slate-600"
                                placeholder="Enter your name"
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-300">Game Link or ID</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                                <Icon icon="mdi:link-variant" width="20" />
                            </span>
                            <input
                                type="text"
                                value={gameId}
                                onChange={(e) => setGameId(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none text-white transition-all placeholder:text-slate-600"
                                placeholder="Paste game link or ID"
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-4">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            disabled={isLoading}
                            className="flex-1 px-6 py-3 rounded-xl border border-slate-600 text-slate-300 font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
                        >
                            Back
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-[2] bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-purple-500/20 transform transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {isLoading ? (
                                <Icon icon="eos-icons:loading" width="24" className="animate-spin" />
                            ) : (
                                "Join Game"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
