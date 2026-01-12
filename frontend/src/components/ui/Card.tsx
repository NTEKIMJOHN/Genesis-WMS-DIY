import React from 'react';
import { cn } from '../../utils/helpers';

// ==========================================
// CARD COMPONENT
// ==========================================

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  children,
  padding = 'md',
  hover = false,
  ...props
}) => {
  const paddingSizes = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-gray-200 shadow-sm',
        paddingSizes[padding],
        hover && 'hover:shadow-md transition-shadow cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// ==========================================
// CARD HEADER
// ==========================================

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  className,
  title,
  subtitle,
  action,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'border-b border-gray-200 pb-3 mb-4',
        className
      )}
      {...props}
    >
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
            )}
          </div>
          {action && <div className="ml-4">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

// ==========================================
// CARD BODY
// ==========================================

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardBody: React.FC<CardBodyProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  );
};

// ==========================================
// CARD FOOTER
// ==========================================

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardFooter: React.FC<CardFooterProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'border-t border-gray-200 pt-3 mt-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
