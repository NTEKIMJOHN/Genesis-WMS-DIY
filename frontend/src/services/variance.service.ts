import apiClient from './api';
import {
  Variance,
  VarianceStatus,
  VarianceType,
  ResolutionAction,
  APIResponse,
  PaginatedResponse,
  VarianceStatistics,
} from '../types';

// ==========================================
// VARIANCE SERVICE
// ==========================================

export interface CreateVarianceInput {
  tenantId: string;
  warehouseId: string;
  receiptType: 'ASN' | 'BLIND';
  receiptId?: string;
  receiptLineId?: string;
  asnId?: string;
  blindReceiptId?: string;
  skuId?: string;
  skuCode: string;
  productName: string;
  varianceType: VarianceType;
  expectedQuantity?: number;
  receivedQuantity: number;
  varianceQuantity: number;
  variancePercentage: number;
  varianceValue?: number;
  reasonCode: string;
  reasonDescription?: string;
  receiverNotes?: string;
  photoEvidenceUrls?: string[];
  temperatureReading?: number;
  batchNumber?: string;
  expiryDate?: string;
  conditionAssessment: 'GOOD' | 'DAMAGED' | 'EXPIRED' | 'UNKNOWN';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface ResolveVarianceInput {
  resolutionAction: ResolutionAction;
  supervisorNotes?: string;
  adjustedQuantity?: number;
}

export interface EscalateVarianceInput {
  escalatedToId: string;
  escalationNotes?: string;
}

export interface VarianceQueryParams {
  warehouseId?: string;
  status?: VarianceStatus;
  varianceType?: VarianceType;
  priority?: string;
  receiptType?: 'ASN' | 'BLIND';
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

class VarianceService {
  /**
   * Create new variance
   */
  async createVariance(data: CreateVarianceInput): Promise<Variance> {
    const response = await apiClient.post<APIResponse<Variance>>(
      '/variances',
      data
    );
    return response.data;
  }

  /**
   * Get all variances with filters
   */
  async getVariances(
    params: VarianceQueryParams
  ): Promise<PaginatedResponse<Variance>> {
    return await apiClient.get<PaginatedResponse<Variance>>(
      '/variances',
      params
    );
  }

  /**
   * Get variance by ID
   */
  async getVarianceById(id: string): Promise<Variance> {
    const response = await apiClient.get<APIResponse<Variance>>(
      `/variances/${id}`
    );
    return response.data;
  }

  /**
   * Resolve variance (approve/reject/escalate)
   */
  async resolveVariance(
    id: string,
    data: ResolveVarianceInput
  ): Promise<Variance> {
    const response = await apiClient.post<APIResponse<Variance>>(
      `/variances/${id}/resolve`,
      data
    );
    return response.data;
  }

  /**
   * Escalate variance to higher authority
   */
  async escalateVariance(
    id: string,
    data: EscalateVarianceInput
  ): Promise<Variance> {
    const response = await apiClient.post<APIResponse<Variance>>(
      `/variances/${id}/escalate`,
      data
    );
    return response.data;
  }

  /**
   * Update variance status
   */
  async updateVarianceStatus(
    id: string,
    status: VarianceStatus
  ): Promise<Variance> {
    const response = await apiClient.patch<APIResponse<Variance>>(
      `/variances/${id}/status`,
      { status }
    );
    return response.data;
  }

  /**
   * Add supervisor notes to variance
   */
  async addSupervisorNotes(id: string, notes: string): Promise<Variance> {
    const response = await apiClient.patch<APIResponse<Variance>>(
      `/variances/${id}/notes`,
      { supervisorNotes: notes }
    );
    return response.data;
  }

  /**
   * Get variance statistics
   */
  async getVarianceStatistics(
    warehouseId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<VarianceStatistics> {
    const response = await apiClient.get<APIResponse<VarianceStatistics>>(
      '/variances/statistics',
      { warehouseId, startDate, endDate }
    );
    return response.data;
  }

  /**
   * Get variances by supplier
   */
  async getVariancesBySupplierId(
    supplierId: string,
    startDate?: string,
    endDate?: string
  ): Promise<Variance[]> {
    const response = await apiClient.get<APIResponse<Variance[]>>(
      `/variances/supplier/${supplierId}`,
      { startDate, endDate }
    );
    return response.data;
  }

  /**
   * Get pending variances requiring approval
   */
  async getPendingApproval(warehouseId?: string): Promise<Variance[]> {
    const response = await apiClient.get<APIResponse<Variance[]>>(
      '/variances/pending-approval',
      { warehouseId }
    );
    return response.data;
  }

  /**
   * Get high-priority variances
   */
  async getHighPriorityVariances(warehouseId?: string): Promise<Variance[]> {
    const response = await apiClient.get<APIResponse<Variance[]>>(
      '/variances/high-priority',
      { warehouseId }
    );
    return response.data;
  }

  /**
   * Bulk resolve variances
   */
  async bulkResolve(
    varianceIds: string[],
    data: ResolveVarianceInput
  ): Promise<Variance[]> {
    const response = await apiClient.post<APIResponse<Variance[]>>(
      '/variances/bulk-resolve',
      { varianceIds, ...data }
    );
    return response.data;
  }

  /**
   * Export variances to CSV
   */
  async exportVariances(params: VarianceQueryParams): Promise<Blob> {
    const response = await apiClient.get('/variances/export', params);
    return new Blob([JSON.stringify(response)], { type: 'text/csv' });
  }
}

export default new VarianceService();
