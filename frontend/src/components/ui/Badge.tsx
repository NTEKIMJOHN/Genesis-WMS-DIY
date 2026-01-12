import React from 'react';
import { cn, getStatusColor } from '../../utils/helpers';

// ==========================================
// BADGE COMPONENT
// ==========================================

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'danger' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  status?: string; // Will use getStatusColor helper
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  status,
  ...props
}) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-primary-100 text-primary-800',
    success: 'bg-success-100 text-success-800',
    danger: 'bg-danger-100 text-danger-800',
    warning: 'bg-warning-100 text-warning-800',
    info: 'bg-blue-100 text-blue-800',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base',
  };

  // If status is provided, use the status color
  const colorClass = status ? getStatusColor(status) : variants[variant];

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        sizes[size],
        colorClass,
        className
      )}
      {...props}
    >
      {dot && (
        <span className="mr-1.5 h-2 w-2 rounded-full bg-current opacity-75" />
      )}
      {children}
    </span>
  );
};

// ==========================================
// STATUS BADGE
// ==========================================

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  dot = false,
  ...props
}) => {
  return (
    <Badge status={status} size={size} dot={dot} {...props}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
};
