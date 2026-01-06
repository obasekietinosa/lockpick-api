import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
    size?: "sm" | "md" | "lg" | "xl";
    className?: string;
    isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = "primary",
    size = "md",
    className = "",
    isLoading = false,
    ...props
}) => {
    const baseStyles =
        "font-bold rounded-2xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[4px]";

    const variants = {
        primary: "bg-primary text-white hover:bg-primary-hover shadow-violet-900/40",
        secondary: "bg-secondary text-white hover:brightness-110 shadow-pink-900/40",
        outline: "bg-transparent border-2 border-primary text-primary hover:bg-violet-50 shadow-violet-900/10",
        danger: "bg-red-500 text-white hover:bg-red-600 shadow-red-900/40",
        ghost: "bg-transparent text-gray-600 hover:bg-gray-100 shadow-none active:translate-y-0 active:scale-100",
    };

    const sizes = {
        sm: "px-3 py-1 text-sm",
        md: "px-6 py-2 text-base",
        lg: "px-8 py-3 text-lg",
        xl: "px-10 py-4 text-xl",
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading ? (
                <span className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
            ) : null}
            {children}
        </button>
    );
};
