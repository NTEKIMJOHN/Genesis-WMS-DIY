import apiClient from './api';
import {
  User,
  AuthResponse,
  LoginCredentials,
  APIResponse,
} from '../types';

// ==========================================
// AUTHENTICATION SERVICE
// ==========================================

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  role: string;
}

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

class AuthService {
  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<APIResponse<AuthResponse>>(
      '/auth/login',
      credentials
    );

    // Store tokens and user data
    if (response.success && response.data) {
      localStorage.setItem('accessToken', response.data.token);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response.data;
  }

  /**
   * Register new user
   */
  async register(data: RegisterInput): Promise<AuthResponse> {
    const response = await apiClient.post<APIResponse<AuthResponse>>(
      '/auth/register',
      data
    );

    // Store tokens and user data
    if (response.success && response.data) {
      localStorage.setItem('accessToken', response.data.token);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response.data;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      // Clear local storage even if API call fails
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await apiClient.post<APIResponse<AuthResponse>>(
      '/auth/refresh',
      { refreshToken }
    );

    if (response.success && response.data) {
      localStorage.setItem('accessToken', response.data.token);
      localStorage.setItem('refreshToken', response.data.refreshToken);
    }

    return response.data;
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<User> {
    const response = await apiClient.get<APIResponse<User>>('/auth/profile');
    return response.data;
  }

  /**
   * Update user profile
   */
  async updateProfile(data: UpdateProfileInput): Promise<User> {
    const response = await apiClient.put<APIResponse<User>>(
      '/auth/profile',
      data
    );

    // Update stored user data
    if (response.success && response.data) {
      localStorage.setItem('user', JSON.stringify(response.data));
    }

    return response.data;
  }

  /**
   * Change password
   */
  async changePassword(data: ChangePasswordInput): Promise<void> {
    await apiClient.post<APIResponse<void>>('/auth/change-password', data);
  }

  /**
   * Get stored user from localStorage
   */
  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }
}

export default new AuthService();
