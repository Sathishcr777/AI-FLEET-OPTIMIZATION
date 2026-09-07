import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { AuthUser, AuthState } from "../types/auth";

export const DEMO_ADMIN_CREDENTIALS = {
  adminId: "admin",
  password: "fleetiq-demo",
} as const;

export const DEMO_ADMIN_USER: AuthUser = {
  id: "admin-01",
  username: "admin",
  name: "Fleet Administrator",
  role: "ADMIN",
  email: "admin@fleetiq.io",
  lastLoginAt: new Date().toISOString(),
};

interface AuthStoreState extends AuthState {
  login: (adminId: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginAsDemoAdmin: () => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (adminId: string, password?: string) => {
        set({ isLoading: true, error: null });

        // Simulate a brief authentication network delay for realistic feedback
        await new Promise((resolve) => setTimeout(resolve, 350));

        const normalizedId = adminId.trim().toLowerCase();
        const enteredPassword = password ?? "";

        // Check against demo administrator credentials
        if (
          normalizedId === DEMO_ADMIN_CREDENTIALS.adminId &&
          enteredPassword === DEMO_ADMIN_CREDENTIALS.password
        ) {
          const authenticatedUser: AuthUser = {
            ...DEMO_ADMIN_USER,
            lastLoginAt: new Date().toISOString(),
          };

          set({
            user: authenticatedUser,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          return { success: true };
        }

        const errorMessage =
          normalizedId !== DEMO_ADMIN_CREDENTIALS.adminId
            ? `Admin ID "${adminId}" was not recognized. Please use demo ID "admin".`
            : "Invalid administrator credentials. Please check your password or use Demo Admin Access.";

        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: errorMessage,
        });

        return { success: false, error: errorMessage };
      },

      loginAsDemoAdmin: async () => {
        set({ isLoading: true, error: null });
        await new Promise((resolve) => setTimeout(resolve, 200));

        const demoUser: AuthUser = {
          ...DEMO_ADMIN_USER,
          lastLoginAt: new Date().toISOString(),
        };

        set({
          user: demoUser,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      },

      logout: () => {
        try {
          localStorage.removeItem("fleetiq_auth_session");
        } catch {
          // Ignore if localStorage is unavailable
        }
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "fleetiq_auth_session",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
