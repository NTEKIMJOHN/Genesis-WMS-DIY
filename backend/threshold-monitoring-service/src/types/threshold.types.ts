export enum AlertSeverity {
  WARNING = 'warning',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

export enum AlertType {
  LOW_STOCK = 'low_stock',
  CRITICAL_STOCK = 'critical_stock',
  OUT_OF_STOCK = 'out_of_stock',
  OVERSTOCK = 'overstock',
  VELOCITY_ANOMALY = 'velocity_anomaly'
}

export interface InventoryThreshold {
  id: string;
  tenant_id: string;
  sku_id: string;
  warehouse_id: string;
  min_quantity: number;
  max_quantity: number;
  safety_stock: number;
  reorder_point: number;
  reorder_quantity: number;
  velocity_based: boolean;
  velocity_multiplier: number;
  created_at: Date;
  updated_at: Date;
}

export interface VelocityMetrics {
  sku_id: string;
  warehouse_id: string;
  daily_average: number;
  weekly_average: number;
  monthly_average: number;
  velocity_trend: 'increasing' | 'stable' | 'decreasing';
  days_of_stock: number;
  stockout_risk_score: number;
  data_points: number;
  last_calculated: Date;
}

export interface ThresholdAlert {
  id: string;
  tenant_id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  sku_id: string;
  warehouse_id: string;
  current_quantity: number;
  threshold_quantity: number;
  velocity_data: VelocityMetrics | null;
  message: string;
  channels: string[];
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledged_by: string | null;
  acknowledged_at: Date | null;
  resolved_at: Date | null;
  metadata: Record<string, any> | null;
  created_at: Date;
}

export interface ThresholdViolation {
  sku_id: string;
  sku_code: string;
  sku_name: string;
  warehouse_id: string;
  warehouse_name: string;
  current_quantity: number;
  min_quantity: number;
  max_quantity: number;
  safety_stock: number;
  reorder_point: number;
  alert_type: AlertType;
  severity: AlertSeverity;
  velocity_metrics: VelocityMetrics | null;
  recommended_action: string;
}
