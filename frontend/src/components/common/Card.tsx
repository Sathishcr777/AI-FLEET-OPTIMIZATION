import React, { forwardRef } from "react";
import { clsx } from "clsx";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "subtle" | "glass" | "outline" | "criticalGlow" | "brandGlow";
  header?: React.ReactNode;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  bodyClassName?: string;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = "default",
      header,
      headerAction,
      footer,
      bodyClassName,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = "rounded-2xl transition-all duration-150 relative text-slate-100";

    const variantStyles = {
      default: "bg-[#111C2D] border border-[#1F2E47] shadow-card",
      elevated: "bg-[#16253B] border border-[#2A3F5F] shadow-elevated",
      subtle: "bg-[#0E1624] border border-[#18263A] shadow-subtle",
      glass: "bg-[#111C2D]/90 backdrop-blur-md border border-[#1F2E47] shadow-glass",
      outline: "bg-transparent border border-[#1F2E47] shadow-none",
      criticalGlow: "bg-rose-950/20 border border-rose-500/40 shadow-glowCritical",
      brandGlow: "bg-blue-950/20 border border-blue-500/40 shadow-glowBlue",
    };

    const hasSlotHeader = header || headerAction;

    return (
      <div ref={ref} className={clsx(baseStyles, variantStyles[variant], className)} {...props}>
        {hasSlotHeader && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1F2E47]">
            {header && (
              <div className="text-base sm:text-lg font-bold text-white tracking-tight font-sans">
                {header}
              </div>
            )}
            {headerAction && <div className="flex items-center gap-2">{headerAction}</div>}
          </div>
        )}

        <div className={clsx(hasSlotHeader || footer ? "p-5 sm:p-6" : "", bodyClassName)}>
          {children}
        </div>

        {footer && (
          <div className="px-5 py-3.5 border-t border-[#1F2E47] bg-[#0D1624] text-xs sm:text-sm text-slate-400 rounded-b-2xl flex items-center justify-between font-sans">
            {footer}
          </div>
        )}
      </div>
    );
  }
);

Card.displayName = "Card";

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  action?: React.ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, action, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        "flex items-center justify-between px-5 py-4 border-b border-[#1F2E47]",
        className
      )}
      {...props}
    >
      <div className="space-y-0.5">{children}</div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  )
);
CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={clsx("text-base sm:text-lg font-bold text-white tracking-tight font-sans", className)}
      {...props}
    >
      {children}
    </h3>
  )
);
CardTitle.displayName = "CardTitle";

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => (
  <p ref={ref} className={clsx("text-xs sm:text-sm text-slate-400 font-sans", className)} {...props}>
    {children}
  </p>
));
CardDescription.displayName = "CardDescription";

export const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={clsx("p-5 sm:p-6", className)} {...props}>
      {children}
    </div>
  )
);
CardContent.displayName = "CardContent";

export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        "px-5 py-3.5 border-t border-[#1F2E47] bg-[#0D1624] text-xs sm:text-sm text-slate-400 rounded-b-2xl flex items-center justify-between font-sans",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
CardFooter.displayName = "CardFooter";



