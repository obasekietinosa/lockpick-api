import type { GuessFeedback } from "../../hooks/useGameLogic";

interface PinDisplayProps {
    values: string[];
    feedback?: GuessFeedback[];
}

export const PinDisplay = ({ values, feedback }: PinDisplayProps) => {
    const getFeedbackColor = (status?: GuessFeedback) => {
        switch (status) {
            case 'correct': return 'bg-green-500 border-green-400 text-white';
            case 'present': return 'bg-orange-500 border-orange-400 text-white';
            case 'absent': return 'bg-slate-700 border-slate-600 text-slate-400';
            default: return 'bg-slate-800 border-slate-700 text-slate-500';
        }
    };

    return (
        <div className="flex justify-center gap-2">
            {values.map((digit, idx) => (
                <div
                    key={idx}
                    className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-xl sm:text-2xl font-bold rounded-lg border-2 ${getFeedbackColor(feedback?.[idx])}`}
                >
                    {digit}
                </div>
            ))}
        </div>
    );
};
