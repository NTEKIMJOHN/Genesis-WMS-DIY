import { Router } from 'express';
import * as asnController from '../controllers/asn.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import {
  createASNSchema,
  receiveASNLineSchema,
  updateASNStatusSchema,
  asnQuerySchema,
} from '../validators/schemas';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/asn:
 *   post:
 *     summary: Create a new ASN
 *     tags: [ASN]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: ASN created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/',
  authorize('WAREHOUSE_MANAGER', 'RECEIVING_SUPERVISOR', 'BUYER', 'PLATFORM_ADMIN'),
  validate(createASNSchema),
  asnController.createASN
);

/**
 * @swagger
 * /api/v1/asn:
 *   get:
 *     summary: Get all ASNs with filters
 *     tags: [ASN]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: warehouseId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: supplierId
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: ASNs retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', validateQuery(asnQuerySchema), asnController.getASNs);

/**
 * @swagger
 * /api/v1/asn/{id}:
 *   get:
 *     summary: Get ASN by ID
 *     tags: [ASN]
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
 *         description: ASN retrieved successfully
 *       404:
 *         description: ASN not found
 */
router.get('/:id', asnController.getASNById);

/**
 * @swagger
 * /api/v1/asn/{id}/status:
 *   patch:
 *     summary: Update ASN status
 *     tags: [ASN]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [CREATED, IN_TRANSIT, ARRIVED, RECEIVING, COMPLETED, CANCELLED]
 *               actualArrivalDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: ASN not found
 */
router.patch(
  '/:id/status',
  authorize('WAREHOUSE_MANAGER', 'RECEIVING_SUPERVISOR', 'WAREHOUSE_RECEIVER'),
  validate(updateASNStatusSchema),
  asnController.updateASNStatus
);

/**
 * @swagger
 * /api/v1/asn/{asnId}/lines/{lineId}/receive:
 *   post:
 *     summary: Receive an ASN line item
 *     tags: [ASN]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: asnId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: lineId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Line received successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Line not found
 */
router.post(
  '/:asnId/lines/:lineId/receive',
  authorize('WAREHOUSE_RECEIVER', 'RECEIVING_SUPERVISOR', 'WAREHOUSE_MANAGER'),
  validate(receiveASNLineSchema),
  asnController.receiveASNLine
);

/**
 * @swagger
 * /api/v1/asn/{id}/complete:
 *   post:
 *     summary: Complete ASN receiving
 *     tags: [ASN]
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
 *         description: ASN completed successfully
 *       400:
 *         description: Cannot complete ASN with pending lines
 *       404:
 *         description: ASN not found
 */
router.post(
  '/:id/complete',
  authorize('WAREHOUSE_RECEIVER', 'RECEIVING_SUPERVISOR', 'WAREHOUSE_MANAGER'),
  asnController.completeASN
);

/**
 * @swagger
 * /api/v1/asn/{id}:
 *   delete:
 *     summary: Cancel an ASN
 *     tags: [ASN]
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
 *         description: ASN cancelled successfully
 *       400:
 *         description: Cannot cancel completed ASN
 *       404:
 *         description: ASN not found
 */
router.delete(
  '/:id',
  authorize('WAREHOUSE_MANAGER', 'RECEIVING_SUPERVISOR', 'PLATFORM_ADMIN'),
  asnController.cancelASN
);

export default router;
