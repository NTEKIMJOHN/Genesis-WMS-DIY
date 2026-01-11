import { query, getClient } from '../config/database';
import { cacheGet, cacheSet, cacheDel } from '../config/redis';
import { publishMessage } from '../config/rabbitmq';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

const CACHE_TTL_HOT = parseInt(process.env.CACHE_TTL_HOT || '300');
const CACHE_TTL_WARM = parseInt(process.env.CACHE_TTL_WARM || '1800');

interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Get inventory overview with filtering and pagination
 */
export const getInventoryOverview = async (
  tenantId: string,
  filters: any,
  pagination: PaginationOptions
) => {
  const { page, limit, sortBy = 'last_movement_at', sortOrder = 'DESC' } = pagination;
  const offset = (page - 1) * limit;

  // Build cache key
  const cacheKey = `inventory:overview:${tenantId}:${JSON.stringify(filters)}:${page}:${limit}`;

  // Try cache first
  const cached = await cacheGet(cacheKey);
  if (cached) {
    logger.debug('Cache hit for inventory overview');
    return JSON.parse(cached);
  }

  // Build WHERE clause
  const conditions: string[] = ['s.tenant_id = $1', 's.is_active = true'];
  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (filters.warehouseId) {
    conditions.push(`i.warehouse_id = $${paramIndex}`);
    params.push(filters.warehouseId);
    paramIndex++;
  }

  if (filters.categoryId) {
    conditions.push(`s.category_id = $${paramIndex}`);
    params.push(filters.categoryId);
    paramIndex++;
  }

  if (filters.status) {
    // Status logic: Normal, Low, Critical, Overstocked
    if (filters.status === 'low') {
      conditions.push(`i.quantity_available <= (t.min_threshold * 0.8)`);
    } else if (filters.status === 'critical') {
      conditions.push(`i.quantity_available < t.min_threshold`);
    } else if (filters.status === 'overstocked') {
      conditions.push(`i.quantity_available > t.max_threshold`);
    }
  }

  if (filters.search) {
    conditions.push(`(s.sku_code ILIKE $${paramIndex} OR s.product_name ILIKE $${paramIndex})`);
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  // Count query
  const countQuery = `
    SELECT COUNT(DISTINCT s.sku_id) as total
    FROM skus s
    LEFT JOIN inventory i ON s.sku_id = i.sku_id
    LEFT JOIN inventory_thresholds t ON s.sku_id = t.sku_id AND i.warehouse_id = t.warehouse_id
    WHERE ${whereClause}
  `;

  const countResult = await query(countQuery, params);
  const total = parseInt(countResult.rows[0].total);

  // Data query
  const dataQuery = `
    SELECT
      s.sku_id,
      s.sku_code,
      s.product_name,
      s.unit_of_measure,
      s.abc_classification,
      s.is_batch_tracked,
      s.is_perishable,
      COALESCE(SUM(i.quantity_available), 0) as quantity_available,
      COALESCE(SUM(i.quantity_reserved), 0) as quantity_reserved,
      COALESCE(SUM(i.quantity_in_transit), 0) as quantity_in_transit,
      COALESCE(SUM(i.quantity_damaged), 0) as quantity_damaged,
      MAX(i.last_movement_at) as last_movement_at,
      MAX(i.last_counted_at) as last_counted_at,
      COUNT(DISTINCT i.warehouse_id) as warehouse_count,
      CASE
        WHEN COALESCE(SUM(i.quantity_available), 0) = 0 THEN 'out_of_stock'
        WHEN COALESCE(SUM(i.quantity_available), 0) < t.min_threshold THEN 'critical'
        WHEN COALESCE(SUM(i.quantity_available), 0) <= (t.min_threshold * 0.8) THEN 'low'
        WHEN COALESCE(SUM(i.quantity_available), 0) > t.max_threshold THEN 'overstocked'
        ELSE 'normal'
      END as inventory_status
    FROM skus s
    LEFT JOIN inventory i ON s.sku_id = i.sku_id
    LEFT JOIN inventory_thresholds t ON s.sku_id = t.sku_id AND i.warehouse_id = t.warehouse_id
    WHERE ${whereClause}
    GROUP BY s.sku_id, s.sku_code, s.product_name, s.unit_of_measure, s.abc_classification,
             s.is_batch_tracked, s.is_perishable, t.min_threshold, t.max_threshold
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  params.push(limit, offset);

  const dataResult = await query(dataQuery, params);

  const result = {
    data: dataResult.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    },
    lastSynced: new Date().toISOString()
  };

  // Cache the result
  await cacheSet(cacheKey, JSON.stringify(result), CACHE_TTL_HOT);

  return result;
};

/**
 * Get detailed inventory information for specific SKU
 */
export const getInventoryDetail = async (tenantId: string, skuId: string) => {
  const cacheKey = `inventory:detail:${tenantId}:${skuId}`;

  // Try cache first
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const detailQuery = `
    SELECT
      s.sku_id,
      s.sku_code,
      s.product_name,
      s.description,
      s.unit_of_measure,
      s.unit_cost,
      s.unit_price,
      s.abc_classification,
      s.is_batch_tracked,
      s.is_perishable,
      s.product_image_url,
      s.barcode,
      c.category_name,
      json_agg(
        DISTINCT jsonb_build_object(
          'warehouse_id', w.warehouse_id,
          'warehouse_code', w.warehouse_code,
          'warehouse_name', w.warehouse_name,
          'quantity_available', i.quantity_available,
          'quantity_reserved', i.quantity_reserved,
          'quantity_in_transit', i.quantity_in_transit,
          'quantity_damaged', i.quantity_damaged,
          'last_movement_at', i.last_movement_at,
          'last_counted_at', i.last_counted_at
        )
      ) FILTER (WHERE i.inventory_id IS NOT NULL) as warehouses,
      json_agg(
        DISTINCT jsonb_build_object(
          'threshold_id', t.threshold_id,
          'warehouse_id', t.warehouse_id,
          'min_threshold', t.min_threshold,
          'max_threshold', t.max_threshold,
          'safety_stock', t.safety_stock,
          'reorder_quantity', t.reorder_quantity
        )
      ) FILTER (WHERE t.threshold_id IS NOT NULL) as thresholds
    FROM skus s
    LEFT JOIN categories c ON s.category_id = c.category_id
    LEFT JOIN inventory i ON s.sku_id = i.sku_id
    LEFT JOIN warehouses w ON i.warehouse_id = w.warehouse_id
    LEFT JOIN inventory_thresholds t ON s.sku_id = t.sku_id
    WHERE s.sku_id = $1 AND s.tenant_id = $2
    GROUP BY s.sku_id, c.category_name
  `;

  const result = await query(detailQuery, [skuId, tenantId]);

  if (result.rows.length === 0) {
    return null;
  }

  const detail = result.rows[0];

  // Cache the result
  await cacheSet(cacheKey, JSON.stringify(detail), CACHE_TTL_WARM);

  return detail;
};

/**
 * Get bin-level inventory for specific SKU
 */
export const getBinLevelInventory = async (tenantId: string, skuId: string) => {
  const binQuery = `
    SELECT
      b.bin_id,
      b.bin_code,
      z.zone_code,
      z.zone_name,
      w.warehouse_code,
      w.warehouse_name,
      sbm.quantity,
      b.max_capacity,
      b.capacity_type,
      CASE
        WHEN b.max_capacity > 0 THEN ROUND((sbm.quantity / b.max_capacity * 100)::numeric, 2)
        ELSE 0
      END as occupancy_percentage,
      CASE
        WHEN b.max_capacity > 0 AND (sbm.quantity / b.max_capacity * 100) > 90 THEN 'over_capacity'
        WHEN b.max_capacity > 0 AND (sbm.quantity / b.max_capacity * 100) > 70 THEN 'nearing_capacity'
        WHEN b.max_capacity > 0 AND (sbm.quantity / b.max_capacity * 100) < 30 THEN 'underutilized'
        ELSE 'healthy'
      END as capacity_status,
      b.status as bin_status,
      sbm.is_primary_location,
      sbm.updated_at as last_updated
    FROM sku_bin_mappings sbm
    JOIN bins b ON sbm.bin_id = b.bin_id
    JOIN zones z ON b.zone_id = z.zone_id
    JOIN warehouses w ON z.warehouse_id = w.warehouse_id
    JOIN skus s ON sbm.sku_id = s.sku_id
    WHERE sbm.sku_id = $1 AND s.tenant_id = $2 AND sbm.quantity > 0
    ORDER BY sbm.is_primary_location DESC, z.zone_code, b.bin_code
  `;

  const result = await query(binQuery, [skuId, tenantId]);

  return result.rows;
};

/**
 * Get movement history for specific bin
 */
export const getBinMovementHistory = async (
  tenantId: string,
  binId: string,
  filters: any,
  pagination: PaginationOptions
) => {
  const { page, limit } = pagination;
  const offset = (page - 1) * limit;

  const conditions: string[] = ['im.bin_id = $1'];
  const params: any[] = [binId];
  let paramIndex = 2;

  if (filters.startDate) {
    conditions.push(`im.timestamp >= $${paramIndex}`);
    params.push(filters.startDate);
    paramIndex++;
  }

  if (filters.endDate) {
    conditions.push(`im.timestamp <= $${paramIndex}`);
    params.push(filters.endDate);
    paramIndex++;
  }

  if (filters.movementType) {
    conditions.push(`im.movement_type = $${paramIndex}`);
    params.push(filters.movementType);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  const countQuery = `
    SELECT COUNT(*) as total
    FROM inventory_movements im
    JOIN inventory i ON im.inventory_id = i.inventory_id
    JOIN skus s ON i.sku_id = s.sku_id
    WHERE ${whereClause} AND s.tenant_id = $${paramIndex}
  `;

  params.push(tenantId);

  const countResult = await query(countQuery, params);
  const total = parseInt(countResult.rows[0].total);

  const dataQuery = `
    SELECT
      im.movement_id,
      im.movement_type,
      im.reference_type,
      im.reference_id,
      im.quantity_change,
      im.quantity_before,
      im.quantity_after,
      im.notes,
      im.timestamp,
      s.sku_code,
      s.product_name,
      u.first_name || ' ' || u.last_name as performed_by_name,
      b.batch_number
    FROM inventory_movements im
    JOIN inventory i ON im.inventory_id = i.inventory_id
    JOIN skus s ON i.sku_id = s.sku_id
    LEFT JOIN users u ON im.performed_by = u.user_id
    LEFT JOIN batches b ON im.batch_id = b.batch_id
    WHERE ${whereClause} AND s.tenant_id = $${paramIndex}
    ORDER BY im.timestamp DESC
    LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
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
 * Estimate export size
 */
export const estimateExportSize = async (tenantId: string, exportData: any) => {
  let countQuery = 'SELECT COUNT(*) as count FROM skus s JOIN inventory i ON s.sku_id = i.sku_id WHERE s.tenant_id = $1';
  const params: any[] = [tenantId];

  if (exportData.warehouseId) {
    countQuery += ' AND i.warehouse_id = $2';
    params.push(exportData.warehouseId);
  }

  const result = await query(countQuery, params);
  return parseInt(result.rows[0].count);
};

/**
 * Queue export job (placeholder - would integrate with actual job queue)
 */
export const queueExportJob = async (tenantId: string, exportData: any) => {
  const jobId = `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Publish to message queue
  await publishMessage('inventory-events', 'export.queued', {
    jobId,
    tenantId,
    exportData,
    queuedAt: new Date().toISOString()
  });

  logger.info('Export job queued:', { jobId, tenantId });

  return jobId;
};

/**
 * Generate export immediately
 */
export const generateExport = async (tenantId: string, exportData: any) => {
  // This is a simplified version - would include actual CSV/Excel/PDF generation
  const inventoryQuery = `
    SELECT
      s.sku_code,
      s.product_name,
      s.unit_of_measure,
      i.quantity_available,
      i.quantity_reserved,
      i.quantity_damaged,
      w.warehouse_code,
      i.last_movement_at
    FROM skus s
    JOIN inventory i ON s.sku_id = i.sku_id
    JOIN warehouses w ON i.warehouse_id = w.warehouse_id
    WHERE s.tenant_id = $1
    ORDER BY s.sku_code
  `;

  const result = await query(inventoryQuery, [tenantId]);

  return {
    format: exportData.format,
    rowCount: result.rows.length,
    data: result.rows,
    generatedAt: new Date().toISOString()
  };
};

/**
 * Search inventory
 */
export const searchInventory = async (
  tenantId: string,
  searchQuery: string,
  type: string,
  limit: number
) => {
  const searchPattern = `%${searchQuery}%`;

  const searchSql = `
    SELECT
      s.sku_id,
      s.sku_code,
      s.product_name,
      s.barcode,
      COALESCE(SUM(i.quantity_available), 0) as total_available,
      'sku' as result_type
    FROM skus s
    LEFT JOIN inventory i ON s.sku_id = i.sku_id
    WHERE s.tenant_id = $1
      AND (s.sku_code ILIKE $2 OR s.product_name ILIKE $2 OR s.barcode ILIKE $2)
    GROUP BY s.sku_id
    LIMIT $3
  `;

  const result = await query(searchSql, [tenantId, searchPattern, limit]);

  return result.rows;
};

/**
 * Invalidate cache for SKU
 */
export const invalidateSkuCache = async (tenantId: string, skuId: string) => {
  const patterns = [
    `inventory:overview:${tenantId}:*`,
    `inventory:detail:${tenantId}:${skuId}`
  ];

  for (const pattern of patterns) {
    await cacheDel(pattern);
  }

  logger.debug('Cache invalidated for SKU:', { tenantId, skuId });
};
