import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Icon } from "@iconify/react";
import { Button } from "../components/ui/Button";
import { RulesModal } from "../components/game/RulesModal";

export const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [isRulesOpen, setIsRulesOpen] = useState(false);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-10 left-10 text-primary/10 animate-bounce delay-700">
                    <Icon icon="mdi:lock-open-variant-outline" width="120" />
                </div>
                <div className="absolute bottom-20 right-20 text-secondary/10 animate-bounce delay-1000">
                    <Icon icon="mdi:lock-outline" width="150" />
                </div>
                <div className="absolute top-1/3 right-1/4 text-accent/10 animate-pulse">
                    <Icon icon="mdi:key-outline" width="80" />
                </div>
            </div>

            <div className="max-w-md w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                {/* Hero */}
                <div className="space-y-2">
                    <div className="inline-block p-4 rounded-full bg-white shadow-xl mb-4 transform rotate-[-5deg] hover:rotate-[5deg] transition-transform duration-300">
                        <Icon icon="mdi:lock-open-check-outline" className="text-primary w-16 h-16" />
                    </div>
                    <h1 className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent drop-shadow-sm pb-2">
                        Lockpick
                    </h1>
                    <p className="text-xl text-gray-500 font-medium">
                        Crack the code. Beat the clock.
                    </p>
                </div>

                {/* Actions */}
                <div className="grid gap-4 w-full">
                    <Button
                        variant="primary"
                        size="xl"
                        className="w-full text-2xl"
                        onClick={() => navigate("/config", { state: { mode: "single" } })}
                    >
                        <Icon icon="mdi:account" width="28" />
                        Single Player
                    </Button>

                    <Button
                        variant="secondary"
                        size="xl"
                        className="w-full text-2xl"
                        onClick={() => navigate("/multiplayer")}
                    >
                        <Icon icon="mdi:account-group" width="28" />
                        Multiplayer
                    </Button>

                    <Button
                        variant="outline"
                        size="lg"
                        className="w-full mt-4"
                        onClick={() => setIsRulesOpen(true)}
                    >
                        <Icon icon="mdi:book-open-page-variant" width="24" />
                        How to Play
                    </Button>
                </div>
            </div>

            <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

            <footer className="absolute bottom-4 text-gray-400 text-sm font-display tracking-wider">
                © {new Date().getFullYear()} Lockpick Game
            </footer>
        </div>
    );
};
