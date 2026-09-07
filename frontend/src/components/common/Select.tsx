import React, { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { clsx } from "clsx";

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
  sizeVariant?: "sm" | "md" | "lg";
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      options,
      sizeVariant = "md",
      disabled,
      children,
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    const sizeStyles = {
      sm: "h-9 text-xs py-1.5 pl-3 pr-8",
      md: "h-10 text-sm py-2 pl-3.5 pr-9",
      lg: "h-12 text-base py-3 pl-4 pr-10",
    };

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-sans select-none"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            className={clsx(
              "w-full appearance-none rounded-xl bg-[#16253B] border text-white transition-all font-sans outline-none disabled:bg-[#0E1624] disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer shadow-subtle",
              sizeStyles[sizeVariant],
              error
                ? "border-rose-500 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/30"
                : "border-[#2A3F5F] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30",
              className
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={String(opt.value)} value={opt.value} disabled={opt.disabled} className="bg-[#111C2D] text-white">
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div className="absolute right-3 pointer-events-none text-slate-400">
            <ChevronDown className="w-4 h-4" />
          </div>
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

Select.displayName = "Select";

