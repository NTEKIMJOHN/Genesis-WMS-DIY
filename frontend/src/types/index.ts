// ==========================================
// USER & AUTH TYPES
// ==========================================

export type UserRole =
  | 'PLATFORM_ADMIN'
  | 'TENANT_ADMIN'
  | 'WAREHOUSE_MANAGER'
  | 'RECEIVING_SUPERVISOR'
  | 'WAREHOUSE_RECEIVER'
  | 'QA_INSPECTOR'
  | 'BUYER'
  | 'PUTAWAY_OPERATOR';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// ==========================================
// ASN TYPES
// ==========================================

export type ShipmentStatus =
  | 'CREATED'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'RECEIVING'
  | 'COMPLETED'
  | 'CANCELLED';

export type LineStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'RECEIVING'
  | 'COMPLETED'
  | 'VARIANCE'
  | 'REJECTED'
  | 'CORRECTION_NEEDED';

export type VarianceType =
  | 'NONE'
  | 'SHORTAGE'
  | 'OVERAGE'
  | 'DAMAGED'
  | 'WRONG_ITEM'
  | 'MISSING'
  | 'EXPIRED'
  | 'QUALITY_ISSUE'
  | 'TEMPERATURE_VIOLATION'
  | 'MISSING_LABEL';

export interface ASNLine {
  id: string;
  asnId: string;
  lineNumber: number;
  skuId: string;
  skuCode: string;
  productName: string;
  expectedQuantity: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  uom: string;
  batchNumberExpected?: string;
  batchNumberReceived?: string;
  expiryDateExpected?: string;
  expiryDateReceived?: string;
  lpnExpected?: string;
  lpnReceived?: string;
  serialNumbers: string[];
  lineStatus: LineStatus;
  varianceType?: VarianceType;
  varianceReasonCode?: string;
  varianceNotes?: string;
  photoEvidenceUrls: string[];
  qaHold: boolean;
  temperatureReading?: number;
  createdAt: string;
  updatedAt: string;
  receivedAt?: string;
}

export interface ASN {
  id: string;
  tenantId: string;
  warehouseId: string;
  asnNumber: string;
  poNumber?: string;
  supplierId: string;
  supplierName: string;
  carrier?: string;
  trackingNumber?: string;
  expectedArrivalDate: string;
  actualArrivalDate?: string;
  receivingZoneId?: string;
  priority: 'LOW' | 'STANDARD' | 'HIGH' | 'URGENT' | 'CRITICAL';
  shipmentStatus: ShipmentStatus;
  totalExpectedLines: number;
  totalExpectedUnits: number;
  totalReceivedLines: number;
  totalReceivedUnits: number;
  varianceCount: number;
  specialInstructions?: string;
  temperatureControlled: boolean;
  hazmatFlag: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  receivedById?: string;
  receivedAt?: string;
  lines?: ASNLine[];
}

// ==========================================
// BLIND RECEIPT TYPES
// ==========================================

export type BlindReceiptStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED';

export type ItemCondition = 'GOOD' | 'DAMAGED' | 'EXPIRED' | 'UNKNOWN';

export interface BlindReceiptLine {
  id: string;
  blindReceiptId: string;
  lineNumber: number;
  skuId?: string;
  skuCode: string;
  productName: string;
  quantityReceived: number;
  uom: string;
  batchNumber?: string;
  expiryDate?: string;
  lpn?: string;
  serialNumbers: string[];
  condition: ItemCondition;
  temperatureReading?: number;
  qaHold: boolean;
  estimatedUnitCost?: number;
  lineStatus: LineStatus;
  photoEvidenceUrls: string[];
  receiverNotes?: string;
  supervisorNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlindReceipt {
  id: string;
  tenantId: string;
  warehouseId: string;
  receiptNumber: string;
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
  status: BlindReceiptStatus;
  totalLines: number;
  totalUnits: number;
  estimatedValue?: number;
  rejectionReason?: string;
  specialNotes?: string;
  createdById: string;
  createdAt: string;
  submittedById?: string;
  submittedAt?: string;
  reviewedById?: string;
  reviewedAt?: string;
  lines?: BlindReceiptLine[];
}

// ==========================================
// VARIANCE TYPES
// ==========================================

export type VarianceStatus =
  | 'PENDING'
  | 'NEW'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'ESCALATED';

export type ResolutionAction =
  | 'APPROVE_AS_IS'
  | 'ADJUST_QUANTITY'
  | 'REJECT_LINE'
  | 'ESCALATE'
  | 'RETURN_TO_SUPPLIER';

export interface Variance {
  id: string;
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
  photoEvidenceUrls: string[];
  temperatureReading?: number;
  batchNumber?: string;
  expiryDate?: string;
  conditionAssessment: ItemCondition;
  status: VarianceStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  submittedById: string;
  submittedAt: string;
  reviewedById?: string;
  reviewedAt?: string;
  resolutionAction?: ResolutionAction;
  supervisorNotes?: string;
  escalatedToId?: string;
  escalatedAt?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// PUTAWAY TYPES
// ==========================================

export type PutawayStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ON_HOLD';

export interface PutawayTask {
  id: string;
  tenantId: string;
  warehouseId: string;
  taskNumber: string;
  receiptType: 'ASN' | 'BLIND';
  receiptId?: string;
  receiptLineId?: string;
  taskType: 'STANDARD' | 'BATCH' | 'BULK';
  status: PutawayStatus;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  operatorUserId?: string;
  skuId: string;
  skuCode: string;
  productName: string;
  quantityToPutaway: number;
  quantityConfirmed: number;
  batchNumber?: string;
  expiryDate?: string;
  lpn?: string;
  serialNumbers: string[];
  sourceLocationId: string;
  sourceLocationCode: string;
  destinationLocationId?: string;
  destinationLocationCode?: string;
  destinationZoneId?: string;
  putawayStrategy: string;
  estimatedDurationMinutes?: number;
  actualDurationMinutes?: number;
  distanceMeters?: number;
  specialHandling?: any;
  assignedAt?: string;
  startedAt?: string;
  completedAt?: string;
  operatorNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// LPN TYPES
// ==========================================

export type LPNStatus =
  | 'RECEIVING'
  | 'AVAILABLE'
  | 'ALLOCATED'
  | 'PICKED'
  | 'SHIPPED'
  | 'CONSUMED'
  | 'ARCHIVED';

export interface LPNContent {
  id: string;
  lpnId: string;
  skuId: string;
  quantity: number;
  batchNumber?: string;
  expiryDate?: string;
  serialNumbers: string[];
  addedAt: string;
  removedAt?: string;
}

export interface LPN {
  id: string;
  tenantId: string;
  warehouseId: string;
  lpnCode: string;
  lpnType: 'PALLET' | 'CARTON' | 'TOTE' | 'OTHER';
  status: LPNStatus;
  parentLpnId?: string;
  currentLocationId?: string;
  currentZoneId?: string;
  totalUnits: number;
  totalWeightKg?: number;
  totalVolumeM3?: number;
  dimensions?: any;
  isMixedSku: boolean;
  containsBatchTracked: boolean;
  containsSerialized: boolean;
  containsTemperatureControlled: boolean;
  containsHazmat: boolean;
  createdById: string;
  createdAt: string;
  lastMovedById?: string;
  lastMovedAt?: string;
  updatedAt: string;
  contents?: LPNContent[];
}

// ==========================================
// API RESPONSE TYPES
// ==========================================

export interface APIResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface APIError {
  success: false;
  error: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

// ==========================================
// DASHBOARD & STATISTICS TYPES
// ==========================================

export interface VarianceStatistics {
  total: number;
  byStatus: {
    pending: number;
    underReview: number;
    approved: number;
    rejected: number;
    escalated: number;
  };
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  totalVarianceValue: number;
  avgResolutionTimeHours: number;
}

export interface DashboardMetrics {
  receivingAccuracyRate: number;
  varianceRate: number;
  avgReceiptProcessingTime: number;
  avgPutawayCompletionTime: number;
  todayReceipts: number;
  pendingVariances: number;
  pendingPutawayTasks: number;
  pendingBlindReceipts: number;
}
