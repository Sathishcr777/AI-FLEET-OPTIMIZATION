import React from "react";
import { Badge, BadgeProps } from "./Badge";

export interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: "sm" | "md";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className, size = "md" }) => {
  const norm = (status || "").toUpperCase();

  let variant: BadgeProps["variant"] = "neutral";
  let label = status;

  switch (norm) {
    case "ACTIVE":
    case "GOOD":
    case "IN_PROGRESS":
      variant = "success";
      break;
    case "WARNING":
    case "IDLE":
    case "MAINTENANCE":
    case "ON_LEAVE":
      variant = "warning";
      break;
    case "CRITICAL":
    case "SUSPENDED":
    case "FAILED":
      variant = "critical";
      break;
    case "COMPLETED":
    case "RESOLVED":
      variant = "brand";
      break;
    case "ACKNOWLEDGED":
      variant = "warning";
      break;
    case "INACTIVE":
    case "DECOMMISSIONED":
    default:
      variant = "neutral";
      break;
  }

  return (
    <Badge variant={variant} size={size} dot className={className}>
      {label}
    </Badge>
  );
};
