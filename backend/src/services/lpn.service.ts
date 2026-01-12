import { LPN, LPNContent, LPNStatus, Prisma } from '@prisma/client';
import prisma from '../config/database';
import { generateLPNCode } from '../utils/helpers';
import { AppError } from '../middleware/errorHandler';

export interface CreateLPNInput {
  tenantId: string;
  warehouseId: string;
  lpnType?: 'PALLET' | 'CARTON' | 'TOTE' | 'OTHER';
  currentLocationId?: string;
  createdById: string;
  items: Array<{
    skuId: string;
    quantity: number;
    batchNumber?: string;
    expiryDate?: Date;
    serialNumbers?: string[];
  }>;
}

export class LPNService {
  /**
   * Create a new LPN
   */
  async createLPN(input: CreateLPNInput): Promise<LPN> {
    // Get warehouse for code generation
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: input.warehouseId },
    });

    if (!warehouse) {
      throw new AppError('Warehouse not found', 404);
    }

    // Get last LPN sequence number for this warehouse
    const lastLPN = await prisma.lPN.findFirst({
      where: {
        tenantId: input.tenantId,
        warehouseId: input.warehouseId,
      },
      orderBy: { createdAt: 'desc' },
    });

    const sequence = lastLPN
      ? parseInt(lastLPN.lpnCode.split('-').pop() || '0') + 1
      : 1;

    const lpnCode = generateLPNCode(warehouse.code, sequence);

    // Calculate totals
    const totalUnits = input.items.reduce((sum, item) => sum + item.quantity, 0);
    const isMixedSku = input.items.length > 1;
    const containsBatchTracked = input.items.some((item) => !!item.batchNumber);
    const containsSerialized = input.items.some(
      (item) => item.serialNumbers && item.serialNumbers.length > 0
    );

    // Get SKU details to determine special handling
    const skuIds = input.items.map((item) => item.skuId);
    const skus = await prisma.sKU.findMany({
      where: { id: { in: skuIds } },
    });

    const containsTemperatureControlled = skus.some((sku) => sku.temperatureControlled);
    const containsHazmat = skus.some((sku) => sku.isHazmat);

    // Create LPN with contents
    const lpn = await prisma.lPN.create({
      data: {
        tenantId: input.tenantId,
        warehouseId: input.warehouseId,
        lpnCode,
        lpnType: input.lpnType || 'PALLET',
        status: 'RECEIVING',
        currentLocationId: input.currentLocationId,
        totalUnits,
        isMixedSku,
        containsBatchTracked,
        containsSerialized,
        containsTemperatureControlled,
        containsHazmat,
        createdById: input.createdById,
        contents: {
          create: input.items.map((item) => ({
            tenantId: input.tenantId,
            skuId: item.skuId,
            quantity: item.quantity,
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate,
            serialNumbers: item.serialNumbers || [],
          })),
        },
      },
      include: {
        contents: {
          include: {
            sku: true,
          },
        },
        currentLocation: true,
      },
    });

    return lpn;
  }

  /**
   * Get LPN by ID
   */
  async getLPNById(id: string, tenantId: string): Promise<LPN | null> {
    const lpn = await prisma.lPN.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        contents: {
          where: {
            removedAt: null, // Only active contents
          },
          include: {
            sku: true,
          },
        },
        currentLocation: {
          include: {
            zone: true,
          },
        },
        warehouse: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        lastMovedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return lpn;
  }

  /**
   * Get LPN by code
   */
  async getLPNByCode(lpnCode: string, tenantId: string): Promise<LPN | null> {
    return prisma.lPN.findFirst({
      where: {
        lpnCode,
        tenantId,
      },
      include: {
        contents: {
          where: {
            removedAt: null,
          },
          include: {
            sku: true,
          },
        },
        currentLocation: {
          include: {
            zone: true,
          },
        },
      },
    });
  }

  /**
   * Get all LPNs with filters
   */
  async getLPNs(params: {
    tenantId: string;
    warehouseId?: string;
    status?: LPNStatus;
    page?: number;
    limit?: number;
  }) {
    const { tenantId, warehouseId, status, page = 1, limit = 50 } = params;

    const where: Prisma.LPNWhereInput = {
      tenantId,
      ...(warehouseId && { warehouseId }),
      ...(status && { status }),
    };

    const [lpns, total] = await Promise.all([
      prisma.lPN.findMany({
        where,
        include: {
          warehouse: {
            select: {
              code: true,
              name: true,
            },
          },
          currentLocation: {
            select: {
              code: true,
              zone: {
                select: {
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              contents: {
                where: {
                  removedAt: null,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lPN.count({ where }),
    ]);

    return {
      data: lpns,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Move LPN to a new location
   */
  async moveLPN(
    id: string,
    tenantId: string,
    destinationLocationId: string,
    movedById: string
  ): Promise<LPN> {
    const lpn = await prisma.lPN.findFirst({
      where: { id, tenantId },
    });

    if (!lpn) {
      throw new AppError('LPN not found', 404);
    }

    // Verify destination location exists
    const destination = await prisma.location.findUnique({
      where: { id: destinationLocationId },
    });

    if (!destination) {
      throw new AppError('Destination location not found', 404);
    }

    return prisma.lPN.update({
      where: { id },
      data: {
        currentLocationId: destinationLocationId,
        currentZoneId: destination.zoneId,
        lastMovedById: movedById,
        lastMovedAt: new Date(),
      },
    });
  }

  /**
   * Update LPN status
   */
  async updateLPNStatus(
    id: string,
    tenantId: string,
    status: LPNStatus
  ): Promise<LPN> {
    const lpn = await prisma.lPN.findFirst({
      where: { id, tenantId },
    });

    if (!lpn) {
      throw new AppError('LPN not found', 404);
    }

    return prisma.lPN.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Split LPN - Remove items to create a new LPN
   */
  async splitLPN(
    id: string,
    tenantId: string,
    items: Array<{ skuId: string; quantity: number }>,
    createdById: string
  ): Promise<{ original: LPN; newLPN: LPN }> {
    const originalLPN = await this.getLPNById(id, tenantId);

    if (!originalLPN) {
      throw new AppError('LPN not found', 404);
    }

    if (originalLPN.status !== 'AVAILABLE') {
      throw new AppError('Can only split available LPNs', 400);
    }

    // Validate that all items exist in the original LPN
    for (const item of items) {
      const content = originalLPN.contents.find(
        (c) => c.skuId === item.skuId && c.removedAt === null
      );

      if (!content) {
        throw new AppError(`SKU ${item.skuId} not found in LPN`, 400);
      }

      if (content.quantity.toNumber() < item.quantity) {
        throw new AppError(
          `Insufficient quantity for SKU ${item.skuId}. Available: ${content.quantity}, Requested: ${item.quantity}`,
          400
        );
      }
    }

    // Create new LPN with split items
    const newLPNData = items.map((item) => {
      const content = originalLPN.contents.find((c) => c.skuId === item.skuId)!;
      return {
        skuId: item.skuId,
        quantity: item.quantity,
        batchNumber: content.batchNumber,
        expiryDate: content.expiryDate,
        serialNumbers: content.serialNumbers,
      };
    });

    const newLPN = await this.createLPN({
      tenantId,
      warehouseId: originalLPN.warehouseId,
      lpnType: originalLPN.lpnType,
      currentLocationId: originalLPN.currentLocationId || undefined,
      createdById,
      items: newLPNData,
    });

    // Update original LPN - reduce quantities or remove items
    for (const item of items) {
      const content = originalLPN.contents.find((c) => c.skuId === item.skuId)!;
      const remainingQty = content.quantity.toNumber() - item.quantity;

      if (remainingQty === 0) {
        // Remove item completely
        await prisma.lPNContent.update({
          where: { id: content.id },
          data: { removedAt: new Date() },
        });
      } else {
        // Reduce quantity
        await prisma.lPNContent.update({
          where: { id: content.id },
          data: { quantity: remainingQty },
        });
      }
    }

    // Update original LPN totals
    await this.updateLPNTotals(id);

    const updatedOriginal = await this.getLPNById(id, tenantId);

    return {
      original: updatedOriginal!,
      newLPN,
    };
  }

  /**
   * Update LPN totals
   */
  private async updateLPNTotals(lpnId: string): Promise<void> {
    const contents = await prisma.lPNContent.findMany({
      where: {
        lpnId,
        removedAt: null,
      },
    });

    const totalUnits = contents.reduce(
      (sum, content) => sum + content.quantity.toNumber(),
      0
    );

    await prisma.lPN.update({
      where: { id: lpnId },
      data: { totalUnits },
    });
  }

  /**
   * Archive LPN (when fully consumed)
   */
  async archiveLPN(id: string, tenantId: string): Promise<LPN> {
    const lpn = await this.getLPNById(id, tenantId);

    if (!lpn) {
      throw new AppError('LPN not found', 404);
    }

    const activeContents = lpn.contents.filter((c) => c.removedAt === null);

    if (activeContents.length > 0) {
      throw new AppError('Cannot archive LPN with active contents', 400);
    }

    return prisma.lPN.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }
}

export default new LPNService();
