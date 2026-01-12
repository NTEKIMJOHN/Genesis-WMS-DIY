import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { batchService } from '../services/batch.service';
import { expiryMonitoringService } from '../services/expiry-monitoring.service';
import { BatchStatus, QAStatus } from '../types/batch.types';
import Joi from 'joi';

// Validation schemas
const getBatchesSchema = Joi.object({
  skuId: Joi.string().uuid().optional(),
  warehouseId: Joi.string().uuid().optional(),
  status: Joi.string().valid(...Object.values(BatchStatus)).optional(),
  qaStatus: Joi.string().valid(...Object.values(QAStatus)).optional(),
  expiringInDays: Joi.number().integer().min(0).optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

const createBatchSchema = Joi.object({
  sku_id: Joi.string().uuid().required(),
  batch_number: Joi.string().required(),
  warehouse_id: Joi.string().uuid().required(),
  quantity_received: Joi.number().integer().min(0).required(),
  manufacturing_date: Joi.date().optional(),
  expiry_date: Joi.date().optional(),
  received_date: Joi.date().optional(),
  status: Joi.string().valid(...Object.values(BatchStatus)).optional(),
  qa_status: Joi.string().valid(...Object.values(QAStatus)).optional(),
  qa_notes: Joi.string().optional(),
  supplier_batch_reference: Joi.string().optional(),
  po_number: Joi.string().optional(),
  grn_number: Joi.string().optional(),
  attributes: Joi.object().optional(),
  temperature_controlled: Joi.boolean().optional(),
  min_temperature: Joi.number().optional(),
  max_temperature: Joi.number().optional()
});

const fefoAllocationSchema = Joi.object({
  sku_id: Joi.string().uuid().required(),
  warehouse_id: Joi.string().uuid().required(),
  requested_quantity: Joi.number().integer().min(1).required(),
  exclude_batch_ids: Joi.array().items(Joi.string().uuid()).optional(),
  prefer_batch_ids: Joi.array().items(Joi.string().uuid()).optional(),
  enforce_fefo: Joi.boolean().optional().default(true)
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid(...Object.values(BatchStatus)).required(),
  qa_status: Joi.string().valid(...Object.values(QAStatus)).optional(),
  qa_notes: Joi.string().optional()
});

/**
 * Get all batches with filtering and pagination
 */
export const getBatches = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { error, value } = getBatchesSchema.validate(req.query);

  if (error) {
    return res.status(400).json({
      status: 'error',
      message: error.details[0].message
    });
  }

  const tenantId = req.user!.tenantId;
  const result = await batchService.getBatches(tenantId, value);

  res.json({
    status: 'success',
    data: result
  });
});

/**
 * Get batch by ID
 */
export const getBatchById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { batchId } = req.params;

  const batch = await batchService.getBatchById(tenantId, batchId);

  res.json({
    status: 'success',
    data: batch
  });
});

/**
 * Create a new batch
 */
export const createBatch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { error, value } = createBatchSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      status: 'error',
      message: error.details[0].message
    });
  }

  const tenantId = req.user!.tenantId;
  const batch = await batchService.createBatch(tenantId, value);

  res.status(201).json({
    status: 'success',
    message: 'Batch created successfully',
    data: batch
  });
});

/**
 * Update batch status
 */
export const updateBatchStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { error, value } = updateStatusSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      status: 'error',
      message: error.details[0].message
    });
  }

  const tenantId = req.user!.tenantId;
  const { batchId } = req.params;

  const batch = await batchService.updateBatchStatus(
    tenantId,
    batchId,
    value.status,
    value.qa_status,
    value.qa_notes
  );

  res.json({
    status: 'success',
    message: 'Batch status updated successfully',
    data: batch
  });
});

/**
 * FEFO allocation endpoint
 */
export const allocateBatchesFEFO = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { error, value } = fefoAllocationSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      status: 'error',
      message: error.details[0].message
    });
  }

  const tenantId = req.user!.tenantId;
  const result = await batchService.allocateBatchesFEFO(tenantId, value);

  res.json({
    status: 'success',
    data: result
  });
});

/**
 * Get batches nearing expiry
 */
export const getBatchesNearingExpiry = asyncHandler(async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  const warningDays = req.query.warningDays ? parseInt(req.query.warningDays as string) : 30;
  const criticalDays = req.query.criticalDays ? parseInt(req.query.criticalDays as string) : 7;

  const batches = await batchService.getBatchesNearingExpiry(tenantId, warningDays, criticalDays);

  res.json({
    status: 'success',
    data: {
      batches,
      count: batches.length
    }
  });
});

/**
 * Get expiry summary
 */
export const getExpirySummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  const summary = await expiryMonitoringService.getExpirySummary(tenantId);

  res.json({
    status: 'success',
    data: summary
  });
});

/**
 * Trigger manual expiry check
 */
export const triggerExpiryCheck = asyncHandler(async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  await expiryMonitoringService.checkExpiringBatchesForTenant(tenantId);

  res.json({
    status: 'success',
    message: 'Expiry check triggered successfully'
  });
});
