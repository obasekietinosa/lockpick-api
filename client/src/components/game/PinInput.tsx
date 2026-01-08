import { useRef, useEffect } from "react";
import { PinPad } from "./PinPad";

interface PinInputProps {
    length: number;
    value: string[];
    onChange: (newValue: string[]) => void;
    onComplete?: (value: string[]) => void;
    disabled?: boolean;
}

export const PinInput = ({ length, value, onChange, onComplete, disabled }: PinInputProps) => {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        // Reset refs array when length changes
        inputRefs.current = inputRefs.current.slice(0, length);
    }, [length]);

    const handleChange = (index: number, val: string) => {
        if (!/^\d*$/.test(val)) return;

        const newValue = [...value];
        newValue[index] = val;
        onChange(newValue);

        // Auto-advance
        if (val && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        // Check completion
        if (newValue.every(v => v !== "") && index === length - 1 && val !== "") {
            onComplete?.(newValue);
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !value[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        if (e.key === "Enter") {
            if (value.every(v => v !== "")) {
                onComplete?.(value);
            }
        }
    };

    // Pin Pad Handlers
    const handlePinPadDigit = (digit: string) => {
        // Find first empty slot
        const firstEmptyIndex = value.findIndex(v => v === "");
        if (firstEmptyIndex !== -1) {
            const newValue = [...value];
            newValue[firstEmptyIndex] = digit;
            onChange(newValue);

            // If we just filled the last slot, trigger complete
            if (firstEmptyIndex === length - 1) {
                onComplete?.(newValue);
            }
        }
    };

    const handlePinPadBackspace = () => {
        // Find last filled slot
        let lastFilledIndex = -1;
        for (let i = length - 1; i >= 0; i--) {
            if (value[i] !== "") {
                lastFilledIndex = i;
                break;
            }
        }

        if (lastFilledIndex !== -1) {
            const newValue = [...value];
            newValue[lastFilledIndex] = "";
            onChange(newValue);
        }
    };

    const boxClasses = `
        w-12 h-14 sm:w-16 sm:h-20 text-center text-2xl sm:text-4xl font-bold rounded-lg border-2
        transition-all caret-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center
    `;

    return (
        <div className="flex flex-col items-center gap-6">

            {/* Mobile Display (Divs) */}
            <div className="flex justify-center gap-2 sm:gap-4 md:hidden">
                {Array.from({ length }).map((_, idx) => (
                    <div
                        key={idx}
                        className={`
                            ${boxClasses}
                            pointer-events-none select-none
                            ${value[idx] ? "border-cyan-500/50 bg-slate-800 text-white" : "border-slate-600 bg-slate-900 text-slate-400"}
                        `}
                    >
                        {value[idx] || ""}
                    </div>
                ))}
            </div>

            {/* Desktop Input */}
            <div className="hidden md:flex justify-center gap-2 sm:gap-4">
                {Array.from({ length }).map((_, idx) => (
                    <input
                        key={idx}
                        ref={el => { inputRefs.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        autoFocus={idx === 0 && !disabled}
                        value={value[idx] || ""}
                        onChange={(e) => handleChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        disabled={disabled}
                        className={`
                            ${boxClasses}
                            focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50
                            ${value[idx] ? "border-cyan-500/50 bg-slate-800 text-white" : "border-slate-600 bg-slate-900 text-slate-400"}
                        `}
                    />
                ))}
            </div>

            {/* Mobile PinPad */}
            <div className="md:hidden">
                <PinPad
                    onDigit={handlePinPadDigit}
                    onBackspace={handlePinPadBackspace}
                    disabled={disabled}
                />
            </div>
        </div>
    );
};
