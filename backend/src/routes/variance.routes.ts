import { Router } from 'express';
import * as varianceController from '../controllers/variance.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import {
  resolveVarianceSchema,
  rejectVarianceSchema,
  escalateVarianceSchema,
  varianceQuerySchema,
} from '../validators/schemas';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/variances/statistics:
 *   get:
 *     summary: Get variance statistics for dashboard
 *     tags: [Variances]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Variance statistics retrieved successfully
 */
router.get(
  '/statistics',
  authorize('RECEIVING_SUPERVISOR', 'WAREHOUSE_MANAGER', 'BUYER', 'PLATFORM_ADMIN'),
  varianceController.getVarianceStatistics
);

/**
 * @swagger
 * /api/v1/variances/reports/suppliers:
 *   get:
 *     summary: Get supplier variance report
 *     tags: [Variances]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Supplier variance report retrieved successfully
 */
router.get(
  '/reports/suppliers',
  authorize('RECEIVING_SUPERVISOR', 'WAREHOUSE_MANAGER', 'BUYER', 'PLATFORM_ADMIN'),
  varianceController.getSupplierVarianceReport
);

/**
 * @swagger
 * /api/v1/variances:
 *   get:
 *     summary: Get all variances with filters
 *     tags: [Variances]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Variances retrieved successfully
 */
router.get('/', validateQuery(varianceQuerySchema), varianceController.getVariances);

/**
 * @swagger
 * /api/v1/variances/{id}:
 *   get:
 *     summary: Get variance by ID
 *     tags: [Variances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Variance retrieved successfully
 *       404:
 *         description: Variance not found
 */
router.get('/:id', varianceController.getVarianceById);

/**
 * @swagger
 * /api/v1/variances/{id}/approve:
 *   post:
 *     summary: Approve variance
 *     tags: [Variances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Variance approved successfully
 */
router.post(
  '/:id/approve',
  authorize('RECEIVING_SUPERVISOR', 'WAREHOUSE_MANAGER', 'PLATFORM_ADMIN'),
  validate(resolveVarianceSchema),
  varianceController.approveVariance
);

/**
 * @swagger
 * /api/v1/variances/{id}/reject:
 *   post:
 *     summary: Reject variance
 *     tags: [Variances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Variance rejected successfully
 */
router.post(
  '/:id/reject',
  authorize('RECEIVING_SUPERVISOR', 'WAREHOUSE_MANAGER', 'PLATFORM_ADMIN'),
  validate(rejectVarianceSchema),
  varianceController.rejectVariance
);

/**
 * @swagger
 * /api/v1/variances/{id}/escalate:
 *   post:
 *     summary: Escalate variance to higher authority
 *     tags: [Variances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Variance escalated successfully
 */
router.post(
  '/:id/escalate',
  authorize('RECEIVING_SUPERVISOR', 'WAREHOUSE_MANAGER'),
  validate(escalateVarianceSchema),
  varianceController.escalateVariance
);

/**
 * @swagger
 * /api/v1/variances/{id}/under-review:
 *   post:
 *     summary: Mark variance as under review
 *     tags: [Variances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Variance marked as under review
 */
router.post(
  '/:id/under-review',
  authorize('RECEIVING_SUPERVISOR', 'WAREHOUSE_MANAGER'),
  varianceController.markUnderReview
);

export default router;
