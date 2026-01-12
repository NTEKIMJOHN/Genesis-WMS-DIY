import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ASN, ASNLine, ShipmentStatus } from '../types';
import asnService, {
  CreateASNInput,
  UpdateASNInput,
  ReceiveASNLineInput,
  ASNQueryParams,
} from '../services/asn.service';

// ==========================================
// ASN STORE
// ==========================================

interface ASNState {
  asns: ASN[];
  currentASN: ASN | null;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchASNs: (params: ASNQueryParams) => Promise<void>;
  fetchASNById: (id: string) => Promise<void>;
  fetchASNByNumber: (asnNumber: string) => Promise<void>;
  createASN: (data: CreateASNInput) => Promise<ASN>;
  updateASN: (id: string, data: UpdateASNInput) => Promise<void>;
  updateASNStatus: (id: string, status: ShipmentStatus) => Promise<void>;
  markASNArrived: (id: string, actualArrivalDate: string) => Promise<void>;
  startReceiving: (id: string, receivingZoneId?: string) => Promise<void>;
  receiveASNLine: (asnId: string, lineId: string, data: ReceiveASNLineInput) => Promise<void>;
  completeASN: (id: string) => Promise<void>;
  cancelASN: (id: string, reason?: string) => Promise<void>;
  setCurrentASN: (asn: ASN | null) => void;
  clearError: () => void;
}

export const useASNStore = create<ASNState>()(
  devtools(
    (set, get) => ({
      asns: [],
      currentASN: null,
      totalCount: 0,
      currentPage: 1,
      pageSize: 20,
      isLoading: false,
      error: null,

      // Fetch all ASNs with filters
      fetchASNs: async (params: ASNQueryParams) => {
        set({ isLoading: true, error: null });

        try {
          const response = await asnService.getASNs(params);
          set({
            asns: response.data,
            totalCount: response.pagination.total,
            currentPage: response.pagination.page,
            pageSize: response.pagination.limit,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to fetch ASNs',
          });
          throw error;
        }
      },

      // Fetch ASN by ID
      fetchASNById: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
          const asn = await asnService.getASNById(id);
          set({
            currentASN: asn,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to fetch ASN',
          });
          throw error;
        }
      },

      // Fetch ASN by number
      fetchASNByNumber: async (asnNumber: string) => {
        set({ isLoading: true, error: null });

        try {
          const asn = await asnService.getASNByNumber(asnNumber);
          set({
            currentASN: asn,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to fetch ASN',
          });
          throw error;
        }
      },

      // Create new ASN
      createASN: async (data: CreateASNInput) => {
        set({ isLoading: true, error: null });

        try {
          const asn = await asnService.createASN(data);
          set((state) => ({
            asns: [asn, ...state.asns],
            currentASN: asn,
            isLoading: false,
          }));
          return asn;
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to create ASN',
          });
          throw error;
        }
      },

      // Update ASN
      updateASN: async (id: string, data: UpdateASNInput) => {
        set({ isLoading: true, error: null });

        try {
          const updatedASN = await asnService.updateASN(id, data);
          set((state) => ({
            asns: state.asns.map((asn) => (asn.id === id ? updatedASN : asn)),
            currentASN: state.currentASN?.id === id ? updatedASN : state.currentASN,
            isLoading: false,
          }));
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to update ASN',
          });
          throw error;
        }
      },

      // Update ASN status
      updateASNStatus: async (id: string, status: ShipmentStatus) => {
        set({ isLoading: true, error: null });

        try {
          const updatedASN = await asnService.updateASNStatus(id, status);
          set((state) => ({
            asns: state.asns.map((asn) => (asn.id === id ? updatedASN : asn)),
            currentASN: state.currentASN?.id === id ? updatedASN : state.currentASN,
            isLoading: false,
          }));
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to update ASN status',
          });
          throw error;
        }
      },

      // Mark ASN as arrived
      markASNArrived: async (id: string, actualArrivalDate: string) => {
        set({ isLoading: true, error: null });

        try {
          const updatedASN = await asnService.markASNArrived(id, actualArrivalDate);
          set((state) => ({
            asns: state.asns.map((asn) => (asn.id === id ? updatedASN : asn)),
            currentASN: state.currentASN?.id === id ? updatedASN : state.currentASN,
            isLoading: false,
          }));
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to mark ASN as arrived',
          });
          throw error;
        }
      },

      // Start receiving ASN
      startReceiving: async (id: string, receivingZoneId?: string) => {
        set({ isLoading: true, error: null });

        try {
          const updatedASN = await asnService.startReceiving(id, receivingZoneId);
          set((state) => ({
            asns: state.asns.map((asn) => (asn.id === id ? updatedASN : asn)),
            currentASN: state.currentASN?.id === id ? updatedASN : state.currentASN,
            isLoading: false,
          }));
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to start receiving',
          });
          throw error;
        }
      },

      // Receive ASN line
      receiveASNLine: async (asnId: string, lineId: string, data: ReceiveASNLineInput) => {
        set({ isLoading: true, error: null });

        try {
          await asnService.receiveASNLine(asnId, lineId, data);

          // Refresh current ASN to get updated line data
          if (get().currentASN?.id === asnId) {
            await get().fetchASNById(asnId);
          }

          set({ isLoading: false });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to receive ASN line',
          });
          throw error;
        }
      },

      // Complete ASN
      completeASN: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
          const updatedASN = await asnService.completeASN(id);
          set((state) => ({
            asns: state.asns.map((asn) => (asn.id === id ? updatedASN : asn)),
            currentASN: state.currentASN?.id === id ? updatedASN : state.currentASN,
            isLoading: false,
          }));
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to complete ASN',
          });
          throw error;
        }
      },

      // Cancel ASN
      cancelASN: async (id: string, reason?: string) => {
        set({ isLoading: true, error: null });

        try {
          const updatedASN = await asnService.cancelASN(id, reason);
          set((state) => ({
            asns: state.asns.map((asn) => (asn.id === id ? updatedASN : asn)),
            currentASN: state.currentASN?.id === id ? updatedASN : state.currentASN,
            isLoading: false,
          }));
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.error || 'Failed to cancel ASN',
          });
          throw error;
        }
      },

      // Set current ASN
      setCurrentASN: (asn: ASN | null) => set({ currentASN: asn }),

      // Clear error
      clearError: () => set({ error: null }),
    }),
    { name: 'ASNStore' }
  )
);
