import apiClient from './api';
import {
  LPN,
  LPNStatus,
  APIResponse,
  PaginatedResponse,
} from '../types';

// ==========================================
// LPN SERVICE
// ==========================================

export interface CreateLPNInput {
  tenantId: string;
  warehouseId: string;
  lpnType?: 'PALLET' | 'CARTON' | 'TOTE' | 'OTHER';
  currentLocationId?: string;
  items: Array<{
    skuId: string;
    quantity: number;
    batchNumber?: string;
    expiryDate?: string;
    serialNumbers?: string[];
  }>;
}

export interface MoveLPNInput {
  destinationLocationId: string;
}

export interface SplitLPNInput {
  items: Array<{
    skuId: string;
    quantity: number;
  }>;
}

export interface LPNQueryParams {
  warehouseId?: string;
  status?: LPNStatus;
  lpnType?: string;
  locationId?: string;
  zoneId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

class LPNService {
  /**
   * Create new LPN
   */
  async createLPN(data: CreateLPNInput): Promise<LPN> {
    const response = await apiClient.post<APIResponse<LPN>>('/lpn', data);
    return response.data;
  }

  /**
   * Get all LPNs with filters
   */
  async getLPNs(params: LPNQueryParams): Promise<PaginatedResponse<LPN>> {
    return await apiClient.get<PaginatedResponse<LPN>>('/lpn', params);
  }

  /**
   * Get LPN by ID
   */
  async getLPNById(id: string): Promise<LPN> {
    const response = await apiClient.get<APIResponse<LPN>>(`/lpn/${id}`);
    return response.data;
  }

  /**
   * Get LPN by code
   */
  async getLPNByCode(lpnCode: string): Promise<LPN> {
    const response = await apiClient.get<APIResponse<LPN>>(
      `/lpn/code/${lpnCode}`
    );
    return response.data;
  }

  /**
   * Move LPN to new location
   */
  async moveLPN(id: string, data: MoveLPNInput): Promise<LPN> {
    const response = await apiClient.post<APIResponse<LPN>>(
      `/lpn/${id}/move`,
      data
    );
    return response.data;
  }

  /**
   * Update LPN status
   */
  async updateLPNStatus(id: string, status: LPNStatus): Promise<LPN> {
    const response = await apiClient.patch<APIResponse<LPN>>(
      `/lpn/${id}/status`,
      { status }
    );
    return response.data;
  }

  /**
   * Split LPN into multiple LPNs
   */
  async splitLPN(
    id: string,
    data: SplitLPNInput
  ): Promise<{ original: LPN; newLPN: LPN }> {
    const response = await apiClient.post<
      APIResponse<{ original: LPN; newLPN: LPN }>
    >(`/lpn/${id}/split`, data);
    return response.data;
  }

  /**
   * Archive LPN (when fully consumed)
   */
  async archiveLPN(id: string): Promise<LPN> {
    const response = await apiClient.post<APIResponse<LPN>>(
      `/lpn/${id}/archive`
    );
    return response.data;
  }

  /**
   * Get LPNs by location
   */
  async getLPNsByLocation(locationId: string): Promise<LPN[]> {
    const response = await apiClient.get<APIResponse<LPN[]>>(
      `/lpn/location/${locationId}`
    );
    return response.data;
  }

  /**
   * Get LPNs by zone
   */
  async getLPNsByZone(zoneId: string): Promise<LPN[]> {
    const response = await apiClient.get<APIResponse<LPN[]>>(
      `/lpn/zone/${zoneId}`
    );
    return response.data;
  }

  /**
   * Search LPNs by SKU
   */
  async searchBySKU(skuId: string, warehouseId?: string): Promise<LPN[]> {
    const response = await apiClient.get<APIResponse<LPN[]>>('/lpn/search', {
      skuId,
      warehouseId,
    });
    return response.data;
  }

  /**
   * Get LPN movement history
   */
  async getLPNHistory(id: string): Promise<any[]> {
    const response = await apiClient.get<APIResponse<any[]>>(
      `/lpn/${id}/history`
    );
    return response.data;
  }

  /**
   * Get LPN statistics
   */
  async getLPNStats(warehouseId?: string): Promise<any> {
    const response = await apiClient.get<APIResponse<any>>('/lpn/stats', {
      warehouseId,
    });
    return response.data;
  }

  /**
   * Validate LPN code (check if exists)
   */
  async validateLPNCode(lpnCode: string): Promise<boolean> {
    try {
      await this.getLPNByCode(lpnCode);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate LPN label data
   */
  async generateLabel(id: string): Promise<any> {
    const response = await apiClient.get<APIResponse<any>>(
      `/lpn/${id}/label`
    );
    return response.data;
  }

  /**
   * Consolidate multiple LPNs into one
   */
  async consolidateLPNs(
    targetLPNId: string,
    sourceLPNIds: string[]
  ): Promise<LPN> {
    const response = await apiClient.post<APIResponse<LPN>>(
      '/lpn/consolidate',
      { targetLPNId, sourceLPNIds }
    );
    return response.data;
  }
}

export default new LPNService();
