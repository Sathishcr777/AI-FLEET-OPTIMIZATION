import React from "react";
import { Badge, BadgeProps } from "./Badge";
import { AlertSeverity } from "../../types/alerts";

export interface SeverityBadgeProps {
  severity: AlertSeverity | string;
  className?: string;
  size?: "sm" | "md";
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, className, size = "md" }) => {
  const norm = (severity || "").toUpperCase();

  let variant: BadgeProps["variant"] = "neutral";

  switch (norm) {
    case "CRITICAL":
      variant = "critical";
      break;
    case "HIGH":
      variant = "danger";
      break;
    case "WARNING":
      variant = "warning";
      break;
    case "MEDIUM":
    case "INFO":
      variant = "brand";
      break;
    case "LOW":
      variant = "success";
      break;
    default:
      variant = "neutral";
      break;
  }

  return (
    <Badge variant={variant} size={size} dot className={className}>
      {norm}
    </Badge>
  );
};
