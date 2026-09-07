import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "#0B0F19", // Deep obsidian foundation
          subtle: "#0E1526",  // Elevated canvas
          muted: "#162032",   // Border/separator tone
        },
        surface: {
          DEFAULT: "#111C2D",      // Primary surface (Card, Header, Sidebar)
          secondary: "#16253B",    // Secondary surface (Nested cards, tables)
          elevated: "#1D2E49",     // Elevated / hover surface
          hover: "#223554",        // Active hover tone
          active: "#2A4166",       // Pressed / selected tone
          glass: "rgba(17, 28, 45, 0.88)", // Dark glassmorphism
          glassElevated: "rgba(22, 37, 59, 0.92)",
          border: "#1F2E47",       // Default crisp card border
          borderSubtle: "#18263A", // Subtle divider
          borderActive: "#3B82F6", // Focus / selected border
        },
        slate: {
          950: "#020617",
          900: "#0B0F19",
          850: "#0F172A",
          800: "#1E293B",
          700: "#334155",
          600: "#475569",
          500: "#64748B",
          400: "#94A3B8",
          300: "#CBD5E1",
          200: "#E2E8F0",
          100: "#F1F5F9",
          50: "#F8FAFC",
        },
        brand: {
          DEFAULT: "#3B82F6", // Electric command blue
          hover: "#2563EB",
          active: "#1D4ED8",
          light: "#60A5FA",
          dark: "#1E3A8A",
          tint: "rgba(59, 130, 246, 0.12)",
          border: "rgba(59, 130, 246, 0.35)",
        },
        cyan: {
          DEFAULT: "#06B6D4",
          light: "#22D3EE",
          dark: "#0891B2",
          tint: "rgba(6, 182, 212, 0.12)",
          border: "rgba(6, 182, 212, 0.35)",
        },
        semantic: {
          // Healthy / Nominal (Emerald)
          healthy: "#10B981",
          healthyDark: "#059669",
          healthyLight: "#34D399",
          healthyBg: "rgba(16, 185, 129, 0.12)",
          healthyBorder: "rgba(16, 185, 129, 0.35)",
          healthyText: "#34D399",

          // Warning / Elevated (Amber)
          warning: "#F59E0B",
          warningDark: "#D97706",
          warningLight: "#FBBF24",
          warningBg: "rgba(245, 158, 11, 0.12)",
          warningBorder: "rgba(245, 158, 11, 0.35)",
          warningText: "#FBBF24",

          // Critical / Severe (Crimson)
          critical: "#EF4444",
          criticalDark: "#DC2626",
          criticalLight: "#F87171",
          criticalBg: "rgba(239, 68, 68, 0.15)",
          criticalBorder: "rgba(239, 68, 68, 0.40)",
          criticalText: "#F87171",

          // Info / Operational (Blue)
          info: "#3B82F6",
          infoDark: "#2563EB",
          infoLight: "#60A5FA",
          infoBg: "rgba(59, 130, 246, 0.12)",
          infoBorder: "rgba(59, 130, 246, 0.35)",
          infoText: "#60A5FA",

          // AI / Predictive (Indigo / Violet)
          predictive: "#818CF8",
          predictiveDark: "#6366F1",
          predictiveLight: "#A5B4FC",
          predictiveBg: "rgba(129, 140, 248, 0.12)",
          predictiveBorder: "rgba(129, 140, 248, 0.35)",
          predictiveText: "#A5B4FC",

          // Neutral
          neutral: "#94A3B8",
          neutralDark: "#64748B",
          neutralBg: "rgba(148, 163, 184, 0.10)",
          neutralBorder: "rgba(148, 163, 184, 0.25)",
          neutralText: "#CBD5E1",
        },
        // Backward-compatibility alias for severity
        severity: {
          critical: "#EF4444",
          criticalBg: "rgba(239, 68, 68, 0.15)",
          criticalBorder: "rgba(239, 68, 68, 0.40)",
          criticalText: "#F87171",

          high: "#F59E0B",
          highBg: "rgba(245, 158, 11, 0.12)",
          highBorder: "rgba(245, 158, 11, 0.35)",
          highText: "#FBBF24",

          medium: "#3B82F6",
          mediumBg: "rgba(59, 130, 246, 0.12)",
          mediumBorder: "rgba(59, 130, 246, 0.35)",
          mediumText: "#60A5FA",

          good: "#10B981",
          goodBg: "rgba(16, 185, 129, 0.12)",
          goodBorder: "rgba(16, 185, 129, 0.35)",
          goodText: "#34D399",

          neutral: "#64748B",
          neutralBg: "rgba(100, 116, 139, 0.12)",
          neutralBorder: "rgba(100, 116, 139, 0.25)",
          neutralText: "#94A3B8",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "Consolas", "Liberation Mono", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "0.95rem" }], // 11px
        xs: ["0.8125rem", { lineHeight: "1.15rem" }],    // 13px
        sm: ["0.875rem", { lineHeight: "1.35rem" }],     // 14px
        base: ["0.9375rem", { lineHeight: "1.45rem" }],  // 15px
        lg: ["1.125rem", { lineHeight: "1.6rem" }],      // 18px
        xl: ["1.3125rem", { lineHeight: "1.75rem" }],    // 21px
        "2xl": ["1.625rem", { lineHeight: "2rem" }],     // 26px
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],  // 30px
        "4xl": ["2.25rem", { lineHeight: "2.6rem" }],    // 36px
        kpi: ["2rem", { lineHeight: "1.15", letterSpacing: "-0.025em", fontWeight: "700" }],
        "kpi-lg": ["2.5rem", { lineHeight: "1.1", letterSpacing: "-0.03em", fontWeight: "700" }],
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.35), 0 1px 3px 0 rgba(0, 0, 0, 0.25)",
        card: "0 2px 8px -1px rgba(0, 0, 0, 0.40), 0 1px 3px -1px rgba(0, 0, 0, 0.30)",
        elevated: "0 8px 24px -4px rgba(0, 0, 0, 0.55), 0 2px 6px -1px rgba(0, 0, 0, 0.35)",
        glass: "0 10px 30px -5px rgba(0, 0, 0, 0.60)",
        popover: "0 14px 35px -8px rgba(0, 0, 0, 0.70), 0 4px 12px -2px rgba(0, 0, 0, 0.40)",
        modal: "0 25px 50px -12px rgba(0, 0, 0, 0.85)",
        glowBlue: "0 0 20px -3px rgba(59, 130, 246, 0.35)",
        glowCyan: "0 0 20px -3px rgba(6, 182, 212, 0.35)",
        glowEmerald: "0 0 20px -3px rgba(16, 185, 129, 0.35)",
        glowAmber: "0 0 20px -3px rgba(245, 158, 11, 0.35)",
        glowCritical: "0 0 25px -2px rgba(239, 68, 68, 0.45)",
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;

