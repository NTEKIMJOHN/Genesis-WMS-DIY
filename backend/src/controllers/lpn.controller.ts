import { Response, NextFunction } from 'express';
import lpnService from '../services/lpn.service';
import { AuthRequest } from '../middleware/auth';

/**
 * @swagger
 * tags:
 *   name: LPN
 *   description: License Plate Number (LPN) management
 */

/**
 * Create a new LPN
 * @route POST /api/v1/lpn
 */
export const createLPN = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const lpn = await lpnService.createLPN({
      ...req.body,
      createdById: req.user!.id,
      items: req.body.items.map((item: any) => ({
        ...item,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
      })),
    });

    res.status(201).json({
      success: true,
      message: 'LPN created successfully',
      data: lpn,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all LPNs with filters
 * @route GET /api/v1/lpn
 */
export const getLPNs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page, limit, warehouseId, status } = req.query;

    const result = await lpnService.getLPNs({
      tenantId: req.user!.tenantId,
      warehouseId: warehouseId as string,
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
 * Get LPN by ID
 * @route GET /api/v1/lpn/:id
 */
export const getLPNById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const lpn = await lpnService.getLPNById(id, req.user!.tenantId);

    if (!lpn) {
      return res.status(404).json({
        success: false,
        error: 'LPN not found',
      });
    }

    res.status(200).json({
      success: true,
      data: lpn,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get LPN by code
 * @route GET /api/v1/lpn/code/:lpnCode
 */
export const getLPNByCode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { lpnCode } = req.params;
    const lpn = await lpnService.getLPNByCode(lpnCode, req.user!.tenantId);

    if (!lpn) {
      return res.status(404).json({
        success: false,
        error: 'LPN not found',
      });
    }

    res.status(200).json({
      success: true,
      data: lpn,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Move LPN to new location
 * @route POST /api/v1/lpn/:id/move
 */
export const moveLPN = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { destinationLocationId } = req.body;

    const lpn = await lpnService.moveLPN(
      id,
      req.user!.tenantId,
      destinationLocationId,
      req.user!.id
    );

    res.status(200).json({
      success: true,
      message: 'LPN moved successfully',
      data: lpn,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update LPN status
 * @route PATCH /api/v1/lpn/:id/status
 */
export const updateLPNStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const lpn = await lpnService.updateLPNStatus(id, req.user!.tenantId, status);

    res.status(200).json({
      success: true,
      message: 'LPN status updated successfully',
      data: lpn,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Split LPN
 * @route POST /api/v1/lpn/:id/split
 */
export const splitLPN = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { items } = req.body;

    const result = await lpnService.splitLPN(
      id,
      req.user!.tenantId,
      items,
      req.user!.id
    );

    res.status(200).json({
      success: true,
      message: 'LPN split successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Archive LPN
 * @route POST /api/v1/lpn/:id/archive
 */
export const archiveLPN = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const lpn = await lpnService.archiveLPN(id, req.user!.tenantId);

    res.status(200).json({
      success: true,
      message: 'LPN archived successfully',
      data: lpn,
    });
  } catch (error) {
    next(error);
  }
};
