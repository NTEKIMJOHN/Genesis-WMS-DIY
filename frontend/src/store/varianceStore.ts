import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Variance, VarianceStatus, VarianceStatistics } from '../types';
import varianceService, {
  CreateVarianceInput,
  ResolveVarianceInput,
  VarianceQueryParams,
} from '../services/variance.service';

// ==========================================
// VARIANCE STORE
// ==========================================

interface VarianceState {
  variances: Variance[];
  currentVariance: Variance | null;
  statistics: VarianceStatistics | null;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchVariances: (params: VarianceQueryParams) => Promise<void>;
  fetchVarianceById: (id: string) => Promise<void>;
  createVariance: (data: CreateVarianceInput) => Promise<Variance>;
  resolveVariance: (id: string, data: ResolveVarianceInput) => Promise<void>;
  escalateVariance: (id: string, escalatedToId: string, notes?: string) => Promise<void>;
  fetchStatistics: (warehouseId?: string, startDate?: string, endDate?: string) => Promise<void>;
  fetchPendingApproval: (warehouseId?: string) => Promise<void>;
  setCurrentVariance: (variance: Variance | null) => void;
  clearError: () => void;
}

export const useVarianceStore = create<VarianceState>()(
  devtools(
    (set, get) => ({
      variances: [],
      currentVariance: null,
      statistics: null,
      totalCount: 0,
      currentPage: 1,
      pageSize: 20,
      isLoading: false,
      error: null,

      // Fetch all variances with filters
      fetchVariances: async (params: VarianceQueryParams) => {
        set({ isLoading: true, error: null });

        try {
          const response = await varianceService.getVariances(params);
          set({
            variances: response.data,
            totalCount: response.pagination.total,
            currentPage: response.pagination.page,
            pageSize: response.pagination.limit,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to fetch variances',
          });
          throw error;
        }
      },

      // Fetch variance by ID
      fetchVarianceById: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
          const variance = await varianceService.getVarianceById(id);
          set({
            currentVariance: variance,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to fetch variance',
          });
          throw error;
        }
      },

      // Create new variance
      createVariance: async (data: CreateVarianceInput) => {
        set({ isLoading: true, error: null });

        try {
          const variance = await varianceService.createVariance(data);
          set((state) => ({
            variances: [variance, ...state.variances],
            isLoading: false,
          }));
          return variance;
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to create variance',
          });
          throw error;
        }
      },

      // Resolve variance
      resolveVariance: async (id: string, data: ResolveVarianceInput) => {
        set({ isLoading: true, error: null });

        try {
          const updatedVariance = await varianceService.resolveVariance(id, data);
          set((state) => ({
            variances: state.variances.map((v) => (v.id === id ? updatedVariance : v)),
            currentVariance: state.currentVariance?.id === id ? updatedVariance : state.currentVariance,
            isLoading: false,
          }));
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to resolve variance',
          });
          throw error;
        }
      },

      // Escalate variance
      escalateVariance: async (id: string, escalatedToId: string, notes?: string) => {
        set({ isLoading: true, error: null });

        try {
          const updatedVariance = await varianceService.escalateVariance(id, {
            escalatedToId,
            escalationNotes: notes,
          });
          set((state) => ({
            variances: state.variances.map((v) => (v.id === id ? updatedVariance : v)),
            currentVariance: state.currentVariance?.id === id ? updatedVariance : state.currentVariance,
            isLoading: false,
          }));
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to escalate variance',
          });
          throw error;
        }
      },

      // Fetch variance statistics
      fetchStatistics: async (warehouseId?: string, startDate?: string, endDate?: string) => {
        set({ isLoading: true, error: null });

        try {
          const statistics = await varianceService.getVarianceStatistics(
            warehouseId,
            startDate,
            endDate
          );
          set({
            statistics,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to fetch statistics',
          });
          throw error;
        }
      },

      // Fetch pending variances
      fetchPendingApproval: async (warehouseId?: string) => {
        set({ isLoading: true, error: null });

        try {
          const variances = await varianceService.getPendingApproval(warehouseId);
          set({
            variances,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to fetch pending variances',
          });
          throw error;
        }
      },

      // Set current variance
      setCurrentVariance: (variance: Variance | null) => set({ currentVariance: variance }),

      // Clear error
      clearError: () => set({ error: null }),
    }),
    { name: 'VarianceStore' }
  )
);
