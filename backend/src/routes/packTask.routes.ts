import { Router, Response } from 'express';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';
import { packTaskService } from '../services/packTask.service';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { UserRole } from '@prisma/client';

const router = Router();
router.use(authenticate);

router.post(
  '/generate/:orderId',
  authorize(UserRole.WAREHOUSE_MANAGER, UserRole.WAREHOUSE_OPERATOR),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { orderId } = req.params;
    const tenantId = req.user!.tenantId;

    const task = await packTaskService.generatePackTask(orderId, tenantId);
    return ApiResponse.created(res, task, 'Pack task generated');
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    const task = await packTaskService.getPackTask(id, tenantId);
    return ApiResponse.success(res, task);
  })
);

router.post(
  '/:id/start',
  authorize(UserRole.PACKER, UserRole.WAREHOUSE_OPERATOR),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;

    const task = await packTaskService.startPackTask(id, tenantId, userId);
    return ApiResponse.success(res, task, 'Pack task started');
  })
);

router.post(
  '/:id/pack',
  authorize(UserRole.PACKER, UserRole.WAREHOUSE_OPERATOR),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    await packTaskService.packItem(id, tenantId, req.body);
    return ApiResponse.success(res, null, 'Item packed successfully');
  })
);

router.post(
  '/:id/label',
  authorize(UserRole.PACKER, UserRole.WAREHOUSE_OPERATOR),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    const label = await packTaskService.generateShippingLabel(id, tenantId);
    return ApiResponse.success(res, label, 'Shipping label generated');
  })
);

router.post(
  '/:id/complete',
  authorize(UserRole.PACKER, UserRole.WAREHOUSE_OPERATOR),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;

    const task = await packTaskService.completePackTask(id, tenantId, userId);
    return ApiResponse.success(res, task, 'Pack task completed');
  })
);

export default router;
