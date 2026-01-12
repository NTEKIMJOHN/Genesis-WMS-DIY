import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User, LoginCredentials } from '../types';
import authService, { RegisterInput } from '../services/auth.service';

// ==========================================
// AUTH STORE
// ==========================================

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  clearError: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        // Initialize auth state from localStorage
        initialize: () => {
          const storedUser = authService.getStoredUser();
          const isAuthenticated = authService.isAuthenticated();

          if (storedUser && isAuthenticated) {
            set({
              user: storedUser,
              isAuthenticated: true,
            });

            // Fetch fresh profile data
            get().fetchProfile().catch(() => {
              // If profile fetch fails, user is likely logged out
              get().logout();
            });
          }
        },

        // Login
        login: async (credentials: LoginCredentials) => {
          set({ isLoading: true, error: null });

          try {
            const response = await authService.login(credentials);
            set({
              user: response.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } catch (error: any) {
            set({
              isLoading: false,
              error: error.error || 'Login failed',
              user: null,
              isAuthenticated: false,
            });
            throw error;
          }
        },

        // Register
        register: async (data: RegisterInput) => {
          set({ isLoading: true, error: null });

          try {
            const response = await authService.register(data);
            set({
              user: response.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } catch (error: any) {
            set({
              isLoading: false,
              error: error.error || 'Registration failed',
              user: null,
              isAuthenticated: false,
            });
            throw error;
          }
        },

        // Logout
        logout: async () => {
          set({ isLoading: true });

          try {
            await authService.logout();
          } catch (error) {
            console.error('Logout error:', error);
          } finally {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
          }
        },

        // Fetch user profile
        fetchProfile: async () => {
          set({ isLoading: true, error: null });

          try {
            const user = await authService.getProfile();
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
            });
          } catch (error: any) {
            set({
              isLoading: false,
              error: error.error || 'Failed to fetch profile',
            });
            throw error;
          }
        },

        // Update profile
        updateProfile: async (data: Partial<User>) => {
          set({ isLoading: true, error: null });

          try {
            const updatedUser = await authService.updateProfile(data);
            set({
              user: updatedUser,
              isLoading: false,
            });
          } catch (error: any) {
            set({
              isLoading: false,
              error: error.error || 'Failed to update profile',
            });
            throw error;
          }
        },

        // Change password
        changePassword: async (currentPassword: string, newPassword: string) => {
          set({ isLoading: true, error: null });

          try {
            await authService.changePassword({ currentPassword, newPassword });
            set({ isLoading: false });
          } catch (error: any) {
            set({
              isLoading: false,
              error: error.error || 'Failed to change password',
            });
            throw error;
          }
        },

        // Clear error
        clearError: () => set({ error: null }),
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: 'AuthStore' }
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
