import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ==========================================
// UI STORE
// ==========================================

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export interface Modal {
  id: string;
  component: string;
  props?: any;
}

interface UIState {
  // Sidebar
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;

  // Modals
  modals: Modal[];

  // Toasts
  toasts: Toast[];

  // Loading states
  globalLoading: boolean;
  loadingMessage: string | null;

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setSidebarCollapsed: (isCollapsed: boolean) => void;

  openModal: (modal: Modal) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;

  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
  clearToasts: () => void;

  setGlobalLoading: (isLoading: boolean, message?: string) => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      // Initial state
      isSidebarOpen: true,
      isSidebarCollapsed: false,
      modals: [],
      toasts: [],
      globalLoading: false,
      loadingMessage: null,

      // Sidebar actions
      toggleSidebar: () =>
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

      setSidebarOpen: (isOpen: boolean) =>
        set({ isSidebarOpen: isOpen }),

      setSidebarCollapsed: (isCollapsed: boolean) =>
        set({ isSidebarCollapsed: isCollapsed }),

      // Modal actions
      openModal: (modal: Modal) =>
        set((state) => ({
          modals: [...state.modals, modal],
        })),

      closeModal: (id: string) =>
        set((state) => ({
          modals: state.modals.filter((modal) => modal.id !== id),
        })),

      closeAllModals: () => set({ modals: [] }),

      // Toast actions
      showToast: (toast: Omit<Toast, 'id'>) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        const newToast: Toast = {
          ...toast,
          id,
          duration: toast.duration || 5000,
        };

        set((state) => ({
          toasts: [...state.toasts, newToast],
        }));

        // Auto-remove toast after duration
        if (newToast.duration) {
          setTimeout(() => {
            set((state) => ({
              toasts: state.toasts.filter((t) => t.id !== id),
            }));
          }, newToast.duration);
        }
      },

      hideToast: (id: string) =>
        set((state) => ({
          toasts: state.toasts.filter((toast) => toast.id !== id),
        })),

      clearToasts: () => set({ toasts: [] }),

      // Global loading
      setGlobalLoading: (isLoading: boolean, message?: string) =>
        set({
          globalLoading: isLoading,
          loadingMessage: message || null,
        }),
    }),
    { name: 'UIStore' }
  )
);

// Helper functions to show toasts from anywhere
export const showSuccessToast = (title: string, message?: string) => {
  useUIStore.getState().showToast({ type: 'success', title, message });
};

export const showErrorToast = (title: string, message?: string) => {
  useUIStore.getState().showToast({ type: 'error', title, message });
};

export const showWarningToast = (title: string, message?: string) => {
  useUIStore.getState().showToast({ type: 'warning', title, message });
};

export const showInfoToast = (title: string, message?: string) => {
  useUIStore.getState().showToast({ type: 'info', title, message });
};
