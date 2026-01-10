import { Button } from "../ui/Button";

interface PinPadProps {
    onDigitPress: (digit: string) => void;
    onBackspace: () => void;
    onEnter: () => void;
    disabled?: boolean;
}

export const PinPad = ({ onDigitPress, onBackspace, onEnter, disabled }: PinPadProps) => {
    const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    return (
        <div className="flex flex-col gap-3 w-full max-w-[320px] mx-auto mt-6 pb-4">
            <div className="grid grid-cols-3 gap-3">
                {digits.map((digit) => (
                    <Button
                        key={digit}
                        variant="secondary"
                        className="h-16 text-3xl touch-manipulation"
                        onClick={() => onDigitPress(digit.toString())}
                        disabled={disabled}
                    >
                        {digit}
                    </Button>
                ))}
                <Button
                     variant="danger"
                     className="h-16 text-2xl touch-manipulation"
                     onClick={onBackspace}
                     disabled={disabled}
                >
                    ⌫
                </Button>
                <Button
                    variant="secondary"
                    className="h-16 text-3xl touch-manipulation"
                    onClick={() => onDigitPress("0")}
                    disabled={disabled}
                >
                    0
                </Button>
                <Button
                     variant="primary"
                     className="h-16 text-2xl touch-manipulation"
                     onClick={onEnter}
                     disabled={disabled}
                >
                    ↵
                </Button>
            </div>
        </div>
    );
};
