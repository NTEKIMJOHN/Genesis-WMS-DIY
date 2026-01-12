import { z } from 'zod';

// ==========================================
// AUTH SCHEMAS
// ==========================================

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum([
    'PLATFORM_ADMIN',
    'TENANT_ADMIN',
    'WAREHOUSE_MANAGER',
    'RECEIVING_SUPERVISOR',
    'WAREHOUSE_RECEIVER',
    'QA_INSPECTOR',
    'BUYER',
    'PUTAWAY_OPERATOR',
  ]),
  tenantId: z.string().uuid('Invalid tenant ID'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

// ==========================================
// ASN SCHEMAS
// ==========================================

export const createASNLineSchema = z.object({
  lineNumber: z.number().int().positive(),
  skuId: z.string().uuid(),
  skuCode: z.string(),
  productName: z.string(),
  expectedQuantity: z.number().positive(),
  uom: z.string(),
  batchNumberExpected: z.string().optional(),
  expiryDateExpected: z.string().datetime().optional(),
  lpnExpected: z.string().optional(),
});

export const createASNSchema = z.object({
  tenantId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  poNumber: z.string().optional(),
  supplierId: z.string().uuid(),
  supplierName: z.string(),
  carrier: z.string().optional(),
  trackingNumber: z.string().optional(),
  expectedArrivalDate: z.string().datetime(),
  receivingZoneId: z.string().uuid().optional(),
  priority: z.enum(['LOW', 'STANDARD', 'HIGH', 'URGENT', 'CRITICAL']).optional(),
  specialInstructions: z.string().optional(),
  temperatureControlled: z.boolean().optional(),
  hazmatFlag: z.boolean().optional(),
  lines: z.array(createASNLineSchema).min(1, 'At least one line item is required'),
});

export const receiveASNLineSchema = z.object({
  receivedQuantity: z.number().nonnegative(),
  batchNumberReceived: z.string().optional(),
  expiryDateReceived: z.string().datetime().optional(),
  lpnReceived: z.string().optional(),
  serialNumbers: z.array(z.string()).optional(),
  temperatureReading: z.number().optional(),
  weight: z.number().optional(),
  dimensions: z.any().optional(),
  qaHold: z.boolean().optional(),
  photoEvidenceUrls: z.array(z.string().url()).optional(),
  varianceNotes: z.string().optional(),
});

export const updateASNStatusSchema = z.object({
  status: z.enum(['CREATED', 'IN_TRANSIT', 'ARRIVED', 'RECEIVING', 'COMPLETED', 'CANCELLED']),
  actualArrivalDate: z.string().datetime().optional(),
});

// ==========================================
// BLIND RECEIPT SCHEMAS
// ==========================================

export const createBlindReceiptSchema = z.object({
  tenantId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  receiptType: z.enum(['UNPLANNED_DELIVERY', 'SAMPLE', 'RETURN', 'OTHER']).optional(),
  supplierName: z.string(),
  supplierContact: z.string().optional(),
  carrier: z.string().optional(),
  driverName: z.string().optional(),
  vehicleId: z.string().optional(),
  arrivalDate: z.string().datetime(),
  arrivalTime: z.string().datetime(),
  receivingZoneId: z.string().uuid().optional(),
  priority: z.enum(['LOW', 'STANDARD', 'HIGH', 'URGENT']).optional(),
  specialNotes: z.string().optional(),
});

export const addBlindReceiptLineSchema = z.object({
  lineNumber: z.number().int().positive(),
  skuId: z.string().uuid().optional(),
  skuCode: z.string(),
  productName: z.string(),
  quantityReceived: z.number().positive(),
  uom: z.string(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().datetime().optional(),
  lpn: z.string().optional(),
  serialNumbers: z.array(z.string()).optional(),
  condition: z.enum(['GOOD', 'DAMAGED', 'EXPIRED', 'UNKNOWN']).optional(),
  temperatureReading: z.number().optional(),
  qaHold: z.boolean().optional(),
  estimatedUnitCost: z.number().optional(),
  photoEvidenceUrls: z.array(z.string().url()).optional(),
  receiverNotes: z.string().optional(),
});

export const updateBlindReceiptLineSchema = addBlindReceiptLineSchema.partial();

export const approveBlindReceiptSchema = z.object({
  supervisorNotes: z.string().optional(),
});

export const rejectBlindReceiptSchema = z.object({
  rejectionReason: z.string().min(1, 'Rejection reason is required'),
});

// ==========================================
// VARIANCE SCHEMAS
// ==========================================

export const resolveVarianceSchema = z.object({
  resolutionAction: z.enum([
    'APPROVE_AS_IS',
    'ADJUST_QUANTITY',
    'REJECT_LINE',
    'ESCALATE',
    'RETURN_TO_SUPPLIER',
  ]),
  supervisorNotes: z.string().min(1, 'Supervisor notes are required'),
  adjustedQuantity: z.number().nonnegative().optional(),
});

export const rejectVarianceSchema = z.object({
  supervisorNotes: z.string().min(1, 'Supervisor notes are required'),
});

export const escalateVarianceSchema = z.object({
  escalatedToId: z.string().uuid(),
  escalationNotes: z.string().min(1, 'Escalation notes are required'),
});

// ==========================================
// PUTAWAY SCHEMAS
// ==========================================

export const createPutawayTasksSchema = z.object({
  tenantId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  receiptType: z.enum(['ASN', 'BLIND']),
  receiptId: z.string().uuid(),
  sourceLocationId: z.string().uuid(),
  items: z.array(
    z.object({
      skuId: z.string().uuid(),
      quantity: z.number().positive(),
      batchNumber: z.string().optional(),
      expiryDate: z.string().datetime().optional(),
      lpn: z.string().optional(),
      serialNumbers: z.array(z.string()).optional(),
    })
  ).min(1, 'At least one item is required'),
});

export const assignPutawayTaskSchema = z.object({
  operatorUserId: z.string().uuid(),
});

export const completePutawayTaskSchema = z.object({
  actualQuantity: z.number().nonnegative().optional(),
  operatorNotes: z.string().optional(),
});

// ==========================================
// LPN SCHEMAS
// ==========================================

export const createLPNSchema = z.object({
  tenantId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  lpnType: z.enum(['PALLET', 'CARTON', 'TOTE', 'OTHER']).optional(),
  currentLocationId: z.string().uuid().optional(),
  items: z.array(
    z.object({
      skuId: z.string().uuid(),
      quantity: z.number().positive(),
      batchNumber: z.string().optional(),
      expiryDate: z.string().datetime().optional(),
      serialNumbers: z.array(z.string()).optional(),
    })
  ).min(1, 'At least one item is required'),
});

export const moveLPNSchema = z.object({
  destinationLocationId: z.string().uuid(),
});

export const splitLPNSchema = z.object({
  items: z.array(
    z.object({
      skuId: z.string().uuid(),
      quantity: z.number().positive(),
    })
  ).min(1, 'At least one item is required'),
});

// ==========================================
// QUERY SCHEMAS
// ==========================================

export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export const dateRangeSchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export const asnQuerySchema = paginationSchema.merge(dateRangeSchema).extend({
  warehouseId: z.string().uuid().optional(),
  status: z.enum(['CREATED', 'IN_TRANSIT', 'ARRIVED', 'RECEIVING', 'COMPLETED', 'CANCELLED']).optional(),
  supplierId: z.string().uuid().optional(),
});

export const blindReceiptQuerySchema = paginationSchema.merge(dateRangeSchema).extend({
  warehouseId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED']).optional(),
});

export const varianceQuerySchema = paginationSchema.merge(dateRangeSchema).extend({
  warehouseId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'NEW', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ESCALATED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  varianceType: z.enum([
    'NONE',
    'SHORTAGE',
    'OVERAGE',
    'DAMAGED',
    'WRONG_ITEM',
    'MISSING',
    'EXPIRED',
    'QUALITY_ISSUE',
    'TEMPERATURE_VIOLATION',
    'MISSING_LABEL',
  ]).optional(),
});

export const putawayQuerySchema = paginationSchema.extend({
  warehouseId: z.string().uuid().optional(),
  operatorUserId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD']).optional(),
});

export const lpnQuerySchema = paginationSchema.extend({
  warehouseId: z.string().uuid().optional(),
  status: z.enum(['RECEIVING', 'AVAILABLE', 'ALLOCATED', 'PICKED', 'SHIPPED', 'CONSUMED', 'ARCHIVED']).optional(),
});
