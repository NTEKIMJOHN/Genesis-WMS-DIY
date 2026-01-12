import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ==========================================
// UTILITY HELPERS
// ==========================================

/**
 * Merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date to locale string
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', options || {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date and time
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

/**
 * Truncate text
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Generate random ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Get status color class
 */
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    // ASN statuses
    CREATED: 'bg-gray-100 text-gray-800',
    IN_TRANSIT: 'bg-blue-100 text-blue-800',
    ARRIVED: 'bg-yellow-100 text-yellow-800',
    RECEIVING: 'bg-purple-100 text-purple-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',

    // Line statuses
    DRAFT: 'bg-gray-100 text-gray-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    VARIANCE: 'bg-orange-100 text-orange-800',
    REJECTED: 'bg-red-100 text-red-800',
    CORRECTION_NEEDED: 'bg-orange-100 text-orange-800',

    // Variance statuses
    NEW: 'bg-blue-100 text-blue-800',
    UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    ESCALATED: 'bg-red-100 text-red-800',

    // Putaway statuses
    ASSIGNED: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-purple-100 text-purple-800',
    ON_HOLD: 'bg-orange-100 text-orange-800',

    // LPN statuses
    AVAILABLE: 'bg-green-100 text-green-800',
    ALLOCATED: 'bg-yellow-100 text-yellow-800',
    PICKED: 'bg-blue-100 text-blue-800',
    SHIPPED: 'bg-gray-100 text-gray-800',
    CONSUMED: 'bg-gray-100 text-gray-800',
    ARCHIVED: 'bg-gray-100 text-gray-800',

    // Priority statuses
    LOW: 'bg-gray-100 text-gray-800',
    STANDARD: 'bg-blue-100 text-blue-800',
    NORMAL: 'bg-blue-100 text-blue-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HIGH: 'bg-orange-100 text-orange-800',
    URGENT: 'bg-red-100 text-red-800',
    CRITICAL: 'bg-red-100 text-red-800',
  };

  return statusColors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Get priority icon
 */
export function getPriorityIcon(priority: string): string {
  const icons: Record<string, string> = {
    LOW: '⬇️',
    STANDARD: '➡️',
    NORMAL: '➡️',
    MEDIUM: '⬆️',
    HIGH: '⬆️',
    URGENT: '🔥',
    CRITICAL: '🔥',
  };

  return icons[priority] || '➡️';
}
