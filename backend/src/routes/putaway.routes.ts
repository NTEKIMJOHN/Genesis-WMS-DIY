import { Router } from 'express';
import * as putawayController from '../controllers/putaway.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import {
  createPutawayTasksSchema,
  assignPutawayTaskSchema,
  completePutawayTaskSchema,
  putawayQuerySchema,
} from '../validators/schemas';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/putaway/generate:
 *   post:
 *     summary: Generate putaway tasks for received items
 *     tags: [Putaway]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Putaway tasks generated successfully
 */
router.post(
  '/generate',
  authorize('RECEIVING_SUPERVISOR', 'WAREHOUSE_MANAGER', 'PLATFORM_ADMIN'),
  validate(createPutawayTasksSchema),
  putawayController.generatePutawayTasks
);

/**
 * @swagger
 * /api/v1/putaway:
 *   get:
 *     summary: Get all putaway tasks with filters
 *     tags: [Putaway]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Putaway tasks retrieved successfully
 */
router.get('/', validateQuery(putawayQuerySchema), putawayController.getTasks);

/**
 * @swagger
 * /api/v1/putaway/{id}/assign:
 *   post:
 *     summary: Assign putaway task to operator
 *     tags: [Putaway]
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
 *         description: Task assigned successfully
 */
router.post(
  '/:id/assign',
  authorize('WAREHOUSE_MANAGER', 'RECEIVING_SUPERVISOR'),
  validate(assignPutawayTaskSchema),
  putawayController.assignTask
);

/**
 * @swagger
 * /api/v1/putaway/{id}/start:
 *   post:
 *     summary: Start putaway task
 *     tags: [Putaway]
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
 *         description: Task started successfully
 */
router.post(
  '/:id/start',
  authorize('PUTAWAY_OPERATOR', 'WAREHOUSE_RECEIVER', 'WAREHOUSE_MANAGER'),
  putawayController.startTask
);

/**
 * @swagger
 * /api/v1/putaway/{id}/complete:
 *   post:
 *     summary: Complete putaway task
 *     tags: [Putaway]
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
 *         description: Task completed successfully
 */
router.post(
  '/:id/complete',
  authorize('PUTAWAY_OPERATOR', 'WAREHOUSE_RECEIVER', 'WAREHOUSE_MANAGER'),
  validate(completePutawayTaskSchema),
  putawayController.completeTask
);

export default router;
