import { useRef, useEffect, useState } from "react";
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
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.matchMedia("(max-width: 768px)").matches);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        // Reset refs array when length changes
        inputRefs.current = inputRefs.current.slice(0, length);
    }, [length]);

    // Focus management for Desktop
    useEffect(() => {
        if (!isMobile && !disabled) {
            // If value was reset (all empty), focus first input
            const isEmpty = value.every(v => v === "");
            if (isEmpty) {
                inputRefs.current[0]?.focus();
            }
        }
    }, [value, isMobile, disabled]);

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

    return (
        <div className="flex flex-col items-center gap-6">
            <div className="flex justify-center gap-2 sm:gap-4">
                {Array.from({ length }).map((_, idx) => (
                    <input
                        key={idx}
                        ref={el => { inputRefs.current[idx] = el; }}
                        type="text"
                        inputMode={isMobile ? "none" : "numeric"}
                        readOnly={isMobile}
                        maxLength={1}
                        value={value[idx] || ""}
                        onChange={(e) => !isMobile && handleChange(idx, e.target.value)}
                        onKeyDown={(e) => !isMobile && handleKeyDown(idx, e)}
                        disabled={disabled}
                        // Prevent selection on mobile
                        className={`
                            w-12 h-14 sm:w-16 sm:h-20 text-center text-2xl sm:text-4xl font-bold rounded-lg border-2
                            transition-all caret-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed
                            ${isMobile ? "pointer-events-none select-none" : "focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"}
                            ${value[idx] ? "border-cyan-500/50 bg-slate-800 text-white" : "border-slate-600 bg-slate-900 text-slate-400"}
                        `}
                    />
                ))}
            </div>

            {isMobile && (
                <PinPad
                    onDigit={handlePinPadDigit}
                    onBackspace={handlePinPadBackspace}
                    disabled={disabled}
                />
            )}
        </div>
    );
};
