import React, { forwardRef } from "react";
import { clsx } from "clsx";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "tertiary"
    | "ghost"
    | "danger"
    | "warning"
    | "success"
    | "icon"
    | "critical";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      leftIcon,
      rightIcon,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0B0F19] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer font-sans select-none";

    const sizeStyles = {
      sm: variant === "icon" ? "h-9 w-9 p-0" : "h-9 text-xs sm:text-sm px-3.5 gap-2 font-semibold",
      md: variant === "icon" ? "h-10 w-10 p-0" : "h-10 text-sm px-4 gap-2 font-semibold",
      lg: variant === "icon" ? "h-12 w-12 p-0" : "h-12 text-base px-6 gap-2.5 font-bold",
    };

    const variantStyles = {
      primary:
        "bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-subtle hover:shadow-glowBlue border border-blue-500",
      secondary:
        "bg-[#16253B] hover:bg-[#1E3352] active:bg-[#253E63] text-slate-200 hover:text-white border border-[#2A3F5F] shadow-subtle",
      tertiary:
        "bg-transparent hover:bg-[#16253B] active:bg-[#1E3352] text-slate-300 hover:text-white border border-transparent",
      ghost:
        "bg-transparent hover:bg-[#16253B] active:bg-[#1E3352] text-slate-300 hover:text-white border border-transparent",
      danger:
        "bg-rose-900/40 hover:bg-rose-900/60 active:bg-rose-800 text-rose-300 hover:text-white border border-rose-700/50 shadow-subtle",
      warning:
        "bg-amber-900/40 hover:bg-amber-900/60 active:bg-amber-800 text-amber-300 hover:text-white border border-amber-700/50 shadow-subtle",
      success:
        "bg-emerald-900/40 hover:bg-emerald-900/60 active:bg-emerald-800 text-emerald-300 hover:text-white border border-emerald-700/50 shadow-subtle",
      icon:
        "bg-[#16253B] hover:bg-[#1E3352] active:bg-[#253E63] text-slate-300 hover:text-white border border-[#2A3F5F] shadow-subtle",
      critical:
        "bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold border border-rose-500 shadow-glowCritical",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(
          baseStyles,
          sizeStyles[size],
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";


