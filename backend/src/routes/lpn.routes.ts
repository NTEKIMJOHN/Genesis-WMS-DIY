import { Router } from 'express';
import * as lpnController from '../controllers/lpn.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import {
  createLPNSchema,
  moveLPNSchema,
  splitLPNSchema,
  lpnQuerySchema,
} from '../validators/schemas';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/lpn:
 *   post:
 *     summary: Create a new LPN
 *     tags: [LPN]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: LPN created successfully
 */
router.post(
  '/',
  authorize('WAREHOUSE_RECEIVER', 'RECEIVING_SUPERVISOR', 'WAREHOUSE_MANAGER', 'PUTAWAY_OPERATOR'),
  validate(createLPNSchema),
  lpnController.createLPN
);

/**
 * @swagger
 * /api/v1/lpn:
 *   get:
 *     summary: Get all LPNs with filters
 *     tags: [LPN]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: LPNs retrieved successfully
 */
router.get('/', validateQuery(lpnQuerySchema), lpnController.getLPNs);

/**
 * @swagger
 * /api/v1/lpn/code/{lpnCode}:
 *   get:
 *     summary: Get LPN by code
 *     tags: [LPN]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lpnCode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: LPN retrieved successfully
 *       404:
 *         description: LPN not found
 */
router.get('/code/:lpnCode', lpnController.getLPNByCode);

/**
 * @swagger
 * /api/v1/lpn/{id}:
 *   get:
 *     summary: Get LPN by ID
 *     tags: [LPN]
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
 *         description: LPN retrieved successfully
 *       404:
 *         description: LPN not found
 */
router.get('/:id', lpnController.getLPNById);

/**
 * @swagger
 * /api/v1/lpn/{id}/move:
 *   post:
 *     summary: Move LPN to new location
 *     tags: [LPN]
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
 *         description: LPN moved successfully
 */
router.post(
  '/:id/move',
  authorize('PUTAWAY_OPERATOR', 'WAREHOUSE_RECEIVER', 'WAREHOUSE_MANAGER'),
  validate(moveLPNSchema),
  lpnController.moveLPN
);

/**
 * @swagger
 * /api/v1/lpn/{id}/status:
 *   patch:
 *     summary: Update LPN status
 *     tags: [LPN]
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
 *         description: LPN status updated successfully
 */
router.patch(
  '/:id/status',
  authorize('WAREHOUSE_MANAGER', 'RECEIVING_SUPERVISOR'),
  lpnController.updateLPNStatus
);

/**
 * @swagger
 * /api/v1/lpn/{id}/split:
 *   post:
 *     summary: Split LPN into multiple LPNs
 *     tags: [LPN]
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
 *         description: LPN split successfully
 */
router.post(
  '/:id/split',
  authorize('WAREHOUSE_MANAGER', 'RECEIVING_SUPERVISOR', 'PUTAWAY_OPERATOR'),
  validate(splitLPNSchema),
  lpnController.splitLPN
);

/**
 * @swagger
 * /api/v1/lpn/{id}/archive:
 *   post:
 *     summary: Archive fully consumed LPN
 *     tags: [LPN]
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
 *         description: LPN archived successfully
 */
router.post(
  '/:id/archive',
  authorize('WAREHOUSE_MANAGER', 'PLATFORM_ADMIN'),
  lpnController.archiveLPN
);

export default router;
