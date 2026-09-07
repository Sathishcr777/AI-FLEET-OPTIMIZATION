import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./Button";
import { Badge } from "./Badge";
import { clsx } from "clsx";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  affectsLiveData?: boolean;
  onRetry?: () => void;
  variant?: "card" | "banner";
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Service Query Encountered an Issue",
  message = "An operational or network error occurred while retrieving information.",
  affectsLiveData = false,
  onRetry,
  variant = "card",
  className,
}) => {
  if (variant === "banner") {
    return (
      <div
        className={clsx(
          "flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-rose-500/40 bg-rose-950/40 text-rose-300 font-sans shadow-sm",
          className
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <div className="text-xs sm:text-sm">
            <span className="font-bold text-white">{title}: </span>
            <span className="text-rose-300">{message}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {affectsLiveData && (
            <Badge variant="critical" size="sm" dot>
              LIVE STREAM
            </Badge>
          )}
          {onRetry && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onRetry}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              className="text-xs h-8 px-2.5"
            >
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center p-8 sm:p-10 text-center rounded-2xl border border-rose-500/40 bg-rose-950/20 shadow-glowCritical select-none font-sans",
        className
      )}
    >
      <div className="p-3.5 rounded-2xl bg-rose-900/60 text-rose-300 mb-3.5 border border-rose-500 shadow-glowCritical">
        <AlertTriangle className="w-6 h-6" />
      </div>

      <div className="flex items-center gap-2 mb-1.5">
        <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">{title}</h3>
        {affectsLiveData && (
          <Badge variant="critical" size="sm" dot>
            LIVE IMPACT
          </Badge>
        )}
      </div>

      <p className="text-xs sm:text-sm text-rose-300/90 max-w-md leading-relaxed">{message}</p>

      {onRetry && (
        <div className="mt-5">
          <Button
            size="md"
            variant="secondary"
            onClick={onRetry}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Retry Request
          </Button>
        </div>
      )}
    </div>
  );
};


