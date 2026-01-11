import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { thresholdMonitoringService } from '../services/threshold.service';
import { AlertSeverity, AlertType } from '../types/threshold.types';
import Joi from 'joi';

// Validation schemas
const getActiveAlertsSchema = Joi.object({
  skuId: Joi.string().uuid().optional(),
  warehouseId: Joi.string().uuid().optional(),
  severity: Joi.string().valid(...Object.values(AlertSeverity)).optional(),
  alertType: Joi.string().valid(...Object.values(AlertType)).optional()
});

const calculateVelocitySchema = Joi.object({
  skuId: Joi.string().uuid().required(),
  warehouseId: Joi.string().uuid().required(),
  lookbackDays: Joi.number().integer().min(1).max(90).optional()
});

/**
 * Get active alerts
 */
export const getActiveAlerts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { error, value } = getActiveAlertsSchema.validate(req.query);

  if (error) {
    return res.status(400).json({
      status: 'error',
      message: error.details[0].message
    });
  }

  const tenantId = req.user!.tenantId;
  const alerts = await thresholdMonitoringService.getActiveAlerts(tenantId, value);

  res.json({
    status: 'success',
    data: {
      alerts,
      count: alerts.length
    }
  });
});

/**
 * Get velocity metrics for a specific SKU at a warehouse
 */
export const getVelocityMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { error, value } = calculateVelocitySchema.validate(req.query);

  if (error) {
    return res.status(400).json({
      status: 'error',
      message: error.details[0].message
    });
  }

  const tenantId = req.user!.tenantId;
  const velocity = await thresholdMonitoringService.calculateVelocity(
    tenantId,
    value.skuId,
    value.warehouseId,
    value.lookbackDays
  );

  res.json({
    status: 'success',
    data: velocity
  });
});

/**
 * Trigger manual threshold check
 */
export const triggerThresholdCheck = asyncHandler(async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  const violations = await thresholdMonitoringService.checkThresholdsForTenant(tenantId);

  res.json({
    status: 'success',
    message: 'Threshold check completed',
    data: {
      violations,
      count: violations.length
    }
  });
});

/**
 * Acknowledge an alert
 */
export const acknowledgeAlert = asyncHandler(async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { alertId } = req.params;
  const userId = req.user!.userId;

  const alert = await thresholdMonitoringService.acknowledgeAlert(tenantId, alertId, userId);

  res.json({
    status: 'success',
    message: 'Alert acknowledged successfully',
    data: alert
  });
});

/**
 * Resolve an alert
 */
export const resolveAlert = asyncHandler(async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { alertId } = req.params;

  const alert = await thresholdMonitoringService.resolveAlert(tenantId, alertId);

  res.json({
    status: 'success',
    message: 'Alert resolved successfully',
    data: alert
  });
});
