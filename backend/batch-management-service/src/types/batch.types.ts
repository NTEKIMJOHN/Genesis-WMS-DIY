export enum BatchStatus {
  QUARANTINE = 'quarantine',
  ACTIVE = 'active',
  NEAR_EXPIRY = 'near_expiry',
  EXPIRED = 'expired',
  ON_HOLD = 'on_hold',
  DISPOSED = 'disposed'
}

export enum QAStatus {
  PENDING = 'pending',
  PASSED = 'passed',
  FAILED = 'failed',
  CONDITIONAL = 'conditional'
}

export interface Batch {
  id: string;
  tenant_id: string;
  sku_id: string;
  batch_number: string;
  warehouse_id: string;
  quantity_received: number;
  quantity_available: number;
  quantity_reserved: number;
  quantity_damaged: number;
  manufacturing_date: Date | null;
  expiry_date: Date | null;
  received_date: Date;
  status: BatchStatus;
  qa_status: QAStatus;
  qa_notes: string | null;
  parent_batch_id: string | null;
  supplier_batch_reference: string | null;
  po_number: string | null;
  grn_number: string | null;
  attributes: Record<string, any> | null;
  temperature_controlled: boolean;
  min_temperature: number | null;
  max_temperature: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface FEFOAllocation {
  batch_id: string;
  batch_number: string;
  expiry_date: Date | null;
  quantity_available: number;
  allocated_quantity: number;
  warehouse_id: string;
  fefo_priority: number;
}

export interface BatchExpiryAlert {
  batch_id: string;
  batch_number: string;
  sku_id: string;
  sku_code: string;
  warehouse_id: string;
  expiry_date: Date;
  days_until_expiry: number;
  quantity_available: number;
  alert_level: 'warning' | 'critical' | 'emergency';
}

export interface BatchAllocationRequest {
  sku_id: string;
  warehouse_id: string;
  requested_quantity: number;
  exclude_batch_ids?: string[];
  prefer_batch_ids?: string[];
  enforce_fefo?: boolean;
}

export interface BatchAllocationResult {
  allocations: FEFOAllocation[];
  total_allocated: number;
  total_requested: number;
  fully_allocated: boolean;
  warnings: string[];
}
