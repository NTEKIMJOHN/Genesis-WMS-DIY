import apiClient from './api';
import {
  PutawayTask,
  PutawayStatus,
  APIResponse,
  PaginatedResponse,
} from '../types';

// ==========================================
// PUTAWAY SERVICE
// ==========================================

export interface CreatePutawayTaskInput {
  tenantId: string;
  warehouseId: string;
  receiptType: 'ASN' | 'BLIND';
  receiptId?: string;
  receiptLineId?: string;
  taskType: 'STANDARD' | 'BATCH' | 'BULK';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  skuId: string;
  skuCode: string;
  productName: string;
  quantityToPutaway: number;
  batchNumber?: string;
  expiryDate?: string;
  lpn?: string;
  serialNumbers?: string[];
  sourceLocationId: string;
  putawayStrategy: string;
  specialHandling?: any;
}

export interface AssignPutawayTaskInput {
  operatorUserId: string;
}

export interface StartPutawayTaskInput {
  destinationLocationId?: string;
}

export interface CompletePutawayTaskInput {
  destinationLocationId: string;
  quantityConfirmed: number;
  operatorNotes?: string;
}

export interface PutawayQueryParams {
  warehouseId?: string;
  status?: PutawayStatus;
  priority?: string;
  operatorUserId?: string;
  sourceLocationId?: string;
  taskType?: string;
  page?: number;
  limit?: number;
}

class PutawayService {
  /**
   * Create new putaway task
   */
  async createPutawayTask(data: CreatePutawayTaskInput): Promise<PutawayTask> {
    const response = await apiClient.post<APIResponse<PutawayTask>>(
      '/putaway',
      data
    );
    return response.data;
  }

  /**
   * Get all putaway tasks with filters
   */
  async getPutawayTasks(
    params: PutawayQueryParams
  ): Promise<PaginatedResponse<PutawayTask>> {
    return await apiClient.get<PaginatedResponse<PutawayTask>>(
      '/putaway',
      params
    );
  }

  /**
   * Get putaway task by ID
   */
  async getPutawayTaskById(id: string): Promise<PutawayTask> {
    const response = await apiClient.get<APIResponse<PutawayTask>>(
      `/putaway/${id}`
    );
    return response.data;
  }

  /**
   * Get putaway task by task number
   */
  async getPutawayTaskByNumber(taskNumber: string): Promise<PutawayTask> {
    const response = await apiClient.get<APIResponse<PutawayTask>>(
      `/putaway/number/${taskNumber}`
    );
    return response.data;
  }

  /**
   * Assign putaway task to operator
   */
  async assignTask(
    id: string,
    data: AssignPutawayTaskInput
  ): Promise<PutawayTask> {
    const response = await apiClient.post<APIResponse<PutawayTask>>(
      `/putaway/${id}/assign`,
      data
    );
    return response.data;
  }

  /**
   * Start putaway task
   */
  async startTask(
    id: string,
    data?: StartPutawayTaskInput
  ): Promise<PutawayTask> {
    const response = await apiClient.post<APIResponse<PutawayTask>>(
      `/putaway/${id}/start`,
      data
    );
    return response.data;
  }

  /**
   * Complete putaway task
   */
  async completeTask(
    id: string,
    data: CompletePutawayTaskInput
  ): Promise<PutawayTask> {
    const response = await apiClient.post<APIResponse<PutawayTask>>(
      `/putaway/${id}/complete`,
      data
    );
    return response.data;
  }

  /**
   * Cancel putaway task
   */
  async cancelTask(id: string, reason?: string): Promise<PutawayTask> {
    const response = await apiClient.post<APIResponse<PutawayTask>>(
      `/putaway/${id}/cancel`,
      { reason }
    );
    return response.data;
  }

  /**
   * Put task on hold
   */
  async putOnHold(id: string, reason?: string): Promise<PutawayTask> {
    const response = await apiClient.post<APIResponse<PutawayTask>>(
      `/putaway/${id}/hold`,
      { reason }
    );
    return response.data;
  }

  /**
   * Resume task from hold
   */
  async resumeTask(id: string): Promise<PutawayTask> {
    const response = await apiClient.post<APIResponse<PutawayTask>>(
      `/putaway/${id}/resume`
    );
    return response.data;
  }

  /**
   * Update putaway task status
   */
  async updateTaskStatus(id: string, status: PutawayStatus): Promise<PutawayTask> {
    const response = await apiClient.patch<APIResponse<PutawayTask>>(
      `/putaway/${id}/status`,
      { status }
    );
    return response.data;
  }

  /**
   * Get operator's assigned tasks
   */
  async getOperatorTasks(
    operatorUserId: string,
    status?: PutawayStatus
  ): Promise<PutawayTask[]> {
    const response = await apiClient.get<APIResponse<PutawayTask[]>>(
      `/putaway/operator/${operatorUserId}`,
      { status }
    );
    return response.data;
  }

  /**
   * Get pending putaway tasks
   */
  async getPendingTasks(warehouseId?: string): Promise<PutawayTask[]> {
    const response = await apiClient.get<APIResponse<PutawayTask[]>>(
      '/putaway/pending',
      { warehouseId }
    );
    return response.data;
  }

  /**
   * Get high-priority putaway tasks
   */
  async getHighPriorityTasks(warehouseId?: string): Promise<PutawayTask[]> {
    const response = await apiClient.get<APIResponse<PutawayTask[]>>(
      '/putaway/high-priority',
      { warehouseId }
    );
    return response.data;
  }

  /**
   * Get putaway statistics
   */
  async getPutawayStats(warehouseId?: string): Promise<any> {
    const response = await apiClient.get<APIResponse<any>>('/putaway/stats', {
      warehouseId,
    });
    return response.data;
  }

  /**
   * Batch assign tasks to operator
   */
  async batchAssign(
    taskIds: string[],
    operatorUserId: string
  ): Promise<PutawayTask[]> {
    const response = await apiClient.post<APIResponse<PutawayTask[]>>(
      '/putaway/batch-assign',
      { taskIds, operatorUserId }
    );
    return response.data;
  }

  /**
   * Get recommended location for putaway
   */
  async getRecommendedLocation(
    skuId: string,
    quantity: number,
    warehouseId: string
  ): Promise<any> {
    const response = await apiClient.get<APIResponse<any>>(
      '/putaway/recommend-location',
      { skuId, quantity, warehouseId }
    );
    return response.data;
  }
}

export default new PutawayService();
