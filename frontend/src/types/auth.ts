export type UserRole = "ADMIN" | "OPERATOR" | "MANAGER" | "DRIVER";

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  email?: string;
  avatarUrl?: string;
  lastLoginAt?: string;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  adminId: string;
  password?: string;
}
