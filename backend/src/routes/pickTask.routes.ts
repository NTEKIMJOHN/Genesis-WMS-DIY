import { Router, Response } from 'express';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';
import { pickTaskService } from '../services/pickTask.service';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { UserRole } from '@prisma/client';

const router = Router();
router.use(authenticate);

router.post(
  '/generate',
  authorize(UserRole.WAREHOUSE_MANAGER, UserRole.WAREHOUSE_OPERATOR),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { orderIds, taskType } = req.body;
    const tenantId = req.user!.tenantId;

    const tasks = await pickTaskService.generatePickTasks(orderIds, tenantId, taskType);
    return ApiResponse.created(res, tasks, 'Pick tasks generated');
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    const task = await pickTaskService.getPickTask(id, tenantId);
    return ApiResponse.success(res, task);
  })
);

router.post(
  '/:id/start',
  authorize(UserRole.PICKER, UserRole.WAREHOUSE_OPERATOR, UserRole.WAREHOUSE_MANAGER),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;

    const task = await pickTaskService.startPickTask(id, tenantId, userId);
    return ApiResponse.success(res, task, 'Pick task started');
  })
);

router.post(
  '/:id/pick',
  authorize(UserRole.PICKER, UserRole.WAREHOUSE_OPERATOR),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;

    await pickTaskService.pickItem(id, tenantId, req.body, userId);
    return ApiResponse.success(res, null, 'Item picked successfully');
  })
);

router.post(
  '/:id/complete',
  authorize(UserRole.PICKER, UserRole.WAREHOUSE_OPERATOR),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;

    const task = await pickTaskService.completePickTask(id, tenantId, userId);
    return ApiResponse.success(res, task, 'Pick task completed');
  })
);

export default router;
