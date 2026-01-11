import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as adjustmentController from '../controllers/adjustment.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/adjustments
 * @desc    Get all inventory adjustments with filtering
 * @access  Manager, Analyst, Admin
 */
router.get(
  '/',
  authorize('warehouse_manager', 'inventory_analyst', 'qa_supervisor', 'tenant_admin'),
  adjustmentController.getAdjustments
);

/**
 * @route   POST /api/v1/adjustments
 * @desc    Create new inventory adjustment
 * @access  Manager, Analyst, QA Supervisor, Admin
 */
router.post(
  '/',
  authorize('warehouse_manager', 'inventory_analyst', 'qa_supervisor', 'tenant_admin'),
  adjustmentController.createAdjustment
);

/**
 * @route   GET /api/v1/adjustments/:adjustmentId
 * @desc    Get specific adjustment details
 * @access  Manager, Analyst, QA Supervisor, Admin
 */
router.get(
  '/:adjustmentId',
  authorize('warehouse_manager', 'inventory_analyst', 'qa_supervisor', 'tenant_admin'),
  adjustmentController.getAdjustmentDetail
);

/**
 * @route   PATCH /api/v1/adjustments/:adjustmentId/approve
 * @desc    Approve pending adjustment
 * @access  Manager, Admin
 */
router.patch(
  '/:adjustmentId/approve',
  authorize('warehouse_manager', 'tenant_admin'),
  adjustmentController.approveAdjustment
);

/**
 * @route   PATCH /api/v1/adjustments/:adjustmentId/reject
 * @desc    Reject pending adjustment
 * @access  Manager, Admin
 */
router.patch(
  '/:adjustmentId/reject',
  authorize('warehouse_manager', 'tenant_admin'),
  adjustmentController.rejectAdjustment
);

export default router;
