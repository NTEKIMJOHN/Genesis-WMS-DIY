import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import * as inventoryService from '../services/inventory.service';
import { logger } from '../utils/logger';

/**
 * Get inventory overview with filtering and pagination
 */
export const getInventoryOverview = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const {
      page = 1,
      limit = 50,
      warehouseId,
      zoneId,
      categoryId,
      status,
      movementType,
      search,
      sortBy = 'last_movement_at',
      sortOrder = 'DESC'
    } = req.query;

    const filters = {
      warehouseId: warehouseId as string,
      zoneId: zoneId as string,
      categoryId: categoryId as string,
      status: status as string,
      movementType: movementType as string,
      search: search as string
    };

    const result = await inventoryService.getInventoryOverview(
      tenantId,
      filters,
      {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'ASC' | 'DESC'
      }
    );

    res.status(200).json({
      status: 'success',
      data: result
    });
  }
);

/**
 * Get detailed inventory information for specific SKU
 */
export const getInventoryDetail = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { skuId } = req.params;

    const detail = await inventoryService.getInventoryDetail(tenantId, skuId);

    if (!detail) {
      throw new AppError('Inventory not found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: detail
    });
  }
);

/**
 * Get bin-level breakdown for specific SKU
 */
export const getBinLevelInventory = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { skuId } = req.params;

    const bins = await inventoryService.getBinLevelInventory(tenantId, skuId);

    res.status(200).json({
      status: 'success',
      data: {
        skuId,
        bins,
        totalBins: bins.length,
        averageOccupancy: bins.length > 0
          ? bins.reduce((sum, bin) => sum + (bin.occupancy_percentage || 0), 0) / bins.length
          : 0
      }
    });
  }
);

/**
 * Get movement history for specific bin
 */
export const getBinMovementHistory = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { binId } = req.params;
    const {
      startDate,
      endDate,
      movementType,
      page = 1,
      limit = 50
    } = req.query;

    const filters = {
      startDate: startDate as string,
      endDate: endDate as string,
      movementType: movementType as string
    };

    const result = await inventoryService.getBinMovementHistory(
      tenantId,
      binId,
      filters,
      {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      }
    );

    res.status(200).json({
      status: 'success',
      data: result
    });
  }
);

/**
 * Export inventory data
 */
export const exportInventory = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const {
      format = 'csv',
      scope,
      skuIds,
      warehouseId,
      columns
    } = req.body;

    // Validate format
    if (!['csv', 'excel', 'pdf'].includes(format)) {
      throw new AppError('Invalid export format. Must be csv, excel, or pdf', 400);
    }

    const exportData = {
      format,
      scope,
      skuIds,
      warehouseId,
      columns,
      requestedBy: userId
    };

    // For large exports, queue the job
    const rowCount = await inventoryService.estimateExportSize(tenantId, exportData);

    if (rowCount > 2000) {
      // Queue export job
      const jobId = await inventoryService.queueExportJob(tenantId, exportData);

      res.status(202).json({
        status: 'success',
        message: 'Export job queued. You will receive an email when ready.',
        data: {
          jobId,
          estimatedRows: rowCount,
          estimatedTime: Math.ceil(rowCount / 1000) + ' minutes'
        }
      });
    } else {
      // Generate export immediately
      const exportResult = await inventoryService.generateExport(tenantId, exportData);

      res.status(200).json({
        status: 'success',
        data: exportResult
      });
    }
  }
);

/**
 * Search inventory
 */
export const searchInventory = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { q, type = 'all', limit = 20 } = req.query;

    if (!q) {
      throw new AppError('Search query is required', 400);
    }

    const results = await inventoryService.searchInventory(
      tenantId,
      q as string,
      type as string,
      parseInt(limit as string)
    );

    res.status(200).json({
      status: 'success',
      data: results
    });
  }
);
