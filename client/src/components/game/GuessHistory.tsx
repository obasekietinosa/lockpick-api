import type { Guess } from "../../hooks/useGameLogic";
import { PinDisplay } from "./PinDisplay";

interface GuessHistoryProps {
    guesses: Guess[];
}

export const GuessHistory = ({ guesses }: GuessHistoryProps) => {
    // Show recent guesses at the top? Or bottom?
    // Usually game logs flow downwards, but if space is limited and input is fixed, maybe newest at bottom.
    // Let's stick to newest at bottom for now, or reversed if we want newest at top.
    // The mockup seems to show a list.

    return (
        <div className="flex flex-col gap-3 w-full max-w-md mx-auto max-h-[400px] overflow-y-auto p-4 custom-scrollbar">
            {guesses.map((guess, idx) => (
                <div key={guess.timestamp || idx} className="animate-in slide-in-from-top-4 duration-500">
                    <PinDisplay values={guess.values} feedback={guess.feedback} />
                </div>
            ))}
            {guesses.length === 0 && (
                <div className="text-center text-slate-500 italic py-8">
                    Make your first guess...
                </div>
            )}
        </div>
    );
};
