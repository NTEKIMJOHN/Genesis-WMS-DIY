import apiClient from './api';
import {
  ASN,
  ASNLine,
  APIResponse,
  PaginatedResponse,
  ShipmentStatus,
} from '../types';

// ==========================================
// ASN SERVICE
// ==========================================

export interface CreateASNInput {
  tenantId: string;
  warehouseId: string;
  poNumber?: string;
  supplierId: string;
  carrier?: string;
  trackingNumber?: string;
  expectedArrivalDate: string;
  receivingZoneId?: string;
  priority: 'LOW' | 'STANDARD' | 'HIGH' | 'URGENT' | 'CRITICAL';
  temperatureControlled?: boolean;
  hazmatFlag?: boolean;
  specialInstructions?: string;
  lines: Array<{
    skuId: string;
    expectedQuantity: number;
    uom: string;
    batchNumberExpected?: string;
    expiryDateExpected?: string;
    lpnExpected?: string;
  }>;
}

export interface UpdateASNInput {
  poNumber?: string;
  carrier?: string;
  trackingNumber?: string;
  expectedArrivalDate?: string;
  receivingZoneId?: string;
  priority?: 'LOW' | 'STANDARD' | 'HIGH' | 'URGENT' | 'CRITICAL';
  specialInstructions?: string;
}

export interface ReceiveASNLineInput {
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  batchNumberReceived?: string;
  expiryDateReceived?: string;
  lpnReceived?: string;
  serialNumbers?: string[];
  varianceType?: string;
  varianceReasonCode?: string;
  varianceNotes?: string;
  photoEvidenceUrls?: string[];
  qaHold?: boolean;
  temperatureReading?: number;
}

export interface ASNQueryParams {
  warehouseId?: string;
  status?: ShipmentStatus;
  supplierId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  priority?: string;
  page?: number;
  limit?: number;
}

class ASNService {
  /**
   * Create new ASN
   */
  async createASN(data: CreateASNInput): Promise<ASN> {
    const response = await apiClient.post<APIResponse<ASN>>('/asn', data);
    return response.data;
  }

  /**
   * Get all ASNs with filters
   */
  async getASNs(params: ASNQueryParams): Promise<PaginatedResponse<ASN>> {
    return await apiClient.get<PaginatedResponse<ASN>>('/asn', params);
  }

  /**
   * Get ASN by ID
   */
  async getASNById(id: string): Promise<ASN> {
    const response = await apiClient.get<APIResponse<ASN>>(`/asn/${id}`);
    return response.data;
  }

  /**
   * Get ASN by ASN number
   */
  async getASNByNumber(asnNumber: string): Promise<ASN> {
    const response = await apiClient.get<APIResponse<ASN>>(
      `/asn/number/${asnNumber}`
    );
    return response.data;
  }

  /**
   * Update ASN
   */
  async updateASN(id: string, data: UpdateASNInput): Promise<ASN> {
    const response = await apiClient.put<APIResponse<ASN>>(`/asn/${id}`, data);
    return response.data;
  }

  /**
   * Update ASN status
   */
  async updateASNStatus(id: string, status: ShipmentStatus): Promise<ASN> {
    const response = await apiClient.patch<APIResponse<ASN>>(
      `/asn/${id}/status`,
      { status }
    );
    return response.data;
  }

  /**
   * Mark ASN as arrived
   */
  async markASNArrived(id: string, actualArrivalDate: string): Promise<ASN> {
    const response = await apiClient.post<APIResponse<ASN>>(
      `/asn/${id}/arrive`,
      { actualArrivalDate }
    );
    return response.data;
  }

  /**
   * Start receiving ASN
   */
  async startReceiving(id: string, receivingZoneId?: string): Promise<ASN> {
    const response = await apiClient.post<APIResponse<ASN>>(
      `/asn/${id}/start-receiving`,
      { receivingZoneId }
    );
    return response.data;
  }

  /**
   * Receive ASN line
   */
  async receiveASNLine(
    asnId: string,
    lineId: string,
    data: ReceiveASNLineInput
  ): Promise<ASNLine> {
    const response = await apiClient.post<APIResponse<ASNLine>>(
      `/asn/${asnId}/lines/${lineId}/receive`,
      data
    );
    return response.data;
  }

  /**
   * Complete ASN receiving
   */
  async completeASN(id: string): Promise<ASN> {
    const response = await apiClient.post<APIResponse<ASN>>(
      `/asn/${id}/complete`
    );
    return response.data;
  }

  /**
   * Cancel ASN
   */
  async cancelASN(id: string, reason?: string): Promise<ASN> {
    const response = await apiClient.post<APIResponse<ASN>>(
      `/asn/${id}/cancel`,
      { reason }
    );
    return response.data;
  }

  /**
   * Add line to ASN
   */
  async addLine(
    asnId: string,
    line: {
      skuId: string;
      expectedQuantity: number;
      uom: string;
      batchNumberExpected?: string;
      expiryDateExpected?: string;
    }
  ): Promise<ASNLine> {
    const response = await apiClient.post<APIResponse<ASNLine>>(
      `/asn/${asnId}/lines`,
      line
    );
    return response.data;
  }

  /**
   * Delete ASN line
   */
  async deleteLine(asnId: string, lineId: string): Promise<void> {
    await apiClient.delete(`/asn/${asnId}/lines/${lineId}`);
  }

  /**
   * Get ASN receiving statistics
   */
  async getASNStats(warehouseId?: string): Promise<any> {
    const response = await apiClient.get<APIResponse<any>>('/asn/stats', {
      warehouseId,
    });
    return response.data;
  }
}

export default new ASNService();
