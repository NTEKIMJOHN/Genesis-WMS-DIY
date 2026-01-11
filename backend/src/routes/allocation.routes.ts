import { Router, Response } from 'express';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';
import { allocationService } from '../services/allocation.service';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { UserRole } from '@prisma/client';

const router = Router();
router.use(authenticate);

router.post(
  '/:orderId/allocate',
  authorize(UserRole.WAREHOUSE_MANAGER, UserRole.WAREHOUSE_OPERATOR, UserRole.TENANT_ADMIN),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { orderId } = req.params;
    const tenantId = req.user!.tenantId;

    const result = await allocationService.allocateOrder(orderId, tenantId);
    return ApiResponse.success(res, result, 'Allocation completed');
  })
);

router.get(
  '/:orderId/check',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { orderId } = req.params;
    const tenantId = req.user!.tenantId;

    const result = await allocationService.checkAllocationAvailability(orderId, tenantId);
    return ApiResponse.success(res, result);
  })
);

export default router;
