import { Response, NextFunction } from 'express';
import asnService from '../services/asn.service';
import { AuthRequest } from '../middleware/auth';

/**
 * @swagger
 * tags:
 *   name: ASN
 *   description: Advanced Shipment Notice management
 */

/**
 * Create a new ASN
 * @route POST /api/v1/asn
 */
export const createASN = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const asn = await asnService.createASN({
      ...req.body,
      createdById: req.user!.id,
    });

    res.status(201).json({
      success: true,
      message: 'ASN created successfully',
      data: asn,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all ASNs with filters
 * @route GET /api/v1/asn
 */
export const getASNs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page, limit, warehouseId, status, supplierId, dateFrom, dateTo } = req.query;

    const result = await asnService.getASNs({
      tenantId: req.user!.tenantId,
      warehouseId: warehouseId as string,
      status: status as any,
      supplierId: supplierId as string,
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
 * Get ASN by ID
 * @route GET /api/v1/asn/:id
 */
export const getASNById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const asn = await asnService.getASNById(id, req.user!.tenantId);

    if (!asn) {
      return res.status(404).json({
        success: false,
        error: 'ASN not found',
      });
    }

    res.status(200).json({
      success: true,
      data: asn,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update ASN status
 * @route PATCH /api/v1/asn/:id/status
 */
export const updateASNStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { status, actualArrivalDate } = req.body;

    const asn = await asnService.updateASNStatus(
      id,
      req.user!.tenantId,
      status,
      actualArrivalDate ? new Date(actualArrivalDate) : undefined
    );

    res.status(200).json({
      success: true,
      message: 'ASN status updated successfully',
      data: asn,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Receive an ASN line item
 * @route POST /api/v1/asn/:asnId/lines/:lineId/receive
 */
export const receiveASNLine = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { asnId, lineId } = req.params;

    const line = await asnService.receiveASNLine({
      asnId,
      lineId,
      ...req.body,
      receivedById: req.user!.id,
      expiryDateReceived: req.body.expiryDateReceived
        ? new Date(req.body.expiryDateReceived)
        : undefined,
    });

    res.status(200).json({
      success: true,
      message: 'Line received successfully',
      data: line,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Complete ASN receiving
 * @route POST /api/v1/asn/:id/complete
 */
export const completeASN = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const asn = await asnService.completeASN(
      id,
      req.user!.tenantId,
      req.user!.id
    );

    res.status(200).json({
      success: true,
      message: 'ASN completed successfully',
      data: asn,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel an ASN
 * @route DELETE /api/v1/asn/:id
 */
export const cancelASN = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const asn = await asnService.cancelASN(id, req.user!.tenantId);

    res.status(200).json({
      success: true,
      message: 'ASN cancelled successfully',
      data: asn,
    });
  } catch (error) {
    next(error);
  }
};
