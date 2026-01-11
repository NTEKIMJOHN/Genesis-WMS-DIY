import { Router } from 'express';
import { orderController } from '../controllers/order.controller';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Order created successfully
 */
router.post(
  '/',
  authorize(UserRole.WAREHOUSE_MANAGER, UserRole.WAREHOUSE_OPERATOR, UserRole.TENANT_ADMIN),
  orderController.createOrder
);

/**
 * @swagger
 * /api/v1/orders:
 *   get:
 *     summary: List all orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', orderController.listOrders);

/**
 * @swagger
 * /api/v1/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', orderController.getOrder);

/**
 * @swagger
 * /api/v1/orders/{id}:
 *   put:
 *     summary: Update order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  '/:id',
  authorize(UserRole.WAREHOUSE_MANAGER, UserRole.WAREHOUSE_OPERATOR, UserRole.TENANT_ADMIN),
  orderController.updateOrder
);

/**
 * @swagger
 * /api/v1/orders/{id}/cancel:
 *   post:
 *     summary: Cancel order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/:id/cancel',
  authorize(UserRole.WAREHOUSE_MANAGER, UserRole.TENANT_ADMIN),
  orderController.cancelOrder
);

export default router;
