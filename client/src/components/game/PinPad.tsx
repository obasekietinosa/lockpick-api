import { Icon } from "@iconify/react";

interface PinPadProps {
    onDigit: (digit: string) => void;
    onBackspace: () => void;
    disabled?: boolean;
}

export const PinPad = ({ onDigit, onBackspace, disabled }: PinPadProps) => {
    const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

    return (
        <div className="grid grid-cols-3 gap-3 w-full max-w-sm mx-auto mt-6 animate-in slide-in-from-bottom-4 duration-300">
            {digits.map((digit, idx) => {
                if (digit === "") return <div key={idx} />;

                const isBack = digit === "back";

                return (
                    <button
                        key={idx}
                        onClick={(e) => {
                            e.preventDefault();
                            if (isBack) onBackspace();
                            else onDigit(digit);
                        }}
                        disabled={disabled}
                        className={`
                            h-16 flex items-center justify-center rounded-xl font-bold text-3xl transition-all active:scale-90 touch-manipulation select-none
                            ${isBack
                                ? "bg-slate-700/50 text-slate-400 hover:bg-slate-700 active:bg-slate-600"
                                : "bg-slate-700 text-slate-100 hover:bg-slate-600 active:bg-cyan-600 border-b-4 border-slate-900 active:border-b-0 active:translate-y-1 shadow-lg"
                            }
                            disabled:opacity-50 disabled:pointer-events-none
                        `}
                    >
                        {isBack ? <Icon icon="mdi:backspace-outline" width="32" /> : digit}
                    </button>
                );
            })}
        </div>
    );
};
