import { query, getClient } from '../config/database';
import { cacheGet, cacheSet, cacheDel } from '../config/redis';
import { publishMessage } from '../config/rabbitmq';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import {
  Batch,
  BatchStatus,
  QAStatus,
  FEFOAllocation,
  BatchAllocationRequest,
  BatchAllocationResult,
  BatchExpiryAlert
} from '../types/batch.types';

const CACHE_TTL_HOT = parseInt(process.env.CACHE_TTL_HOT || '300');
const CACHE_TTL_WARM = parseInt(process.env.CACHE_TTL_WARM || '1800');

export class BatchService {
  /**
   * Get all batches with filtering and pagination
   */
  async getBatches(
    tenantId: string,
    filters: {
      skuId?: string;
      warehouseId?: string;
      status?: BatchStatus;
      qaStatus?: QAStatus;
      expiringInDays?: number;
      page?: number;
      limit?: number;
    }
  ): Promise<{ batches: Batch[]; total: number; page: number; limit: number }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 100);
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE b.tenant_id = $1';
    const params: any[] = [tenantId];
    let paramCount = 1;

    if (filters.skuId) {
      paramCount++;
      whereClause += ` AND b.sku_id = $${paramCount}`;
      params.push(filters.skuId);
    }

    if (filters.warehouseId) {
      paramCount++;
      whereClause += ` AND b.warehouse_id = $${paramCount}`;
      params.push(filters.warehouseId);
    }

    if (filters.status) {
      paramCount++;
      whereClause += ` AND b.status = $${paramCount}`;
      params.push(filters.status);
    }

    if (filters.qaStatus) {
      paramCount++;
      whereClause += ` AND b.qa_status = $${paramCount}`;
      params.push(filters.qaStatus);
    }

    if (filters.expiringInDays !== undefined) {
      paramCount++;
      whereClause += ` AND b.expiry_date <= CURRENT_DATE + INTERVAL '1 day' * $${paramCount}`;
      params.push(filters.expiringInDays);
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM batches b
      ${whereClause}
    `;

    const dataQuery = `
      SELECT
        b.*,
        s.code as sku_code,
        s.name as sku_name,
        w.name as warehouse_name
      FROM batches b
      JOIN skus s ON b.sku_id = s.id
      JOIN warehouses w ON b.warehouse_id = w.id
      ${whereClause}
      ORDER BY b.expiry_date ASC NULLS LAST, b.received_date DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    const [countResult, dataResult] = await Promise.all([
      query(countQuery, params),
      query(dataQuery, [...params, limit, offset])
    ]);

    return {
      batches: dataResult.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit
    };
  }

  /**
   * Get batch by ID with detailed information
   */
  async getBatchById(tenantId: string, batchId: string): Promise<Batch> {
    const cacheKey = `batch:${tenantId}:${batchId}`;
    const cached = await cacheGet(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const result = await query(
      `
      SELECT
        b.*,
        s.code as sku_code,
        s.name as sku_name,
        s.batch_tracking_enabled,
        w.name as warehouse_name,
        w.code as warehouse_code
      FROM batches b
      JOIN skus s ON b.sku_id = s.id
      JOIN warehouses w ON b.warehouse_id = w.id
      WHERE b.id = $1 AND b.tenant_id = $2
      `,
      [batchId, tenantId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Batch not found', 404);
    }

    const batch = result.rows[0];
    await cacheSet(cacheKey, JSON.stringify(batch), CACHE_TTL_WARM);

    return batch;
  }

  /**
   * FEFO (First Expiry First Out) Allocation
   * Allocates batches with earliest expiry dates first
   */
  async allocateBatchesFEFO(
    tenantId: string,
    request: BatchAllocationRequest
  ): Promise<BatchAllocationResult> {
    const { sku_id, warehouse_id, requested_quantity, exclude_batch_ids, prefer_batch_ids, enforce_fefo = true } = request;

    logger.info('FEFO Allocation Request:', {
      tenantId,
      sku_id,
      warehouse_id,
      requested_quantity,
      enforce_fefo
    });

    const allocations: FEFOAllocation[] = [];
    let remainingQuantity = requested_quantity;
    const warnings: string[] = [];

    // Build query for available batches
    let whereClause = `
      WHERE b.tenant_id = $1
      AND b.sku_id = $2
      AND b.warehouse_id = $3
      AND b.quantity_available > 0
      AND b.status = 'active'
      AND b.qa_status = 'passed'
    `;
    const params: any[] = [tenantId, sku_id, warehouse_id];
    let paramCount = 3;

    if (exclude_batch_ids && exclude_batch_ids.length > 0) {
      paramCount++;
      whereClause += ` AND b.id != ALL($${paramCount})`;
      params.push(exclude_batch_ids);
    }

    // FEFO ordering: First by expiry date (NULLS LAST), then by received date
    const orderClause = enforce_fefo
      ? 'ORDER BY b.expiry_date ASC NULLS LAST, b.received_date ASC'
      : 'ORDER BY b.received_date ASC';

    const batchesQuery = `
      SELECT
        b.id as batch_id,
        b.batch_number,
        b.expiry_date,
        b.quantity_available,
        b.warehouse_id,
        CASE
          WHEN b.expiry_date IS NULL THEN 999999
          ELSE EXTRACT(EPOCH FROM (b.expiry_date - CURRENT_DATE)) / 86400
        END as days_until_expiry
      FROM batches b
      ${whereClause}
      ${orderClause}
    `;

    const result = await query(batchesQuery, params);
    const availableBatches = result.rows;

    if (availableBatches.length === 0) {
      logger.warn('No available batches found for FEFO allocation', {
        tenantId,
        sku_id,
        warehouse_id
      });

      return {
        allocations: [],
        total_allocated: 0,
        total_requested: requested_quantity,
        fully_allocated: false,
        warnings: ['No available batches found for allocation']
      };
    }

    // Allocate from batches in FEFO order
    let priority = 1;
    for (const batch of availableBatches) {
      if (remainingQuantity <= 0) break;

      const allocatedQty = Math.min(batch.quantity_available, remainingQuantity);

      allocations.push({
        batch_id: batch.batch_id,
        batch_number: batch.batch_number,
        expiry_date: batch.expiry_date,
        quantity_available: batch.quantity_available,
        allocated_quantity: allocatedQty,
        warehouse_id: batch.warehouse_id,
        fefo_priority: priority++
      });

      remainingQuantity -= allocatedQty;

      // Check for near expiry warning
      if (batch.expiry_date && batch.days_until_expiry <= 30) {
        warnings.push(
          `Batch ${batch.batch_number} expires in ${Math.floor(batch.days_until_expiry)} days`
        );
      }
    }

    const totalAllocated = requested_quantity - remainingQuantity;
    const fullyAllocated = remainingQuantity === 0;

    if (!fullyAllocated) {
      warnings.push(
        `Only ${totalAllocated} of ${requested_quantity} units could be allocated`
      );
    }

    // Publish FEFO allocation event to RabbitMQ
    await publishMessage('batch-events', 'batch.fefo.update', {
      tenant_id: tenantId,
      sku_id,
      warehouse_id,
      requested_quantity,
      total_allocated: totalAllocated,
      fully_allocated: fullyAllocated,
      allocations,
      timestamp: new Date().toISOString()
    });

    logger.info('FEFO Allocation Complete:', {
      tenantId,
      sku_id,
      totalAllocated,
      fullyAllocated,
      batchCount: allocations.length
    });

    return {
      allocations,
      total_allocated: totalAllocated,
      total_requested: requested_quantity,
      fully_allocated: fullyAllocated,
      warnings
    };
  }

  /**
   * Create a new batch
   */
  async createBatch(
    tenantId: string,
    batchData: Partial<Batch>
  ): Promise<Batch> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `
        INSERT INTO batches (
          tenant_id, sku_id, batch_number, warehouse_id,
          quantity_received, quantity_available, quantity_reserved, quantity_damaged,
          manufacturing_date, expiry_date, received_date,
          status, qa_status, qa_notes,
          parent_batch_id, supplier_batch_reference, po_number, grn_number,
          attributes, temperature_controlled, min_temperature, max_temperature
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
        )
        RETURNING *
        `,
        [
          tenantId,
          batchData.sku_id,
          batchData.batch_number,
          batchData.warehouse_id,
          batchData.quantity_received || 0,
          batchData.quantity_available || batchData.quantity_received || 0,
          batchData.quantity_reserved || 0,
          batchData.quantity_damaged || 0,
          batchData.manufacturing_date || null,
          batchData.expiry_date || null,
          batchData.received_date || new Date(),
          batchData.status || BatchStatus.QUARANTINE,
          batchData.qa_status || QAStatus.PENDING,
          batchData.qa_notes || null,
          batchData.parent_batch_id || null,
          batchData.supplier_batch_reference || null,
          batchData.po_number || null,
          batchData.grn_number || null,
          batchData.attributes ? JSON.stringify(batchData.attributes) : null,
          batchData.temperature_controlled || false,
          batchData.min_temperature || null,
          batchData.max_temperature || null
        ]
      );

      const batch = result.rows[0];

      await client.query('COMMIT');

      // Invalidate cache
      await cacheDel(`batch:${tenantId}:${batch.id}`);

      // Publish batch creation event
      await publishMessage('batch-events', 'batch.status.created', {
        tenant_id: tenantId,
        batch_id: batch.id,
        batch_number: batch.batch_number,
        sku_id: batch.sku_id,
        warehouse_id: batch.warehouse_id,
        status: batch.status,
        timestamp: new Date().toISOString()
      });

      logger.info('Batch created:', { batchId: batch.id, batchNumber: batch.batch_number });

      return batch;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating batch:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update batch status (e.g., from quarantine to active after QA)
   */
  async updateBatchStatus(
    tenantId: string,
    batchId: string,
    status: BatchStatus,
    qaStatus?: QAStatus,
    qaNotes?: string
  ): Promise<Batch> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `
        UPDATE batches
        SET
          status = $1,
          qa_status = COALESCE($2, qa_status),
          qa_notes = COALESCE($3, qa_notes),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4 AND tenant_id = $5
        RETURNING *
        `,
        [status, qaStatus || null, qaNotes || null, batchId, tenantId]
      );

      if (result.rows.length === 0) {
        throw new AppError('Batch not found', 404);
      }

      const batch = result.rows[0];

      await client.query('COMMIT');

      // Invalidate cache
      await cacheDel(`batch:${tenantId}:${batchId}`);

      // Publish status change event
      await publishMessage('batch-events', `batch.status.${status}`, {
        tenant_id: tenantId,
        batch_id: batch.id,
        batch_number: batch.batch_number,
        old_status: batch.status,
        new_status: status,
        qa_status: qaStatus,
        timestamp: new Date().toISOString()
      });

      logger.info('Batch status updated:', {
        batchId,
        status,
        qaStatus
      });

      return batch;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating batch status:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get batches nearing expiry
   */
  async getBatchesNearingExpiry(
    tenantId: string,
    warningDays: number = 30,
    criticalDays: number = 7
  ): Promise<BatchExpiryAlert[]> {
    const result = await query(
      `
      SELECT
        b.id as batch_id,
        b.batch_number,
        b.sku_id,
        s.code as sku_code,
        b.warehouse_id,
        b.expiry_date,
        EXTRACT(DAY FROM (b.expiry_date - CURRENT_DATE)) as days_until_expiry,
        b.quantity_available,
        CASE
          WHEN EXTRACT(DAY FROM (b.expiry_date - CURRENT_DATE)) <= $2 THEN 'emergency'
          WHEN EXTRACT(DAY FROM (b.expiry_date - CURRENT_DATE)) <= $3 THEN 'critical'
          ELSE 'warning'
        END as alert_level
      FROM batches b
      JOIN skus s ON b.sku_id = s.id
      WHERE b.tenant_id = $1
        AND b.expiry_date IS NOT NULL
        AND b.expiry_date <= CURRENT_DATE + INTERVAL '1 day' * $3
        AND b.quantity_available > 0
        AND b.status IN ('active', 'near_expiry')
      ORDER BY b.expiry_date ASC
      `,
      [tenantId, criticalDays, warningDays]
    );

    return result.rows;
  }

  /**
   * Update expired batches
   */
  async updateExpiredBatches(tenantId: string): Promise<number> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `
        UPDATE batches
        SET status = 'expired', updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1
          AND expiry_date < CURRENT_DATE
          AND status != 'expired'
          AND status != 'disposed'
        RETURNING id, batch_number, sku_id, warehouse_id
        `,
        [tenantId]
      );

      const expiredBatches = result.rows;

      await client.query('COMMIT');

      // Publish expiry events for each batch
      for (const batch of expiredBatches) {
        await publishMessage('batch-events', 'batch.expiry.expired', {
          tenant_id: tenantId,
          batch_id: batch.id,
          batch_number: batch.batch_number,
          sku_id: batch.sku_id,
          warehouse_id: batch.warehouse_id,
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`Updated ${expiredBatches.length} expired batches`);

      return expiredBatches.length;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating expired batches:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export const batchService = new BatchService();
