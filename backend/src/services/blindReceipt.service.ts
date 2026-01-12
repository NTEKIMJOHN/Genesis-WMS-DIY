import { Prisma, BlindReceipt, BlindReceiptLine, BlindReceiptStatus } from '@prisma/client';
import prisma from '../config/database';
import { generateSequentialNumber } from '../utils/helpers';
import { AppError } from '../middleware/errorHandler';

export interface CreateBlindReceiptInput {
  tenantId: string;
  warehouseId: string;
  receiptType?: 'UNPLANNED_DELIVERY' | 'SAMPLE' | 'RETURN' | 'OTHER';
  supplierName: string;
  supplierContact?: string;
  carrier?: string;
  driverName?: string;
  vehicleId?: string;
  arrivalDate: Date;
  arrivalTime: Date;
  receivingZoneId?: string;
  priority?: 'LOW' | 'STANDARD' | 'HIGH' | 'URGENT';
  specialNotes?: string;
  createdById: string;
}

export interface AddBlindReceiptLineInput {
  blindReceiptId: string;
  tenantId: string;
  lineNumber: number;
  skuId?: string;
  skuCode: string;
  productName: string;
  quantityReceived: number;
  uom: string;
  batchNumber?: string;
  expiryDate?: Date;
  lpn?: string;
  serialNumbers?: string[];
  condition?: 'GOOD' | 'DAMAGED' | 'EXPIRED' | 'UNKNOWN';
  temperatureReading?: number;
  qaHold?: boolean;
  estimatedUnitCost?: number;
  photoEvidenceUrls?: string[];
  receiverNotes?: string;
}

export class BlindReceiptService {
  /**
   * Create a new blind receipt
   */
  async createBlindReceipt(data: CreateBlindReceiptInput): Promise<BlindReceipt> {
    // Generate receipt number
    const lastReceipt = await prisma.blindReceipt.findFirst({
      where: { tenantId: data.tenantId },
      orderBy: { createdAt: 'desc' },
    });

    const receiptNumber = generateSequentialNumber('BR', lastReceipt?.receiptNumber);

    const receipt = await prisma.blindReceipt.create({
      data: {
        tenantId: data.tenantId,
        warehouseId: data.warehouseId,
        receiptNumber,
        receiptType: data.receiptType || 'UNPLANNED_DELIVERY',
        supplierName: data.supplierName,
        supplierContact: data.supplierContact,
        carrier: data.carrier,
        driverName: data.driverName,
        vehicleId: data.vehicleId,
        arrivalDate: data.arrivalDate,
        arrivalTime: data.arrivalTime,
        receivingZoneId: data.receivingZoneId,
        priority: data.priority || 'STANDARD',
        status: 'DRAFT',
        specialNotes: data.specialNotes,
        createdById: data.createdById,
      },
      include: {
        warehouse: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return receipt;
  }

  /**
   * Get blind receipt by ID
   */
  async getBlindReceiptById(id: string, tenantId: string): Promise<BlindReceipt | null> {
    const receipt = await prisma.blindReceipt.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        lines: {
          include: {
            sku: true,
          },
        },
        warehouse: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        submittedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return receipt;
  }

  /**
   * Get all blind receipts with filters
   */
  async getBlindReceipts(params: {
    tenantId: string;
    warehouseId?: string;
    status?: BlindReceiptStatus;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  }) {
    const { tenantId, warehouseId, status, dateFrom, dateTo, page = 1, limit = 50 } = params;

    const where: Prisma.BlindReceiptWhereInput = {
      tenantId,
      ...(warehouseId && { warehouseId }),
      ...(status && { status }),
      ...(dateFrom &&
        dateTo && {
          arrivalDate: {
            gte: dateFrom,
            lte: dateTo,
          },
        }),
    };

    const [receipts, total] = await Promise.all([
      prisma.blindReceipt.findMany({
        where,
        include: {
          warehouse: true,
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              lines: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.blindReceipt.count({ where }),
    ]);

    return {
      data: receipts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Add line item to blind receipt
   */
  async addLine(data: AddBlindReceiptLineInput): Promise<BlindReceiptLine> {
    const receipt = await prisma.blindReceipt.findUnique({
      where: { id: data.blindReceiptId },
      include: { lines: true },
    });

    if (!receipt) {
      throw new AppError('Blind receipt not found', 404);
    }

    if (receipt.status !== 'DRAFT') {
      throw new AppError('Cannot add lines to submitted receipt', 400);
    }

    // If SKU code provided but no SKU ID, check if SKU exists
    let skuId = data.skuId;
    if (!skuId && data.skuCode) {
      const sku = await prisma.sKU.findFirst({
        where: {
          tenantId: data.tenantId,
          code: data.skuCode,
        },
      });
      skuId = sku?.id;
    }

    const line = await prisma.blindReceiptLine.create({
      data: {
        blindReceiptId: data.blindReceiptId,
        tenantId: data.tenantId,
        lineNumber: data.lineNumber,
        skuId,
        skuCode: data.skuCode,
        productName: data.productName,
        quantityReceived: data.quantityReceived,
        uom: data.uom,
        batchNumber: data.batchNumber,
        expiryDate: data.expiryDate,
        lpn: data.lpn,
        serialNumbers: data.serialNumbers || [],
        condition: data.condition || 'GOOD',
        temperatureReading: data.temperatureReading,
        qaHold: data.qaHold || false,
        estimatedUnitCost: data.estimatedUnitCost,
        photoEvidenceUrls: data.photoEvidenceUrls || [],
        receiverNotes: data.receiverNotes,
        lineStatus: 'DRAFT',
      },
      include: {
        sku: true,
      },
    });

    // Update receipt totals
    await this.updateReceiptTotals(data.blindReceiptId);

    return line;
  }

  /**
   * Update line item
   */
  async updateLine(
    lineId: string,
    tenantId: string,
    updates: Partial<AddBlindReceiptLineInput>
  ): Promise<BlindReceiptLine> {
    const line = await prisma.blindReceiptLine.findFirst({
      where: { id: lineId, tenantId },
      include: { blindReceipt: true },
    });

    if (!line) {
      throw new AppError('Line not found', 404);
    }

    if (line.blindReceipt.status !== 'DRAFT') {
      throw new AppError('Cannot update line on submitted receipt', 400);
    }

    return prisma.blindReceiptLine.update({
      where: { id: lineId },
      data: {
        ...(updates.quantityReceived !== undefined && { quantityReceived: updates.quantityReceived }),
        ...(updates.batchNumber !== undefined && { batchNumber: updates.batchNumber }),
        ...(updates.expiryDate !== undefined && { expiryDate: updates.expiryDate }),
        ...(updates.condition !== undefined && { condition: updates.condition }),
        ...(updates.receiverNotes !== undefined && { receiverNotes: updates.receiverNotes }),
        ...(updates.photoEvidenceUrls !== undefined && { photoEvidenceUrls: updates.photoEvidenceUrls }),
      },
    });
  }

  /**
   * Delete line item
   */
  async deleteLine(lineId: string, tenantId: string): Promise<void> {
    const line = await prisma.blindReceiptLine.findFirst({
      where: { id: lineId, tenantId },
      include: { blindReceipt: true },
    });

    if (!line) {
      throw new AppError('Line not found', 404);
    }

    if (line.blindReceipt.status !== 'DRAFT') {
      throw new AppError('Cannot delete line from submitted receipt', 400);
    }

    await prisma.blindReceiptLine.delete({
      where: { id: lineId },
    });

    await this.updateReceiptTotals(line.blindReceiptId);
  }

  /**
   * Submit blind receipt for supervisor approval
   */
  async submitForApproval(
    id: string,
    tenantId: string,
    submittedById: string
  ): Promise<BlindReceipt> {
    const receipt = await prisma.blindReceipt.findFirst({
      where: { id, tenantId },
      include: { lines: true },
    });

    if (!receipt) {
      throw new AppError('Receipt not found', 404);
    }

    if (receipt.status !== 'DRAFT') {
      throw new AppError('Receipt already submitted', 400);
    }

    if (receipt.lines.length === 0) {
      throw new AppError('Cannot submit receipt with no lines', 400);
    }

    return prisma.blindReceipt.update({
      where: { id },
      data: {
        status: 'PENDING_APPROVAL',
        submittedById,
        submittedAt: new Date(),
        lines: {
          updateMany: {
            where: { blindReceiptId: id },
            data: { lineStatus: 'PENDING' },
          },
        },
      },
    });
  }

  /**
   * Supervisor approves blind receipt
   */
  async approve(
    id: string,
    tenantId: string,
    reviewedById: string,
    supervisorNotes?: string
  ): Promise<BlindReceipt> {
    const receipt = await prisma.blindReceipt.findFirst({
      where: { id, tenantId },
      include: { lines: true },
    });

    if (!receipt) {
      throw new AppError('Receipt not found', 404);
    }

    if (receipt.status !== 'PENDING_APPROVAL') {
      throw new AppError('Receipt not pending approval', 400);
    }

    // Update all lines to approved
    await prisma.blindReceiptLine.updateMany({
      where: { blindReceiptId: id },
      data: {
        lineStatus: 'COMPLETED',
        supervisorNotes,
      },
    });

    return prisma.blindReceipt.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedById,
        reviewedAt: new Date(),
      },
    });
  }

  /**
   * Supervisor rejects blind receipt
   */
  async reject(
    id: string,
    tenantId: string,
    reviewedById: string,
    rejectionReason: string
  ): Promise<BlindReceipt> {
    const receipt = await prisma.blindReceipt.findFirst({
      where: { id, tenantId },
    });

    if (!receipt) {
      throw new AppError('Receipt not found', 404);
    }

    if (receipt.status !== 'PENDING_APPROVAL') {
      throw new AppError('Receipt not pending approval', 400);
    }

    return prisma.blindReceipt.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedById,
        reviewedAt: new Date(),
        rejectionReason,
      },
    });
  }

  /**
   * Update receipt totals
   */
  private async updateReceiptTotals(receiptId: string): Promise<void> {
    const lines = await prisma.blindReceiptLine.findMany({
      where: { blindReceiptId: receiptId },
    });

    const totalLines = lines.length;
    const totalUnits = lines.reduce(
      (sum, line) => sum + line.quantityReceived.toNumber(),
      0
    );
    const estimatedValue = lines.reduce(
      (sum, line) =>
        sum + line.quantityReceived.toNumber() * (line.estimatedUnitCost?.toNumber() || 0),
      0
    );

    await prisma.blindReceipt.update({
      where: { id: receiptId },
      data: {
        totalLines,
        totalUnits,
        estimatedValue,
      },
    });
  }
}

export default new BlindReceiptService();
