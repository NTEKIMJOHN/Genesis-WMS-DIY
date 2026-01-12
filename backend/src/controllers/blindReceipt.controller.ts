import { Response, NextFunction } from 'express';
import blindReceiptService from '../services/blindReceipt.service';
import { AuthRequest } from '../middleware/auth';

/**
 * @swagger
 * tags:
 *   name: Blind Receipts
 *   description: Blind receiving for unplanned deliveries
 */

/**
 * Create a new blind receipt
 * @route POST /api/v1/blind-receipts
 */
export const createBlindReceipt = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const receipt = await blindReceiptService.createBlindReceipt({
      ...req.body,
      arrivalDate: new Date(req.body.arrivalDate),
      arrivalTime: new Date(req.body.arrivalTime),
      createdById: req.user!.id,
    });

    res.status(201).json({
      success: true,
      message: 'Blind receipt created successfully',
      data: receipt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all blind receipts with filters
 * @route GET /api/v1/blind-receipts
 */
export const getBlindReceipts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page, limit, warehouseId, status, dateFrom, dateTo } = req.query;

    const result = await blindReceiptService.getBlindReceipts({
      tenantId: req.user!.tenantId,
      warehouseId: warehouseId as string,
      status: status as any,
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
 * Get blind receipt by ID
 * @route GET /api/v1/blind-receipts/:id
 */
export const getBlindReceiptById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const receipt = await blindReceiptService.getBlindReceiptById(
      id,
      req.user!.tenantId
    );

    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: 'Blind receipt not found',
      });
    }

    res.status(200).json({
      success: true,
      data: receipt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add line item to blind receipt
 * @route POST /api/v1/blind-receipts/:id/lines
 */
export const addLine = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const line = await blindReceiptService.addLine({
      blindReceiptId: id,
      tenantId: req.user!.tenantId,
      ...req.body,
      expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : undefined,
    });

    res.status(201).json({
      success: true,
      message: 'Line added successfully',
      data: line,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update line item
 * @route PATCH /api/v1/blind-receipts/lines/:lineId
 */
export const updateLine = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { lineId } = req.params;

    const line = await blindReceiptService.updateLine(
      lineId,
      req.user!.tenantId,
      {
        ...req.body,
        expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : undefined,
      }
    );

    res.status(200).json({
      success: true,
      message: 'Line updated successfully',
      data: line,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete line item
 * @route DELETE /api/v1/blind-receipts/lines/:lineId
 */
export const deleteLine = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { lineId } = req.params;

    await blindReceiptService.deleteLine(lineId, req.user!.tenantId);

    res.status(200).json({
      success: true,
      message: 'Line deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit blind receipt for approval
 * @route POST /api/v1/blind-receipts/:id/submit
 */
export const submitForApproval = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const receipt = await blindReceiptService.submitForApproval(
      id,
      req.user!.tenantId,
      req.user!.id
    );

    res.status(200).json({
      success: true,
      message: 'Blind receipt submitted for approval',
      data: receipt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve blind receipt
 * @route POST /api/v1/blind-receipts/:id/approve
 */
export const approve = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { supervisorNotes } = req.body;

    const receipt = await blindReceiptService.approve(
      id,
      req.user!.tenantId,
      req.user!.id,
      supervisorNotes
    );

    res.status(200).json({
      success: true,
      message: 'Blind receipt approved successfully',
      data: receipt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject blind receipt
 * @route POST /api/v1/blind-receipts/:id/reject
 */
export const reject = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const receipt = await blindReceiptService.reject(
      id,
      req.user!.tenantId,
      req.user!.id,
      rejectionReason
    );

    res.status(200).json({
      success: true,
      message: 'Blind receipt rejected',
      data: receipt,
    });
  } catch (error) {
    next(error);
  }
};
