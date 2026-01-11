import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import * as adjustmentService from '../services/adjustment.service';
import Joi from 'joi';

const createAdjustmentSchema = Joi.object({
  skuId: Joi.string().uuid().required(),
  warehouseId: Joi.string().uuid().required(),
  binId: Joi.string().uuid().optional(),
  batchId: Joi.string().uuid().optional(),
  adjustmentType: Joi.string().valid('increase', 'decrease', 'status_change').required(),
  quantityAfter: Joi.number().min(0).required(),
  reason: Joi.string().valid(
    'damage', 'loss_theft', 'found', 'audit_discrepancy', 'reclassification',
    'transfer_not_recorded', 'receiving_error', 'picking_error', 'expiry_spoilage',
    'customer_return', 'system_error', 'cycle_count_variance', 'other'
  ).required(),
  remarks: Joi.string().max(500).optional(),
  attachmentUrls: Joi.array().items(Joi.string().uri()).optional()
});

/**
 * Get all adjustments with filtering
 */
export const getAdjustments = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const {
      page = 1,
      limit = 50,
      status,
      reason,
      skuId,
      warehouseId,
      createdBy,
      startDate,
      endDate
    } = req.query;

    const filters = {
      status: status as string,
      reason: reason as string,
      skuId: skuId as string,
      warehouseId: warehouseId as string,
      createdBy: createdBy as string,
      startDate: startDate as string,
      endDate: endDate as string
    };

    const result = await adjustmentService.getAdjustments(
      tenantId,
      filters,
      {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      }
    );

    res.status(200).json({
      status: 'success',
      data: result
    });
  }
);

/**
 * Create new inventory adjustment
 */
export const createAdjustment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;

    // Validate request body
    const { error, value } = createAdjustmentSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    // Create adjustment
    const adjustment = await adjustmentService.createAdjustment(
      tenantId,
      userId,
      value
    );

    res.status(201).json({
      status: 'success',
      message: adjustment.requiresApproval
        ? 'Adjustment created and pending approval'
        : 'Adjustment created and applied successfully',
      data: adjustment
    });
  }
);

/**
 * Get specific adjustment details
 */
export const getAdjustmentDetail = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { adjustmentId } = req.params;

    const adjustment = await adjustmentService.getAdjustmentDetail(tenantId, adjustmentId);

    if (!adjustment) {
      throw new AppError('Adjustment not found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: adjustment
    });
  }
);

/**
 * Approve pending adjustment
 */
export const approveAdjustment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const { adjustmentId } = req.params;

    const adjustment = await adjustmentService.approveAdjustment(
      tenantId,
      adjustmentId,
      userId
    );

    res.status(200).json({
      status: 'success',
      message: 'Adjustment approved and inventory updated',
      data: adjustment
    });
  }
);

/**
 * Reject pending adjustment
 */
export const rejectAdjustment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const { adjustmentId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      throw new AppError('Rejection reason is required', 400);
    }

    const adjustment = await adjustmentService.rejectAdjustment(
      tenantId,
      adjustmentId,
      userId,
      rejectionReason
    );

    res.status(200).json({
      status: 'success',
      message: 'Adjustment rejected',
      data: adjustment
    });
  }
);
