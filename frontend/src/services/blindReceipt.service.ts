import apiClient from './api';
import {
  BlindReceipt,
  BlindReceiptLine,
  BlindReceiptStatus,
  ItemCondition,
  APIResponse,
  PaginatedResponse,
} from '../types';

// ==========================================
// BLIND RECEIPT SERVICE
// ==========================================

export interface CreateBlindReceiptInput {
  tenantId: string;
  warehouseId: string;
  receiptType: 'UNPLANNED_DELIVERY' | 'SAMPLE' | 'RETURN' | 'OTHER';
  supplierName: string;
  supplierContact?: string;
  carrier?: string;
  driverName?: string;
  vehicleId?: string;
  arrivalDate: string;
  arrivalTime: string;
  receivingZoneId?: string;
  priority: 'LOW' | 'STANDARD' | 'HIGH' | 'URGENT';
  specialNotes?: string;
}

export interface UpdateBlindReceiptInput {
  supplierName?: string;
  supplierContact?: string;
  carrier?: string;
  priority?: 'LOW' | 'STANDARD' | 'HIGH' | 'URGENT';
  specialNotes?: string;
}

export interface AddBlindReceiptLineInput {
  skuId?: string;
  skuCode: string;
  productName: string;
  quantityReceived: number;
  uom: string;
  batchNumber?: string;
  expiryDate?: string;
  lpn?: string;
  serialNumbers?: string[];
  condition: ItemCondition;
  temperatureReading?: number;
  qaHold?: boolean;
  estimatedUnitCost?: number;
  photoEvidenceUrls?: string[];
  receiverNotes?: string;
}

export interface ReviewBlindReceiptInput {
  approved: boolean;
  supervisorNotes?: string;
  rejectionReason?: string;
}

export interface BlindReceiptQueryParams {
  warehouseId?: string;
  status?: BlindReceiptStatus;
  receiptType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

class BlindReceiptService {
  /**
   * Create new blind receipt
   */
  async createBlindReceipt(data: CreateBlindReceiptInput): Promise<BlindReceipt> {
    const response = await apiClient.post<APIResponse<BlindReceipt>>(
      '/blind-receipts',
      data
    );
    return response.data;
  }

  /**
   * Get all blind receipts with filters
   */
  async getBlindReceipts(
    params: BlindReceiptQueryParams
  ): Promise<PaginatedResponse<BlindReceipt>> {
    return await apiClient.get<PaginatedResponse<BlindReceipt>>(
      '/blind-receipts',
      params
    );
  }

  /**
   * Get blind receipt by ID
   */
  async getBlindReceiptById(id: string): Promise<BlindReceipt> {
    const response = await apiClient.get<APIResponse<BlindReceipt>>(
      `/blind-receipts/${id}`
    );
    return response.data;
  }

  /**
   * Get blind receipt by receipt number
   */
  async getBlindReceiptByNumber(receiptNumber: string): Promise<BlindReceipt> {
    const response = await apiClient.get<APIResponse<BlindReceipt>>(
      `/blind-receipts/number/${receiptNumber}`
    );
    return response.data;
  }

  /**
   * Update blind receipt
   */
  async updateBlindReceipt(
    id: string,
    data: UpdateBlindReceiptInput
  ): Promise<BlindReceipt> {
    const response = await apiClient.put<APIResponse<BlindReceipt>>(
      `/blind-receipts/${id}`,
      data
    );
    return response.data;
  }

  /**
   * Add line to blind receipt
   */
  async addLine(
    receiptId: string,
    line: AddBlindReceiptLineInput
  ): Promise<BlindReceiptLine> {
    const response = await apiClient.post<APIResponse<BlindReceiptLine>>(
      `/blind-receipts/${receiptId}/lines`,
      line
    );
    return response.data;
  }

  /**
   * Update blind receipt line
   */
  async updateLine(
    receiptId: string,
    lineId: string,
    data: Partial<AddBlindReceiptLineInput>
  ): Promise<BlindReceiptLine> {
    const response = await apiClient.put<APIResponse<BlindReceiptLine>>(
      `/blind-receipts/${receiptId}/lines/${lineId}`,
      data
    );
    return response.data;
  }

  /**
   * Delete blind receipt line
   */
  async deleteLine(receiptId: string, lineId: string): Promise<void> {
    await apiClient.delete(`/blind-receipts/${receiptId}/lines/${lineId}`);
  }

  /**
   * Submit blind receipt for approval
   */
  async submitForApproval(id: string): Promise<BlindReceipt> {
    const response = await apiClient.post<APIResponse<BlindReceipt>>(
      `/blind-receipts/${id}/submit`
    );
    return response.data;
  }

  /**
   * Review blind receipt (approve/reject)
   */
  async reviewBlindReceipt(
    id: string,
    data: ReviewBlindReceiptInput
  ): Promise<BlindReceipt> {
    const response = await apiClient.post<APIResponse<BlindReceipt>>(
      `/blind-receipts/${id}/review`,
      data
    );
    return response.data;
  }

  /**
   * Cancel blind receipt
   */
  async cancelBlindReceipt(id: string): Promise<BlindReceipt> {
    const response = await apiClient.post<APIResponse<BlindReceipt>>(
      `/blind-receipts/${id}/cancel`
    );
    return response.data;
  }

  /**
   * Get blind receipts pending approval
   */
  async getPendingApproval(warehouseId?: string): Promise<BlindReceipt[]> {
    const response = await apiClient.get<APIResponse<BlindReceipt[]>>(
      '/blind-receipts/pending-approval',
      { warehouseId }
    );
    return response.data;
  }

  /**
   * Get blind receipt statistics
   */
  async getBlindReceiptStats(warehouseId?: string): Promise<any> {
    const response = await apiClient.get<APIResponse<any>>(
      '/blind-receipts/stats',
      { warehouseId }
    );
    return response.data;
  }
}

export default new BlindReceiptService();
