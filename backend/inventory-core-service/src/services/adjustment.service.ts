import { query, getClient } from '../config/database';
import { publishMessage } from '../config/rabbitmq';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { invalidateSkuCache } from './inventory.service';

interface AdjustmentData {
  skuId: string;
  warehouseId: string;
  binId?: string;
  batchId?: string;
  adjustmentType: string;
  quantityAfter: number;
  reason: string;
  remarks?: string;
  attachmentUrls?: string[];
}

const APPROVAL_THRESHOLD_VALUE = 500; // $500
const APPROVAL_THRESHOLD_PERCENTAGE = 10; // 10%

/**
 * Get all adjustments with filtering
 */
export const getAdjustments = async (
  tenantId: string,
  filters: any,
  pagination: any
) => {
  const { page, limit } = pagination;
  const offset = (page - 1) * limit;

  const conditions: string[] = ['s.tenant_id = $1'];
  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (filters.status) {
    conditions.push(`ia.status = $${paramIndex}`);
    params.push(filters.status);
    paramIndex++;
  }

  if (filters.reason) {
    conditions.push(`ia.reason = $${paramIndex}`);
    params.push(filters.reason);
    paramIndex++;
  }

  if (filters.skuId) {
    conditions.push(`ia.sku_id = $${paramIndex}`);
    params.push(filters.skuId);
    paramIndex++;
  }

  if (filters.warehouseId) {
    conditions.push(`ia.warehouse_id = $${paramIndex}`);
    params.push(filters.warehouseId);
    paramIndex++;
  }

  if (filters.createdBy) {
    conditions.push(`ia.created_by = $${paramIndex}`);
    params.push(filters.createdBy);
    paramIndex++;
  }

  if (filters.startDate) {
    conditions.push(`ia.created_at >= $${paramIndex}`);
    params.push(filters.startDate);
    paramIndex++;
  }

  if (filters.endDate) {
    conditions.push(`ia.created_at <= $${paramIndex}`);
    params.push(filters.endDate);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  const countQuery = `
    SELECT COUNT(*) as total
    FROM inventory_adjustments ia
    JOIN skus s ON ia.sku_id = s.sku_id
    WHERE ${whereClause}
  `;

  const countResult = await query(countQuery, params);
  const total = parseInt(countResult.rows[0].total);

  const dataQuery = `
    SELECT
      ia.adjustment_id,
      ia.sku_id,
      s.sku_code,
      s.product_name,
      ia.warehouse_id,
      w.warehouse_code,
      ia.adjustment_type,
      ia.quantity_before,
      ia.quantity_after,
      ia.quantity_change,
      ia.value_impact,
      ia.reason,
      ia.remarks,
      ia.status,
      ia.requires_approval,
      ia.created_at,
      creator.first_name || ' ' || creator.last_name as created_by_name,
      approver.first_name || ' ' || approver.last_name as approved_by_name,
      ia.approved_at
    FROM inventory_adjustments ia
    JOIN skus s ON ia.sku_id = s.sku_id
    JOIN warehouses w ON ia.warehouse_id = w.warehouse_id
    JOIN users creator ON ia.created_by = creator.user_id
    LEFT JOIN users approver ON ia.approved_by = approver.user_id
    WHERE ${whereClause}
    ORDER BY ia.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  params.push(limit, offset);

  const dataResult = await query(dataQuery, params);

  return {
    data: dataResult.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

/**
 * Create new inventory adjustment
 */
export const createAdjustment = async (
  tenantId: string,
  userId: string,
  adjustmentData: AdjustmentData
) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Get current inventory
    const inventoryQuery = `
      SELECT
        i.inventory_id,
        i.quantity_available,
        s.unit_cost,
        s.sku_code,
        s.product_name
      FROM inventory i
      JOIN skus s ON i.sku_id = s.sku_id
      WHERE i.sku_id = $1 AND i.warehouse_id = $2 AND s.tenant_id = $3
      FOR UPDATE
    `;

    const inventoryResult = await client.query(inventoryQuery, [
      adjustmentData.skuId,
      adjustmentData.warehouseId,
      tenantId
    ]);

    if (inventoryResult.rows.length === 0) {
      throw new AppError('Inventory record not found', 404);
    }

    const inventory = inventoryResult.rows[0];
    const quantityBefore = parseFloat(inventory.quantity_available);
    const quantityAfter = adjustmentData.quantityAfter;
    const quantityChange = quantityAfter - quantityBefore;
    const unitCost = parseFloat(inventory.unit_cost || 0);
    const valueImpact = Math.abs(quantityChange * unitCost);

    // Validate non-negative quantity
    if (quantityAfter < 0) {
      throw new AppError('Quantity cannot be negative', 400);
    }

    // Determine if approval is required
    const variancePercentage = Math.abs((quantityChange / quantityBefore) * 100);
    const requiresApproval =
      valueImpact >= APPROVAL_THRESHOLD_VALUE ||
      variancePercentage >= APPROVAL_THRESHOLD_PERCENTAGE;

    // Create adjustment record
    const adjustmentQuery = `
      INSERT INTO inventory_adjustments (
        sku_id, warehouse_id, bin_id, batch_id, adjustment_type,
        quantity_before, quantity_after, quantity_change, value_impact,
        reason, remarks, attachment_urls, status, requires_approval, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const adjustmentResult = await client.query(adjustmentQuery, [
      adjustmentData.skuId,
      adjustmentData.warehouseId,
      adjustmentData.binId || null,
      adjustmentData.batchId || null,
      adjustmentData.adjustmentType,
      quantityBefore,
      quantityAfter,
      quantityChange,
      valueImpact,
      adjustmentData.reason,
      adjustmentData.remarks || null,
      adjustmentData.attachmentUrls || null,
      requiresApproval ? 'pending_approval' : 'approved',
      requiresApproval,
      userId
    ]);

    const adjustment = adjustmentResult.rows[0];

    // If auto-approved, update inventory immediately
    if (!requiresApproval) {
      await applyAdjustment(client, inventory.inventory_id, quantityAfter, adjustment.adjustment_id, userId);
    }

    await client.query('COMMIT');

    // Invalidate cache
    await invalidateSkuCache(tenantId, adjustmentData.skuId);

    // Publish event
    await publishMessage('inventory-events', 'adjustment.created', {
      adjustmentId: adjustment.adjustment_id,
      tenantId,
      skuId: adjustmentData.skuId,
      requiresApproval,
      createdAt: new Date().toISOString()
    });

    logger.info('Adjustment created:', {
      adjustmentId: adjustment.adjustment_id,
      skuCode: inventory.sku_code,
      quantityChange,
      requiresApproval
    });

    return adjustment;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get adjustment detail
 */
export const getAdjustmentDetail = async (tenantId: string, adjustmentId: string) => {
  const detailQuery = `
    SELECT
      ia.*,
      s.sku_code,
      s.product_name,
      s.unit_of_measure,
      w.warehouse_code,
      w.warehouse_name,
      b.bin_code,
      batch.batch_number,
      creator.first_name || ' ' || creator.last_name as created_by_name,
      creator.email as created_by_email,
      approver.first_name || ' ' || approver.last_name as approved_by_name
    FROM inventory_adjustments ia
    JOIN skus s ON ia.sku_id = s.sku_id
    JOIN warehouses w ON ia.warehouse_id = w.warehouse_id
    LEFT JOIN bins b ON ia.bin_id = b.bin_id
    LEFT JOIN batches batch ON ia.batch_id = batch.batch_id
    JOIN users creator ON ia.created_by = creator.user_id
    LEFT JOIN users approver ON ia.approved_by = approver.user_id
    WHERE ia.adjustment_id = $1 AND s.tenant_id = $2
  `;

  const result = await query(detailQuery, [adjustmentId, tenantId]);

  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Approve adjustment
 */
export const approveAdjustment = async (
  tenantId: string,
  adjustmentId: string,
  userId: string
) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Get adjustment details
    const adjustmentQuery = `
      SELECT ia.*, i.inventory_id
      FROM inventory_adjustments ia
      JOIN inventory i ON ia.sku_id = i.sku_id AND ia.warehouse_id = i.warehouse_id
      JOIN skus s ON ia.sku_id = s.sku_id
      WHERE ia.adjustment_id = $1 AND s.tenant_id = $2 AND ia.status = 'pending_approval'
      FOR UPDATE
    `;

    const adjustmentResult = await client.query(adjustmentQuery, [adjustmentId, tenantId]);

    if (adjustmentResult.rows.length === 0) {
      throw new AppError('Adjustment not found or already processed', 404);
    }

    const adjustment = adjustmentResult.rows[0];

    // Update adjustment status
    await client.query(
      `UPDATE inventory_adjustments
       SET status = 'approved', approved_by = $1, approved_at = NOW()
       WHERE adjustment_id = $2`,
      [userId, adjustmentId]
    );

    // Apply adjustment to inventory
    await applyAdjustment(
      client,
      adjustment.inventory_id,
      adjustment.quantity_after,
      adjustmentId,
      userId
    );

    await client.query('COMMIT');

    // Invalidate cache
    await invalidateSkuCache(tenantId, adjustment.sku_id);

    // Publish event
    await publishMessage('inventory-events', 'adjustment.approved', {
      adjustmentId,
      tenantId,
      skuId: adjustment.sku_id,
      approvedBy: userId,
      approvedAt: new Date().toISOString()
    });

    logger.info('Adjustment approved:', { adjustmentId, approvedBy: userId });

    return await getAdjustmentDetail(tenantId, adjustmentId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Reject adjustment
 */
export const rejectAdjustment = async (
  tenantId: string,
  adjustmentId: string,
  userId: string,
  rejectionReason: string
) => {
  const updateQuery = `
    UPDATE inventory_adjustments ia
    SET status = 'rejected', approved_by = $1, approved_at = NOW(), rejection_reason = $2
    FROM skus s
    WHERE ia.adjustment_id = $3 AND ia.sku_id = s.sku_id AND s.tenant_id = $4
      AND ia.status = 'pending_approval'
    RETURNING ia.*
  `;

  const result = await query(updateQuery, [userId, rejectionReason, adjustmentId, tenantId]);

  if (result.rows.length === 0) {
    throw new AppError('Adjustment not found or already processed', 404);
  }

  // Publish event
  await publishMessage('inventory-events', 'adjustment.rejected', {
    adjustmentId,
    tenantId,
    rejectedBy: userId,
    rejectionReason,
    rejectedAt: new Date().toISOString()
  });

  logger.info('Adjustment rejected:', { adjustmentId, rejectedBy: userId });

  return await getAdjustmentDetail(tenantId, adjustmentId);
};

/**
 * Apply adjustment to inventory (helper function)
 */
const applyAdjustment = async (
  client: any,
  inventoryId: string,
  newQuantity: number,
  adjustmentId: string,
  userId: string
) => {
  // Update inventory
  const updateInventoryQuery = `
    UPDATE inventory
    SET quantity_available = $1, last_movement_at = NOW()
    WHERE inventory_id = $2
    RETURNING quantity_available
  `;

  await client.query(updateInventoryQuery, [newQuantity, inventoryId]);

  // Create movement record
  const createMovementQuery = `
    INSERT INTO inventory_movements (
      inventory_id, movement_type, reference_type, reference_id,
      quantity_change, quantity_before, quantity_after, performed_by, timestamp
    )
    SELECT
      $1, 'adjustment', 'adjustment', $2,
      ia.quantity_change, ia.quantity_before, ia.quantity_after, $3, NOW()
    FROM inventory_adjustments ia
    WHERE ia.adjustment_id = $2
  `;

  await client.query(createMovementQuery, [inventoryId, adjustmentId, userId]);
};
