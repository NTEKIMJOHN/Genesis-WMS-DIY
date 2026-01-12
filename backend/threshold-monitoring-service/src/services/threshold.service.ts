import cron from 'node-cron';
import { query, getClient } from '../config/database';
import { cacheGet, cacheSet, cacheDel } from '../config/redis';
import { publishMessage } from '../config/rabbitmq';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { notificationService, NotificationChannel, NotificationSeverity } from './notification.service';
import {
  InventoryThreshold,
  VelocityMetrics,
  ThresholdAlert,
  ThresholdViolation,
  AlertType,
  AlertSeverity
} from '../types/threshold.types';

const CACHE_TTL_HOT = parseInt(process.env.CACHE_TTL_HOT || '300');
const CACHE_TTL_WARM = parseInt(process.env.CACHE_TTL_WARM || '1800');
const VELOCITY_LOOKBACK_DAYS = parseInt(process.env.VELOCITY_LOOKBACK_DAYS || '7');
const VELOCITY_MIN_SAMPLES = parseInt(process.env.VELOCITY_MIN_SAMPLES || '3');

export class ThresholdMonitoringService {
  private cronJob: cron.ScheduledTask | null = null;

  /**
   * Start the threshold monitoring cron job
   */
  start(): void {
    const cronSchedule = process.env.THRESHOLD_CHECK_CRON || '0 */2 * * *'; // Every 2 hours by default

    this.cronJob = cron.schedule(cronSchedule, async () => {
      logger.info('Running scheduled threshold monitoring check');
      await this.checkAllThresholds();
    });

    logger.info(`Threshold monitoring service started with schedule: ${cronSchedule}`);
  }

  /**
   * Stop the threshold monitoring cron job
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('Threshold monitoring service stopped');
    }
  }

  /**
   * Calculate inventory velocity metrics
   */
  async calculateVelocity(
    tenantId: string,
    skuId: string,
    warehouseId: string,
    lookbackDays: number = VELOCITY_LOOKBACK_DAYS
  ): Promise<VelocityMetrics | null> {
    const cacheKey = `velocity:${tenantId}:${skuId}:${warehouseId}`;
    const cached = await cacheGet(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Query inventory movements to calculate velocity
    const result = await query(
      `
      WITH daily_movements AS (
        SELECT
          DATE(created_at) as movement_date,
          SUM(CASE
            WHEN movement_type IN ('sale', 'shipment', 'adjustment_decrease', 'damage')
            THEN ABS(quantity_change)
            ELSE 0
          END) as daily_outbound
        FROM inventory_movements
        WHERE tenant_id = $1
          AND sku_id = $2
          AND warehouse_id = $3
          AND created_at >= CURRENT_DATE - INTERVAL '1 day' * $4
        GROUP BY DATE(created_at)
        HAVING SUM(CASE
          WHEN movement_type IN ('sale', 'shipment', 'adjustment_decrease', 'damage')
          THEN ABS(quantity_change)
          ELSE 0
        END) > 0
      ),
      velocity_stats AS (
        SELECT
          AVG(daily_outbound) as daily_avg,
          AVG(daily_outbound) * 7 as weekly_avg,
          AVG(daily_outbound) * 30 as monthly_avg,
          COUNT(*) as data_points,
          STDDEV(daily_outbound) as std_dev,
          CASE
            WHEN COUNT(*) >= 2 THEN
              REGR_SLOPE(daily_outbound, EXTRACT(EPOCH FROM movement_date))
            ELSE 0
          END as trend_slope
        FROM daily_movements
      )
      SELECT
        vs.daily_avg,
        vs.weekly_avg,
        vs.monthly_avg,
        vs.data_points,
        vs.std_dev,
        vs.trend_slope,
        i.qty_available,
        CASE
          WHEN vs.daily_avg > 0 THEN i.qty_available / vs.daily_avg
          ELSE 999999
        END as days_of_stock
      FROM velocity_stats vs
      CROSS JOIN inventory i
      WHERE i.tenant_id = $1
        AND i.sku_id = $2
        AND i.warehouse_id = $3
      `,
      [tenantId, skuId, warehouseId, lookbackDays]
    );

    if (result.rows.length === 0 || result.rows[0].data_points < VELOCITY_MIN_SAMPLES) {
      logger.debug('Insufficient data for velocity calculation', {
        tenantId,
        skuId,
        warehouseId,
        dataPoints: result.rows[0]?.data_points || 0
      });
      return null;
    }

    const row = result.rows[0];

    // Determine velocity trend
    let velocityTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (row.trend_slope > 0.1) {
      velocityTrend = 'increasing';
    } else if (row.trend_slope < -0.1) {
      velocityTrend = 'decreasing';
    }

    // Calculate stockout risk score (0-100)
    const daysOfStock = parseFloat(row.days_of_stock);
    let stockoutRiskScore = 0;

    if (daysOfStock < 3) {
      stockoutRiskScore = 90;
    } else if (daysOfStock < 7) {
      stockoutRiskScore = 60;
    } else if (daysOfStock < 14) {
      stockoutRiskScore = 30;
    } else if (daysOfStock < 30) {
      stockoutRiskScore = 10;
    }

    // Adjust risk based on velocity trend
    if (velocityTrend === 'increasing') {
      stockoutRiskScore = Math.min(100, stockoutRiskScore + 15);
    } else if (velocityTrend === 'decreasing') {
      stockoutRiskScore = Math.max(0, stockoutRiskScore - 10);
    }

    const velocityMetrics: VelocityMetrics = {
      sku_id: skuId,
      warehouse_id: warehouseId,
      daily_average: parseFloat(row.daily_avg) || 0,
      weekly_average: parseFloat(row.weekly_avg) || 0,
      monthly_average: parseFloat(row.monthly_avg) || 0,
      velocity_trend: velocityTrend,
      days_of_stock: daysOfStock,
      stockout_risk_score: stockoutRiskScore,
      data_points: parseInt(row.data_points),
      last_calculated: new Date()
    };

    // Cache for 30 minutes
    await cacheSet(cacheKey, JSON.stringify(velocityMetrics), CACHE_TTL_WARM);

    return velocityMetrics;
  }

  /**
   * Check all thresholds across all tenants
   */
  async checkAllThresholds(): Promise<void> {
    try {
      // Get all active tenants
      const tenantsResult = await query(
        'SELECT id FROM tenants WHERE status = $1',
        ['active']
      );

      const tenants = tenantsResult.rows;

      logger.info(`Checking thresholds for ${tenants.length} tenants`);

      for (const tenant of tenants) {
        await this.checkThresholdsForTenant(tenant.id);
      }

      logger.info('Threshold monitoring check completed');
    } catch (error) {
      logger.error('Error checking thresholds:', error);
      throw error;
    }
  }

  /**
   * Check thresholds for a specific tenant
   */
  async checkThresholdsForTenant(tenantId: string): Promise<ThresholdViolation[]> {
    try {
      // Get all inventory items with their thresholds
      const result = await query(
        `
        SELECT
          i.sku_id,
          s.code as sku_code,
          s.name as sku_name,
          i.warehouse_id,
          w.name as warehouse_name,
          i.qty_available as current_quantity,
          it.min_quantity,
          it.max_quantity,
          it.safety_stock,
          it.reorder_point,
          it.velocity_based,
          it.velocity_multiplier
        FROM inventory i
        JOIN skus s ON i.sku_id = s.id
        JOIN warehouses w ON i.warehouse_id = w.id
        LEFT JOIN inventory_thresholds it ON
          it.sku_id = i.sku_id AND
          it.warehouse_id = i.warehouse_id AND
          it.tenant_id = i.tenant_id
        WHERE i.tenant_id = $1
          AND (
            it.id IS NOT NULL OR
            s.min_quantity IS NOT NULL OR
            s.max_quantity IS NOT NULL
          )
        ORDER BY i.qty_available ASC
        `,
        [tenantId]
      );

      const violations: ThresholdViolation[] = [];

      for (const row of result.rows) {
        // Calculate velocity if velocity-based thresholds are enabled
        let velocityMetrics: VelocityMetrics | null = null;
        if (row.velocity_based) {
          velocityMetrics = await this.calculateVelocity(
            tenantId,
            row.sku_id,
            row.warehouse_id
          );
        }

        // Determine effective thresholds
        const minQty = row.min_quantity || 0;
        const maxQty = row.max_quantity || Number.MAX_SAFE_INTEGER;
        const safetyStock = row.safety_stock || minQty;
        const reorderPoint = row.reorder_point || safetyStock;

        // Adjust thresholds based on velocity
        let effectiveReorderPoint = reorderPoint;
        if (velocityMetrics && row.velocity_based) {
          const velocityAdjustment = velocityMetrics.daily_average * (row.velocity_multiplier || 1.5);
          effectiveReorderPoint = Math.max(reorderPoint, velocityAdjustment);
        }

        // Check for violations
        const currentQty = row.current_quantity;
        let alertType: AlertType | null = null;
        let severity: AlertSeverity | null = null;
        let recommendedAction = '';

        if (currentQty === 0) {
          alertType = AlertType.OUT_OF_STOCK;
          severity = AlertSeverity.EMERGENCY;
          recommendedAction = 'URGENT: Initiate emergency procurement or transfer from another warehouse';
        } else if (currentQty < safetyStock) {
          alertType = AlertType.CRITICAL_STOCK;
          severity = AlertSeverity.CRITICAL;
          recommendedAction = `Current stock is below safety level. Immediate reorder recommended (${Math.ceil(effectiveReorderPoint - currentQty)} units)`;
        } else if (currentQty < effectiveReorderPoint) {
          alertType = AlertType.LOW_STOCK;
          severity = AlertSeverity.WARNING;
          recommendedAction = `Stock approaching reorder point. Plan procurement (${Math.ceil(effectiveReorderPoint - currentQty)} units)`;
        } else if (currentQty > maxQty && maxQty < Number.MAX_SAFE_INTEGER) {
          alertType = AlertType.OVERSTOCK;
          severity = AlertSeverity.WARNING;
          recommendedAction = `Overstock detected. Consider redistribution or promotions (${currentQty - maxQty} excess units)`;
        }

        // Check for velocity anomalies
        if (velocityMetrics && velocityMetrics.stockout_risk_score > 70) {
          if (severity === null || severity === AlertSeverity.WARNING) {
            alertType = AlertType.VELOCITY_ANOMALY;
            severity = AlertSeverity.CRITICAL;
            recommendedAction = `High stockout risk based on velocity (${velocityMetrics.days_of_stock.toFixed(1)} days of stock remaining at current consumption rate)`;
          }
        }

        if (alertType && severity) {
          const violation: ThresholdViolation = {
            sku_id: row.sku_id,
            sku_code: row.sku_code,
            sku_name: row.sku_name,
            warehouse_id: row.warehouse_id,
            warehouse_name: row.warehouse_name,
            current_quantity: currentQty,
            min_quantity: minQty,
            max_quantity: maxQty,
            safety_stock: safetyStock,
            reorder_point: effectiveReorderPoint,
            alert_type: alertType,
            severity: severity,
            velocity_metrics: velocityMetrics,
            recommended_action: recommendedAction
          };

          violations.push(violation);

          // Create alert and send notifications
          await this.createAlert(tenantId, violation);
        }
      }

      if (violations.length > 0) {
        logger.info(`Found ${violations.length} threshold violations for tenant ${tenantId}`);
      }

      return violations;
    } catch (error) {
      logger.error(`Error checking thresholds for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Create threshold alert and send notifications
   */
  private async createAlert(
    tenantId: string,
    violation: ThresholdViolation
  ): Promise<void> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Check if alert already exists and is active
      const existingAlert = await client.query(
        `
        SELECT id FROM inventory_alerts
        WHERE tenant_id = $1
          AND sku_id = $2
          AND warehouse_id = $3
          AND alert_type = $4
          AND status = 'active'
          AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
        `,
        [tenantId, violation.sku_id, violation.warehouse_id, violation.alert_type]
      );

      if (existingAlert.rows.length > 0) {
        await client.query('ROLLBACK');
        return; // Don't create duplicate alerts
      }

      // Determine notification channels based on severity
      const channels = [NotificationChannel.IN_APP];
      if (violation.severity === AlertSeverity.CRITICAL || violation.severity === AlertSeverity.EMERGENCY) {
        channels.push(NotificationChannel.EMAIL);
      }
      if (violation.severity === AlertSeverity.EMERGENCY) {
        channels.push(NotificationChannel.SMS);
      }

      // Create alert in database
      const alertResult = await client.query(
        `
        INSERT INTO inventory_alerts (
          tenant_id, alert_type, severity, sku_id, warehouse_id,
          message, channels, status, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
        `,
        [
          tenantId,
          violation.alert_type,
          violation.severity,
          violation.sku_id,
          violation.warehouse_id,
          `${violation.alert_type.toUpperCase()}: ${violation.sku_code} at ${violation.warehouse_name}`,
          JSON.stringify(channels),
          'active',
          JSON.stringify({
            current_quantity: violation.current_quantity,
            threshold_quantity: violation.reorder_point,
            velocity_metrics: violation.velocity_metrics,
            recommended_action: violation.recommended_action
          })
        ]
      );

      await client.query('COMMIT');

      const alert = alertResult.rows[0];

      // Publish to RabbitMQ
      const routingKey = `threshold.${violation.severity}.${violation.alert_type}`;
      await publishMessage('threshold-alerts', routingKey, {
        tenant_id: tenantId,
        alert_id: alert.id,
        alert_type: violation.alert_type,
        severity: violation.severity,
        sku_code: violation.sku_code,
        sku_name: violation.sku_name,
        warehouse_name: violation.warehouse_name,
        current_quantity: violation.current_quantity,
        threshold_quantity: violation.reorder_point,
        velocity_metrics: violation.velocity_metrics,
        recommended_action: violation.recommended_action,
        timestamp: new Date().toISOString()
      });

      // Send notifications
      const message = `
${violation.alert_type.replace('_', ' ').toUpperCase()}: ${violation.sku_name} (${violation.sku_code})

Warehouse: ${violation.warehouse_name}
Current Stock: ${violation.current_quantity} units
Threshold: ${violation.reorder_point} units

${violation.recommended_action}

${violation.velocity_metrics ? `
Velocity Analysis:
- Daily consumption: ${violation.velocity_metrics.daily_average.toFixed(2)} units/day
- Days of stock: ${violation.velocity_metrics.days_of_stock.toFixed(1)} days
- Stockout risk: ${violation.velocity_metrics.stockout_risk_score}%
- Trend: ${violation.velocity_metrics.velocity_trend}
` : ''}
      `.trim();

      await notificationService.sendNotification({
        tenant_id: tenantId,
        title: `${violation.severity.toUpperCase()} Alert: ${violation.sku_code}`,
        message: message,
        severity: violation.severity as unknown as NotificationSeverity,
        channels: channels,
        metadata: {
          alert_id: alert.id,
          sku_id: violation.sku_id,
          warehouse_id: violation.warehouse_id,
          alert_type: violation.alert_type
        }
      });

      logger.info('Threshold alert created and notifications sent', {
        alertId: alert.id,
        alertType: violation.alert_type,
        severity: violation.severity,
        skuCode: violation.sku_code
      });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating alert:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get active alerts for a tenant
   */
  async getActiveAlerts(
    tenantId: string,
    filters?: {
      skuId?: string;
      warehouseId?: string;
      severity?: AlertSeverity;
      alertType?: AlertType;
    }
  ): Promise<ThresholdAlert[]> {
    let whereClause = 'WHERE tenant_id = $1 AND status = $2';
    const params: any[] = [tenantId, 'active'];
    let paramCount = 2;

    if (filters?.skuId) {
      paramCount++;
      whereClause += ` AND sku_id = $${paramCount}`;
      params.push(filters.skuId);
    }

    if (filters?.warehouseId) {
      paramCount++;
      whereClause += ` AND warehouse_id = $${paramCount}`;
      params.push(filters.warehouseId);
    }

    if (filters?.severity) {
      paramCount++;
      whereClause += ` AND severity = $${paramCount}`;
      params.push(filters.severity);
    }

    if (filters?.alertType) {
      paramCount++;
      whereClause += ` AND alert_type = $${paramCount}`;
      params.push(filters.alertType);
    }

    const result = await query(
      `
      SELECT
        ia.*,
        s.code as sku_code,
        s.name as sku_name,
        w.name as warehouse_name
      FROM inventory_alerts ia
      JOIN skus s ON ia.sku_id = s.id
      JOIN warehouses w ON ia.warehouse_id = w.id
      ${whereClause}
      ORDER BY ia.severity DESC, ia.created_at DESC
      `,
      params
    );

    return result.rows;
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(
    tenantId: string,
    alertId: string,
    userId: string
  ): Promise<ThresholdAlert> {
    const result = await query(
      `
      UPDATE inventory_alerts
      SET
        status = 'acknowledged',
        acknowledged_by = $3,
        acknowledged_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2 AND status = 'active'
      RETURNING *
      `,
      [alertId, tenantId, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Alert not found or already acknowledged', 404);
    }

    return result.rows[0];
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(
    tenantId: string,
    alertId: string
  ): Promise<ThresholdAlert> {
    const result = await query(
      `
      UPDATE inventory_alerts
      SET
        status = 'resolved',
        resolved_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2 AND status IN ('active', 'acknowledged')
      RETURNING *
      `,
      [alertId, tenantId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Alert not found or already resolved', 404);
    }

    return result.rows[0];
  }
}

export const thresholdMonitoringService = new ThresholdMonitoringService();
