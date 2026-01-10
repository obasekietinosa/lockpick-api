import { useRef, useEffect, useState } from "react";
import { useIsMobile } from "../../hooks/useIsMobile";
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
    const isMobile = useIsMobile();
    const [activeIndex, setActiveIndex] = useState(0);

    // Force remount or reset when round changes if needed, but managing state is better
    // Reset active index when value is cleared externally (e.g. new round)
    // We detect if value becomes all empty, then reset index.
    useEffect(() => {
        if (value.every(v => v === "")) {
            setActiveIndex(0);
        }
    }, [value]);

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

    // Mobile handlers
    const handleDigitPress = (digit: string) => {
        const newValue = [...value];
        newValue[activeIndex] = digit;
        onChange(newValue);

        if (activeIndex < length - 1) {
            setActiveIndex(activeIndex + 1);
        }
    };

    const handleBackspace = () => {
        const newValue = [...value];
        // If current is filled, clear it.
        // If current is empty, move back and clear that.

        if (newValue[activeIndex]) {
            newValue[activeIndex] = "";
            onChange(newValue);
        } else if (activeIndex > 0) {
            newValue[activeIndex - 1] = "";
            onChange(newValue);
            setActiveIndex(activeIndex - 1);
        }
    };

    const handleEnter = () => {
        if (value.every(v => v !== "")) {
            onComplete?.(value);
        }
    };

    if (isMobile) {
        return (
            <div className="flex flex-col items-center w-full">
                <div className="flex justify-center gap-2 sm:gap-4">
                    {Array.from({ length }).map((_, idx) => (
                         <div
                            key={idx}
                            onClick={() => !disabled && setActiveIndex(idx)}
                            className={`
                                w-12 h-14 sm:w-16 sm:h-20
                                flex items-center justify-center
                                text-2xl sm:text-4xl font-bold
                                bg-slate-900 border-2 rounded-lg
                                text-white transition-all
                                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                                ${activeIndex === idx ? "border-cyan-400 ring-2 ring-cyan-400/50" : "border-slate-600"}
                            `}
                        >
                            {value[idx] || ""}
                        </div>
                    ))}
                </div>
                <PinPad
                    onDigitPress={handleDigitPress}
                    onBackspace={handleBackspace}
                    onEnter={handleEnter}
                    disabled={disabled}
                />
            </div>
        );
    }

    return (
        <div className="flex justify-center gap-2 sm:gap-4">
            {Array.from({ length }).map((_, idx) => (
                <input
                    key={idx}
                    ref={el => { inputRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={value[idx] || ""}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    disabled={disabled}
                    className="w-12 h-14 sm:w-16 sm:h-20 text-center text-2xl sm:text-4xl font-bold bg-slate-900 border-2 border-slate-600 rounded-lg focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 text-white transition-all caret-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
            ))}
        </div>
    );
};
