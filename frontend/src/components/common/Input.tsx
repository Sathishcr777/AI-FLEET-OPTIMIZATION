import React, { forwardRef } from "react";
import { clsx } from "clsx";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  sizeVariant?: "sm" | "md" | "lg";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      sizeVariant = "md",
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    const sizeStyles = {
      sm: "h-9 text-xs py-1.5",
      md: "h-10 text-sm py-2",
      lg: "h-12 text-base py-3",
    };

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-sans select-none"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={clsx(
              "w-full rounded-xl bg-[#16253B] border text-white placeholder:text-slate-500 transition-all font-sans outline-none disabled:bg-[#0E1624] disabled:text-slate-500 disabled:cursor-not-allowed shadow-subtle",
              sizeStyles[sizeVariant],
              leftIcon ? "pl-10" : "pl-3.5",
              rightIcon ? "pr-10" : "pr-3.5",
              error
                ? "border-rose-500 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/30"
                : "border-[#2A3F5F] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30",
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 text-slate-400 flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>

        {error ? (
          <p className="text-xs text-rose-400 font-sans font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-slate-400 font-sans">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";

