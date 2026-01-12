import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { LPN, LPNStatus } from '../types';
import lpnService, {
  CreateLPNInput,
  MoveLPNInput,
  SplitLPNInput,
  LPNQueryParams,
} from '../services/lpn.service';

// ==========================================
// LPN STORE
// ==========================================

interface LPNState {
  lpns: LPN[];
  currentLPN: LPN | null;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchLPNs: (params: LPNQueryParams) => Promise<void>;
  fetchLPNById: (id: string) => Promise<void>;
  fetchLPNByCode: (lpnCode: string) => Promise<void>;
  createLPN: (data: CreateLPNInput) => Promise<LPN>;
  moveLPN: (id: string, data: MoveLPNInput) => Promise<void>;
  updateLPNStatus: (id: string, status: LPNStatus) => Promise<void>;
  splitLPN: (id: string, data: SplitLPNInput) => Promise<{ original: LPN; newLPN: LPN }>;
  archiveLPN: (id: string) => Promise<void>;
  setCurrentLPN: (lpn: LPN | null) => void;
  clearError: () => void;
}

export const useLPNStore = create<LPNState>()(
  devtools(
    (set, get) => ({
      lpns: [],
      currentLPN: null,
      totalCount: 0,
      currentPage: 1,
      pageSize: 20,
      isLoading: false,
      error: null,

      // Fetch all LPNs with filters
      fetchLPNs: async (params: LPNQueryParams) => {
        set({ isLoading: true, error: null });

        try {
          const response = await lpnService.getLPNs(params);
          set({
            lpns: response.data,
            totalCount: response.pagination.total,
            currentPage: response.pagination.page,
            pageSize: response.pagination.limit,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to fetch LPNs',
          });
          throw error;
        }
      },

      // Fetch LPN by ID
      fetchLPNById: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
          const lpn = await lpnService.getLPNById(id);
          set({
            currentLPN: lpn,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to fetch LPN',
          });
          throw error;
        }
      },

      // Fetch LPN by code
      fetchLPNByCode: async (lpnCode: string) => {
        set({ isLoading: true, error: null });

        try {
          const lpn = await lpnService.getLPNByCode(lpnCode);
          set({
            currentLPN: lpn,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to fetch LPN',
          });
          throw error;
        }
      },

      // Create new LPN
      createLPN: async (data: CreateLPNInput) => {
        set({ isLoading: true, error: null });

        try {
          const lpn = await lpnService.createLPN(data);
          set((state) => ({
            lpns: [lpn, ...state.lpns],
            currentLPN: lpn,
            isLoading: false,
          }));
          return lpn;
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to create LPN',
          });
          throw error;
        }
      },

      // Move LPN
      moveLPN: async (id: string, data: MoveLPNInput) => {
        set({ isLoading: true, error: null });

        try {
          const updatedLPN = await lpnService.moveLPN(id, data);
          set((state) => ({
            lpns: state.lpns.map((lpn) => (lpn.id === id ? updatedLPN : lpn)),
            currentLPN: state.currentLPN?.id === id ? updatedLPN : state.currentLPN,
            isLoading: false,
          }));
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to move LPN',
          });
          throw error;
        }
      },

      // Update LPN status
      updateLPNStatus: async (id: string, status: LPNStatus) => {
        set({ isLoading: true, error: null });

        try {
          const updatedLPN = await lpnService.updateLPNStatus(id, status);
          set((state) => ({
            lpns: state.lpns.map((lpn) => (lpn.id === id ? updatedLPN : lpn)),
            currentLPN: state.currentLPN?.id === id ? updatedLPN : state.currentLPN,
            isLoading: false,
          }));
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to update LPN status',
          });
          throw error;
        }
      },

      // Split LPN
      splitLPN: async (id: string, data: SplitLPNInput) => {
        set({ isLoading: true, error: null });

        try {
          const result = await lpnService.splitLPN(id, data);
          set((state) => ({
            lpns: state.lpns.map((lpn) =>
              lpn.id === id ? result.original : lpn
            ),
            currentLPN: state.currentLPN?.id === id ? result.original : state.currentLPN,
            isLoading: false,
          }));
          return result;
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to split LPN',
          });
          throw error;
        }
      },

      // Archive LPN
      archiveLPN: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
          const updatedLPN = await lpnService.archiveLPN(id);
          set((state) => ({
            lpns: state.lpns.map((lpn) => (lpn.id === id ? updatedLPN : lpn)),
            currentLPN: state.currentLPN?.id === id ? updatedLPN : state.currentLPN,
            isLoading: false,
          }));
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to archive LPN',
          });
          throw error;
        }
      },

      // Set current LPN
      setCurrentLPN: (lpn: LPN | null) => set({ currentLPN: lpn }),

      // Clear error
      clearError: () => set({ error: null }),
    }),
    { name: 'LPNStore' }
  )
);
