import { Router, Response } from 'express';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';
import { shipmentService } from '../services/shipment.service';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { UserRole } from '@prisma/client';

const router = Router();
router.use(authenticate);

router.post(
  '/',
  authorize(UserRole.DISPATCHER, UserRole.WAREHOUSE_MANAGER),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;

    const shipment = await shipmentService.createShipment({
      ...req.body,
      tenantId,
      createdById: userId,
    });

    return ApiResponse.created(res, shipment, 'Shipment created successfully');
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    const shipment = await shipmentService.getShipmentById(id, tenantId);
    return ApiResponse.success(res, shipment);
  })
);

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const filters = {
      warehouseId: req.query.warehouseId as string,
      orderId: req.query.orderId as string,
      deliveryStatus: req.query.deliveryStatus as any,
      carrier: req.query.carrier as string,
    };

    const { shipments, total } = await shipmentService.listShipments(
      tenantId,
      filters,
      page,
      limit
    );

    return ApiResponse.paginated(res, shipments, page, limit, total);
  })
);

router.put(
  '/:id/status',
  authorize(UserRole.DISPATCHER, UserRole.WAREHOUSE_MANAGER),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const { deliveryStatus, deliveryNotes, actualDeliveryDate, signedBy, proofOfDeliveryUrl } =
      req.body;

    const shipment = await shipmentService.updateDeliveryStatus(
      id,
      tenantId,
      deliveryStatus,
      deliveryNotes,
      actualDeliveryDate,
      signedBy,
      proofOfDeliveryUrl
    );

    return ApiResponse.success(res, shipment, 'Shipment status updated');
  })
);

router.get(
  '/track/:trackingNumber',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { trackingNumber } = req.params;

    const tracking = await shipmentService.trackShipment(trackingNumber);
    return ApiResponse.success(res, tracking);
  })
);

export default router;
