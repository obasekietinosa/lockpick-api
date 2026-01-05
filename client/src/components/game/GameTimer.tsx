import { Icon } from "@iconify/react";

interface GameTimerProps {
    timeLeft: number;
    totalTime: number;
}

export const GameTimer = ({ timeLeft, totalTime }: GameTimerProps) => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Critical state (last 10 seconds)
    const isCritical = timeLeft <= 10;
    const percentage = Math.max(0, (timeLeft / totalTime) * 100);

    return (
        <div className="flex flex-col items-center">
            <div className={`text-2xl font-mono font-bold flex items-center gap-2 ${isCritical ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}>
                <Icon icon="mdi:timer-outline" />
                {formattedTime}
            </div>
            {/* Progress bar */}
            <div className="w-full h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                <div
                    className={`h-full transition-all duration-1000 ease-linear ${isCritical ? 'bg-red-500' : 'bg-cyan-500'}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};
