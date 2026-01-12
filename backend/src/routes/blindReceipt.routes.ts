import { Router } from 'express';
import * as blindReceiptController from '../controllers/blindReceipt.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import {
  createBlindReceiptSchema,
  addBlindReceiptLineSchema,
  updateBlindReceiptLineSchema,
  approveBlindReceiptSchema,
  rejectBlindReceiptSchema,
  blindReceiptQuerySchema,
} from '../validators/schemas';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/blind-receipts:
 *   post:
 *     summary: Create a new blind receipt
 *     tags: [Blind Receipts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Blind receipt created successfully
 */
router.post(
  '/',
  authorize('WAREHOUSE_RECEIVER', 'RECEIVING_SUPERVISOR', 'WAREHOUSE_MANAGER'),
  validate(createBlindReceiptSchema),
  blindReceiptController.createBlindReceipt
);

/**
 * @swagger
 * /api/v1/blind-receipts:
 *   get:
 *     summary: Get all blind receipts with filters
 *     tags: [Blind Receipts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Blind receipts retrieved successfully
 */
router.get(
  '/',
  validateQuery(blindReceiptQuerySchema),
  blindReceiptController.getBlindReceipts
);

/**
 * @swagger
 * /api/v1/blind-receipts/{id}:
 *   get:
 *     summary: Get blind receipt by ID
 *     tags: [Blind Receipts]
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
 *         description: Blind receipt retrieved successfully
 *       404:
 *         description: Blind receipt not found
 */
router.get('/:id', blindReceiptController.getBlindReceiptById);

/**
 * @swagger
 * /api/v1/blind-receipts/{id}/lines:
 *   post:
 *     summary: Add line item to blind receipt
 *     tags: [Blind Receipts]
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
 *       201:
 *         description: Line added successfully
 */
router.post(
  '/:id/lines',
  authorize('WAREHOUSE_RECEIVER', 'RECEIVING_SUPERVISOR', 'WAREHOUSE_MANAGER'),
  validate(addBlindReceiptLineSchema),
  blindReceiptController.addLine
);

/**
 * @swagger
 * /api/v1/blind-receipts/lines/{lineId}:
 *   patch:
 *     summary: Update line item
 *     tags: [Blind Receipts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lineId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Line updated successfully
 */
router.patch(
  '/lines/:lineId',
  authorize('WAREHOUSE_RECEIVER', 'RECEIVING_SUPERVISOR', 'WAREHOUSE_MANAGER'),
  validate(updateBlindReceiptLineSchema),
  blindReceiptController.updateLine
);

/**
 * @swagger
 * /api/v1/blind-receipts/lines/{lineId}:
 *   delete:
 *     summary: Delete line item
 *     tags: [Blind Receipts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lineId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Line deleted successfully
 */
router.delete(
  '/lines/:lineId',
  authorize('WAREHOUSE_RECEIVER', 'RECEIVING_SUPERVISOR', 'WAREHOUSE_MANAGER'),
  blindReceiptController.deleteLine
);

/**
 * @swagger
 * /api/v1/blind-receipts/{id}/submit:
 *   post:
 *     summary: Submit blind receipt for approval
 *     tags: [Blind Receipts]
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
 *         description: Blind receipt submitted for approval
 */
router.post(
  '/:id/submit',
  authorize('WAREHOUSE_RECEIVER', 'RECEIVING_SUPERVISOR', 'WAREHOUSE_MANAGER'),
  blindReceiptController.submitForApproval
);

/**
 * @swagger
 * /api/v1/blind-receipts/{id}/approve:
 *   post:
 *     summary: Approve blind receipt
 *     tags: [Blind Receipts]
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
 *         description: Blind receipt approved successfully
 */
router.post(
  '/:id/approve',
  authorize('RECEIVING_SUPERVISOR', 'WAREHOUSE_MANAGER', 'PLATFORM_ADMIN'),
  validate(approveBlindReceiptSchema),
  blindReceiptController.approve
);

/**
 * @swagger
 * /api/v1/blind-receipts/{id}/reject:
 *   post:
 *     summary: Reject blind receipt
 *     tags: [Blind Receipts]
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
 *         description: Blind receipt rejected
 */
router.post(
  '/:id/reject',
  authorize('RECEIVING_SUPERVISOR', 'WAREHOUSE_MANAGER', 'PLATFORM_ADMIN'),
  validate(rejectBlindReceiptSchema),
  blindReceiptController.reject
);

export default router;
