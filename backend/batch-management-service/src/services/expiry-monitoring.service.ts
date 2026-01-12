import cron from 'node-cron';
import { query } from '../config/database';
import { publishMessage } from '../config/rabbitmq';
import { logger } from '../utils/logger';
import { batchService } from './batch.service';

const EXPIRY_WARNING_DAYS = parseInt(process.env.EXPIRY_WARNING_DAYS || '30');
const EXPIRY_CRITICAL_DAYS = parseInt(process.env.EXPIRY_CRITICAL_DAYS || '7');

export class ExpiryMonitoringService {
  private cronJob: cron.ScheduledTask | null = null;

  /**
   * Start the expiry monitoring cron job
   */
  start(): void {
    const cronSchedule = process.env.EXPIRY_CHECK_CRON || '0 */6 * * *'; // Every 6 hours by default

    this.cronJob = cron.schedule(cronSchedule, async () => {
      logger.info('Running scheduled expiry monitoring check');
      await this.checkExpiringBatches();
    });

    logger.info(`Expiry monitoring service started with schedule: ${cronSchedule}`);
  }

  /**
   * Stop the expiry monitoring cron job
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('Expiry monitoring service stopped');
    }
  }

  /**
   * Check for expiring batches across all tenants
   */
  async checkExpiringBatches(): Promise<void> {
    try {
      // Get all active tenants
      const tenantsResult = await query(
        'SELECT id FROM tenants WHERE status = $1',
        ['active']
      );

      const tenants = tenantsResult.rows;

      logger.info(`Checking expiring batches for ${tenants.length} tenants`);

      for (const tenant of tenants) {
        await this.checkExpiringBatchesForTenant(tenant.id);
      }

      // Update expired batches
      for (const tenant of tenants) {
        const expiredCount = await batchService.updateExpiredBatches(tenant.id);
        if (expiredCount > 0) {
          logger.info(`Marked ${expiredCount} batches as expired for tenant ${tenant.id}`);
        }
      }

      logger.info('Expiry monitoring check completed');
    } catch (error) {
      logger.error('Error checking expiring batches:', error);
      throw error;
    }
  }

  /**
   * Check expiring batches for a specific tenant
   */
  async checkExpiringBatchesForTenant(tenantId: string): Promise<void> {
    try {
      const expiringBatches = await batchService.getBatchesNearingExpiry(
        tenantId,
        EXPIRY_WARNING_DAYS,
        EXPIRY_CRITICAL_DAYS
      );

      if (expiringBatches.length === 0) {
        return;
      }

      logger.info(`Found ${expiringBatches.length} expiring batches for tenant ${tenantId}`);

      // Group batches by alert level
      const emergencyBatches = expiringBatches.filter(b => b.alert_level === 'emergency');
      const criticalBatches = expiringBatches.filter(b => b.alert_level === 'critical');
      const warningBatches = expiringBatches.filter(b => b.alert_level === 'warning');

      // Publish expiry alerts to RabbitMQ for each alert level
      if (emergencyBatches.length > 0) {
        await this.publishExpiryAlerts(tenantId, emergencyBatches, 'emergency');
      }

      if (criticalBatches.length > 0) {
        await this.publishExpiryAlerts(tenantId, criticalBatches, 'critical');
      }

      if (warningBatches.length > 0) {
        await this.publishExpiryAlerts(tenantId, warningBatches, 'warning');
      }

      // Update batch status to 'near_expiry' for critical and emergency batches
      await this.updateNearExpiryBatches(tenantId, [
        ...emergencyBatches.map(b => b.batch_id),
        ...criticalBatches.map(b => b.batch_id)
      ]);
    } catch (error) {
      logger.error(`Error checking expiring batches for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Publish expiry alerts to RabbitMQ
   */
  private async publishExpiryAlerts(
    tenantId: string,
    batches: any[],
    alertLevel: string
  ): Promise<void> {
    const routingKey = `batch.expiry.${alertLevel}`;

    await publishMessage('batch-events', routingKey, {
      tenant_id: tenantId,
      alert_level: alertLevel,
      batch_count: batches.length,
      batches: batches.map(b => ({
        batch_id: b.batch_id,
        batch_number: b.batch_number,
        sku_id: b.sku_id,
        sku_code: b.sku_code,
        warehouse_id: b.warehouse_id,
        expiry_date: b.expiry_date,
        days_until_expiry: b.days_until_expiry,
        quantity_available: b.quantity_available
      })),
      timestamp: new Date().toISOString()
    });

    logger.info(`Published ${alertLevel} expiry alerts for ${batches.length} batches`, {
      tenantId,
      alertLevel
    });
  }

  /**
   * Update batches to near_expiry status
   */
  private async updateNearExpiryBatches(tenantId: string, batchIds: string[]): Promise<void> {
    if (batchIds.length === 0) return;

    await query(
      `
      UPDATE batches
      SET status = 'near_expiry', updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1
        AND id = ANY($2)
        AND status = 'active'
      `,
      [tenantId, batchIds]
    );

    logger.info(`Updated ${batchIds.length} batches to near_expiry status`, { tenantId });
  }

  /**
   * Get expiry summary for a tenant
   */
  async getExpirySummary(tenantId: string): Promise<{
    total_expiring: number;
    emergency_count: number;
    critical_count: number;
    warning_count: number;
    total_value_at_risk: number;
  }> {
    const result = await query(
      `
      SELECT
        COUNT(*) as total_expiring,
        SUM(CASE WHEN EXTRACT(DAY FROM (b.expiry_date - CURRENT_DATE)) <= $2 THEN 1 ELSE 0 END) as emergency_count,
        SUM(CASE WHEN EXTRACT(DAY FROM (b.expiry_date - CURRENT_DATE)) BETWEEN $2 AND $3 THEN 1 ELSE 0 END) as critical_count,
        SUM(CASE WHEN EXTRACT(DAY FROM (b.expiry_date - CURRENT_DATE)) BETWEEN $3 AND $4 THEN 1 ELSE 0 END) as warning_count,
        COALESCE(SUM(b.quantity_available * s.unit_cost), 0) as total_value_at_risk
      FROM batches b
      JOIN skus s ON b.sku_id = s.id
      WHERE b.tenant_id = $1
        AND b.expiry_date IS NOT NULL
        AND b.expiry_date <= CURRENT_DATE + INTERVAL '1 day' * $4
        AND b.quantity_available > 0
        AND b.status IN ('active', 'near_expiry')
      `,
      [tenantId, EXPIRY_CRITICAL_DAYS, EXPIRY_CRITICAL_DAYS, EXPIRY_WARNING_DAYS]
    );

    return result.rows[0];
  }
}

export const expiryMonitoringService = new ExpiryMonitoringService();
