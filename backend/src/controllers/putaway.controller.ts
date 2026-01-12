import { Response, NextFunction } from 'express';
import putawayService from '../services/putaway.service';
import { AuthRequest } from '../middleware/auth';

/**
 * @swagger
 * tags:
 *   name: Putaway
 *   description: Putaway task management and execution
 */

/**
 * Generate putaway tasks for received items
 * @route POST /api/v1/putaway/generate
 */
export const generatePutawayTasks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tasks = await putawayService.generatePutawayTasks({
      ...req.body,
      items: req.body.items.map((item: any) => ({
        ...item,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
      })),
    });

    res.status(201).json({
      success: true,
      message: 'Putaway tasks generated successfully',
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all putaway tasks with filters
 * @route GET /api/v1/putaway
 */
export const getTasks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page, limit, warehouseId, operatorUserId, status } = req.query;

    const result = await putawayService.getTasks({
      tenantId: req.user!.tenantId,
      warehouseId: warehouseId as string,
      operatorUserId: operatorUserId as string,
      status: status as any,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign putaway task to operator
 * @route POST /api/v1/putaway/:id/assign
 */
export const assignTask = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { operatorUserId } = req.body;

    const task = await putawayService.assignTask(
      id,
      operatorUserId,
      req.user!.tenantId
    );

    res.status(200).json({
      success: true,
      message: 'Task assigned successfully',
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Start putaway task
 * @route POST /api/v1/putaway/:id/start
 */
export const startTask = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const task = await putawayService.startTask(id, req.user!.tenantId);

    res.status(200).json({
      success: true,
      message: 'Task started successfully',
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Complete putaway task
 * @route POST /api/v1/putaway/:id/complete
 */
export const completeTask = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { actualQuantity, operatorNotes } = req.body;

    const task = await putawayService.completeTask(
      id,
      req.user!.tenantId,
      actualQuantity,
      operatorNotes
    );

    res.status(200).json({
      success: true,
      message: 'Task completed successfully',
      data: task,
    });
  } catch (error) {
    next(error);
  }
};
