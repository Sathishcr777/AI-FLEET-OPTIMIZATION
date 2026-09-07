import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ThemeMode = "dark" | "light";

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const applyThemeToDocument = (theme: ThemeMode) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "light") {
    root.classList.remove("dark");
    root.classList.add("light");
    root.style.colorScheme = "light";
  } else {
    root.classList.remove("light");
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  }
};

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "dark",
      setTheme: (theme) => {
        applyThemeToDocument(theme);
        set({ theme });
      },
      toggleTheme: () => {
        set((state) => {
          const next = state.theme === "dark" ? "light" : "dark";
          applyThemeToDocument(next);
          return { theme: next };
        });
      },
    }),
    {
      name: "fleetiq-theme",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyThemeToDocument(state.theme);
        } else {
          applyThemeToDocument("dark");
        }
      },
    }
  )
);

// Initial application on script evaluation
if (typeof window !== "undefined") {
  try {
    const saved = localStorage.getItem("fleetiq-theme");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.state?.theme === "light") {
        applyThemeToDocument("light");
      } else {
        applyThemeToDocument("dark");
      }
    } else {
      applyThemeToDocument("dark");
    }
  } catch {
    applyThemeToDocument("dark");
  }
}
