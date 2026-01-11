import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as batchController from '../controllers/batch.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/batches
 * @desc    Get all batches with filtering
 * @access  Private
 */
router.get('/', batchController.getBatches);

/**
 * @route   GET /api/v1/batches/expiring
 * @desc    Get batches nearing expiry
 * @access  Private
 */
router.get('/expiring', batchController.getBatchesNearingExpiry);

/**
 * @route   GET /api/v1/batches/expiry-summary
 * @desc    Get expiry summary
 * @access  Private
 */
router.get('/expiry-summary', batchController.getExpirySummary);

/**
 * @route   POST /api/v1/batches/allocate-fefo
 * @desc    Allocate batches using FEFO logic
 * @access  Private (Warehouse Associate+)
 */
router.post(
  '/allocate-fefo',
  authorize('warehouse_associate', 'warehouse_manager', 'inventory_analyst', 'tenant_admin'),
  batchController.allocateBatchesFEFO
);

/**
 * @route   POST /api/v1/batches
 * @desc    Create a new batch
 * @access  Private (Warehouse Associate+)
 */
router.post(
  '/',
  authorize('warehouse_associate', 'warehouse_manager', 'inventory_analyst', 'tenant_admin'),
  batchController.createBatch
);

/**
 * @route   GET /api/v1/batches/:batchId
 * @desc    Get batch by ID
 * @access  Private
 */
router.get('/:batchId', batchController.getBatchById);

/**
 * @route   PATCH /api/v1/batches/:batchId/status
 * @desc    Update batch status (QA approval, etc.)
 * @access  Private (QA Supervisor+)
 */
router.patch(
  '/:batchId/status',
  authorize('qa_supervisor', 'warehouse_manager', 'inventory_analyst', 'tenant_admin'),
  batchController.updateBatchStatus
);

/**
 * @route   POST /api/v1/batches/trigger-expiry-check
 * @desc    Manually trigger expiry check
 * @access  Private (Manager+)
 */
router.post(
  '/trigger-expiry-check',
  authorize('warehouse_manager', 'inventory_analyst', 'tenant_admin'),
  batchController.triggerExpiryCheck
);

export default router;
