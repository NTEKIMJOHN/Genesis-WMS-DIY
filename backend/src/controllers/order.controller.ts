import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { orderService, CreateOrderDTO, UpdateOrderDTO, OrderFilters } from '../services/order.service';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';

export class OrderController {
  createOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;

    const orderData: CreateOrderDTO = {
      ...req.body,
      tenantId,
      createdById: userId,
    };

    const order = await orderService.createOrder(orderData);
    return ApiResponse.created(res, order, 'Order created successfully');
  });

  getOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    const order = await orderService.getOrderById(id, tenantId);
    return ApiResponse.success(res, order);
  });

  listOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const filters: OrderFilters = {
      tenantId,
      warehouseId: req.query.warehouseId as string,
      customerId: req.query.customerId as string,
      status: req.query.status as any,
      orderType: req.query.orderType as any,
      priority: req.query.priority as any,
      search: req.query.search as string,
    };

    const { orders, total } = await orderService.listOrders(filters, page, limit);
    return ApiResponse.paginated(res, orders, page, limit, total);
  });

  updateOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;

    const updateData: UpdateOrderDTO = req.body;

    const order = await orderService.updateOrder(id, tenantId, updateData, userId);
    return ApiResponse.success(res, order, 'Order updated successfully');
  });

  cancelOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;

    const order = await orderService.cancelOrder(id, tenantId, reason, userId);
    return ApiResponse.success(res, order, 'Order cancelled successfully');
  });
}

export const orderController = new OrderController();
