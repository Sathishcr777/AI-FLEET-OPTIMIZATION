/**
 * FleetIQ Chart Visual Language & Semantic Design Tokens
 * Industrial Dark Command Operations theme for Recharts.
 */

export const CHART_COLORS = {
  // Primary Telemetry series
  telemetry: "#3B82F6",       // Electric Blue
  telemetrySky: "#06B6D4",    // Bright Cyan
  telemetryIndigo: "#818CF8", // Indigo / AI
  telemetryViolet: "#A855F7", // Purple / Diagnostics
  telemetryAmber: "#F59E0B",  // Amber

  // Semantic Status
  healthy: "#10B981",         // Emerald
  healthyLight: "#34D399",
  warning: "#F59E0B",         // Amber
  warningLight: "#FBBF24",
  critical: "#EF4444",        // Crimson
  criticalLight: "#F87171",
  info: "#3B82F6",           // Command Blue
  predictive: "#818CF8",      // Predictive Indigo
  neutral: "#94A3B8",         // Cool Slate

  // Structural Chrome
  grid: "#1F2E47",            // Dark Gridline
  gridDarker: "#16253B",      // Deep Sub-grid
  axisBorder: "#1F2E47",      // Axis Line
  axisText: "#94A3B8",        // Readable Axis Label
  cursor: "#3B82F6",          // Active Scanner Cursor
} as const;

/**
 * Common Recharts CartesianGrid props
 */
export const commonCartesianGrid = {
  strokeDasharray: "3 3",
  stroke: CHART_COLORS.grid,
  vertical: false,
};

/**
 * Standard X-Axis configuration with JetBrains Mono font
 */
export const commonXAxis = {
  stroke: CHART_COLORS.axisBorder,
  tick: {
    fill: CHART_COLORS.axisText,
    fontSize: 12,
    fontWeight: 500,
    fontFamily: "JetBrains Mono, SF Mono, monospace",
  },
  tickLine: { stroke: CHART_COLORS.axisBorder },
  axisLine: { stroke: CHART_COLORS.axisBorder },
};

/**
 * Standard Y-Axis configuration with tabular numbers
 */
export const commonYAxis = {
  stroke: CHART_COLORS.axisBorder,
  tick: {
    fill: CHART_COLORS.axisText,
    fontSize: 12,
    fontWeight: 500,
    fontFamily: "JetBrains Mono, SF Mono, monospace",
  },
  tickLine: false,
  axisLine: false,
};

/**
 * Standard Tooltip cursor overlay configuration
 */
export const commonTooltipCursor = {
  stroke: CHART_COLORS.cursor,
  strokeWidth: 1.5,
  strokeDasharray: "3 3",
};

