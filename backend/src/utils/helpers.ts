import { Decimal } from '@prisma/client/runtime/library';

/**
 * Generate unique sequential number based on prefix and date
 * @param prefix - Prefix for the number (e.g., 'ASN', 'BR', 'PA')
 * @param lastNumber - Last generated number (optional)
 * @returns Generated unique number
 */
export const generateSequentialNumber = (
  prefix: string,
  lastNumber?: string
): string => {
  const today = new Date();
  const year = today.getFullYear();
  const dateStr = `${year}`;

  if (lastNumber) {
    const match = lastNumber.match(/-(\d+)$/);
    if (match) {
      const lastSeq = parseInt(match[1], 10);
      const newSeq = (lastSeq + 1).toString().padStart(4, '0');
      return `${prefix}-${dateStr}-${newSeq}`;
    }
  }

  return `${prefix}-${dateStr}-0001`;
};

/**
 * Calculate variance percentage
 * @param expected - Expected quantity
 * @param received - Received quantity
 * @returns Variance percentage
 */
export const calculateVariancePercentage = (
  expected: number | Decimal,
  received: number | Decimal
): number => {
  const exp = typeof expected === 'number' ? expected : expected.toNumber();
  const rec = typeof received === 'number' ? received : received.toNumber();

  if (exp === 0) return 0;
  return ((rec - exp) / exp) * 100;
};

/**
 * Calculate variance quantity
 * @param expected - Expected quantity
 * @param received - Received quantity
 * @returns Variance quantity
 */
export const calculateVarianceQuantity = (
  expected: number | Decimal,
  received: number | Decimal
): number => {
  const exp = typeof expected === 'number' ? expected : expected.toNumber();
  const rec = typeof received === 'number' ? received : received.toNumber();

  return rec - exp;
};

/**
 * Determine variance priority based on percentage and value
 * @param variancePercentage - Variance percentage
 * @param varianceValue - Variance value in currency
 * @returns Priority level
 */
export const determineVariancePriority = (
  variancePercentage: number,
  varianceValue: number
): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' => {
  const absPercentage = Math.abs(variancePercentage);
  const absValue = Math.abs(varianceValue);

  if (absValue > 5000 || absPercentage > 20) return 'CRITICAL';
  if (absValue > 500 || absPercentage > 10) return 'HIGH';
  if (absValue > 100 || absPercentage > 2) return 'MEDIUM';
  return 'LOW';
};

/**
 * Check if variance requires supervisor approval
 * @param variancePercentage - Variance percentage
 * @param varianceValue - Variance value in currency
 * @returns True if supervisor approval required
 */
export const requiresSupervisorApproval = (
  variancePercentage: number,
  varianceValue: number
): boolean => {
  const absPercentage = Math.abs(variancePercentage);
  const absValue = Math.abs(varianceValue);

  const autoApprovePercentage = parseFloat(
    process.env.VARIANCE_AUTO_APPROVE_PERCENTAGE || '2'
  );
  const autoApproveValue = parseFloat(
    process.env.VARIANCE_AUTO_APPROVE_VALUE || '100'
  );

  return absPercentage >= autoApprovePercentage || absValue >= autoApproveValue;
};

/**
 * Check if variance requires manager approval
 * @param variancePercentage - Variance percentage
 * @param varianceValue - Variance value in currency
 * @returns True if manager approval required
 */
export const requiresManagerApproval = (
  variancePercentage: number,
  varianceValue: number
): boolean => {
  const absPercentage = Math.abs(variancePercentage);
  const absValue = Math.abs(varianceValue);

  const managerApprovalPercentage = parseFloat(
    process.env.VARIANCE_SUPERVISOR_REVIEW_PERCENTAGE || '10'
  );
  const managerApprovalValue = parseFloat(
    process.env.VARIANCE_MANAGER_APPROVAL_VALUE || '500'
  );

  return (
    absPercentage > managerApprovalPercentage || absValue > managerApprovalValue
  );
};

/**
 * Format date to YYYY-MM-DD
 * @param date - Date to format
 * @returns Formatted date string
 */
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Parse date from string
 * @param dateStr - Date string
 * @returns Date object
 */
export const parseDate = (dateStr: string): Date => {
  return new Date(dateStr);
};

/**
 * Calculate bin utilization percentage
 * @param currentCapacity - Current capacity used
 * @param maxCapacity - Maximum capacity
 * @returns Utilization percentage
 */
export const calculateBinUtilization = (
  currentCapacity: number | Decimal,
  maxCapacity: number | Decimal
): number => {
  const current =
    typeof currentCapacity === 'number'
      ? currentCapacity
      : currentCapacity.toNumber();
  const max =
    typeof maxCapacity === 'number' ? maxCapacity : maxCapacity.toNumber();

  if (max === 0) return 0;
  return (current / max) * 100;
};

/**
 * Validate expiry date
 * @param expiryDate - Expiry date to validate
 * @returns True if valid (future date)
 */
export const isValidExpiryDate = (expiryDate: Date): boolean => {
  return expiryDate > new Date();
};

/**
 * Calculate days until expiry
 * @param expiryDate - Expiry date
 * @returns Days until expiry
 */
export const daysUntilExpiry = (expiryDate: Date): number => {
  const today = new Date();
  const diffTime = expiryDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Generate LPN code
 * @param warehouseCode - Warehouse code
 * @param sequence - Sequence number
 * @returns LPN code
 */
export const generateLPNCode = (
  warehouseCode: string,
  sequence: number
): string => {
  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const seq = sequence.toString().padStart(4, '0');
  return `LPN-${warehouseCode}-${timestamp}-${seq}`;
};

/**
 * Sanitize filename for safe storage
 * @param filename - Original filename
 * @returns Sanitized filename
 */
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-z0-9.-]/gi, '_')
    .toLowerCase()
    .substring(0, 255);
};

/**
 * Calculate estimated putaway duration based on distance and quantity
 * @param distanceMeters - Distance in meters
 * @param quantity - Quantity to putaway
 * @returns Estimated duration in minutes
 */
export const calculatePutawayDuration = (
  distanceMeters: number,
  quantity: number
): number => {
  // Base time: 3 minutes per 100 meters walking
  // Plus: 2 minutes per 10 units handling
  const walkingTime = (distanceMeters / 100) * 3;
  const handlingTime = (quantity / 10) * 2;

  return Math.ceil(walkingTime + handlingTime);
};
