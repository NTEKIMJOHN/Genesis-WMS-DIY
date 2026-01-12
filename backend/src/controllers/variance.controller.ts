import { Response, NextFunction } from 'express';
import varianceService from '../services/variance.service';
import { AuthRequest } from '../middleware/auth';

/**
 * @swagger
 * tags:
 *   name: Variances
 *   description: Variance management and resolution
 */

/**
 * Get all variances with filters
 * @route GET /api/v1/variances
 */
export const getVariances = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page, limit, warehouseId, status, priority, varianceType, dateFrom, dateTo } =
      req.query;

    const result = await varianceService.getVariances({
      tenantId: req.user!.tenantId,
      warehouseId: warehouseId as string,
      status: status as any,
      priority: priority as any,
      varianceType: varianceType as any,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
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
 * Get variance by ID
 * @route GET /api/v1/variances/:id
 */
export const getVarianceById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const variance = await varianceService.getVarianceById(id, req.user!.tenantId);

    if (!variance) {
      return res.status(404).json({
        success: false,
        error: 'Variance not found',
      });
    }

    res.status(200).json({
      success: true,
      data: variance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get variance statistics
 * @route GET /api/v1/variances/statistics
 */
export const getVarianceStatistics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { warehouseId, dateFrom, dateTo } = req.query;

    const stats = await varianceService.getVarianceStatistics({
      tenantId: req.user!.tenantId,
      warehouseId: warehouseId as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
    });

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve variance
 * @route POST /api/v1/variances/:id/approve
 */
export const approveVariance = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { resolutionAction, supervisorNotes, adjustedQuantity } = req.body;

    const variance = await varianceService.approveVariance({
      varianceId: id,
      tenantId: req.user!.tenantId,
      reviewedById: req.user!.id,
      resolutionAction,
      supervisorNotes,
      adjustedQuantity,
    });

    res.status(200).json({
      success: true,
      message: 'Variance approved successfully',
      data: variance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject variance
 * @route POST /api/v1/variances/:id/reject
 */
export const rejectVariance = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { supervisorNotes } = req.body;

    const variance = await varianceService.rejectVariance(
      id,
      req.user!.tenantId,
      req.user!.id,
      supervisorNotes
    );

    res.status(200).json({
      success: true,
      message: 'Variance rejected successfully',
      data: variance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Escalate variance
 * @route POST /api/v1/variances/:id/escalate
 */
export const escalateVariance = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { escalatedToId, escalationNotes } = req.body;

    const variance = await varianceService.escalateVariance(
      id,
      req.user!.tenantId,
      escalatedToId,
      escalationNotes
    );

    res.status(200).json({
      success: true,
      message: 'Variance escalated successfully',
      data: variance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark variance under review
 * @route POST /api/v1/variances/:id/under-review
 */
export const markUnderReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const variance = await varianceService.markUnderReview(
      id,
      req.user!.tenantId,
      req.user!.id
    );

    res.status(200).json({
      success: true,
      message: 'Variance marked as under review',
      data: variance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get supplier variance report
 * @route GET /api/v1/variances/reports/suppliers
 */
export const getSupplierVarianceReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { warehouseId, dateFrom, dateTo, limit } = req.query;

    const report = await varianceService.getSupplierVarianceReport({
      tenantId: req.user!.tenantId,
      warehouseId: warehouseId as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};
