import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as thresholdController from '../controllers/threshold.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/alerts
 * @desc    Get active alerts
 * @access  Private
 */
router.get('/', thresholdController.getActiveAlerts);

/**
 * @route   GET /api/v1/alerts/velocity
 * @desc    Get velocity metrics for SKU
 * @access  Private
 */
router.get('/velocity', thresholdController.getVelocityMetrics);

/**
 * @route   POST /api/v1/alerts/check
 * @desc    Trigger manual threshold check
 * @access  Private (Manager+)
 */
router.post(
  '/check',
  authorize('warehouse_manager', 'inventory_analyst', 'tenant_admin'),
  thresholdController.triggerThresholdCheck
);

/**
 * @route   PATCH /api/v1/alerts/:alertId/acknowledge
 * @desc    Acknowledge an alert
 * @access  Private
 */
router.patch('/:alertId/acknowledge', thresholdController.acknowledgeAlert);

/**
 * @route   PATCH /api/v1/alerts/:alertId/resolve
 * @desc    Resolve an alert
 * @access  Private (Manager+)
 */
router.patch(
  '/:alertId/resolve',
  authorize('warehouse_manager', 'inventory_analyst', 'tenant_admin'),
  thresholdController.resolveAlert
);

export default router;
