import { Prisma, ASN, ASNLine, ShipmentStatus, LineStatus, VarianceType } from '@prisma/client';
import prisma from '../config/database';
import {
  generateSequentialNumber,
  calculateVariancePercentage,
  calculateVarianceQuantity,
  determineVariancePriority,
  requiresSupervisorApproval,
} from '../utils/helpers';
import { AppError } from '../middleware/errorHandler';

export interface CreateASNInput {
  tenantId: string;
  warehouseId: string;
  poNumber?: string;
  supplierId: string;
  supplierName: string;
  carrier?: string;
  trackingNumber?: string;
  expectedArrivalDate: Date;
  receivingZoneId?: string;
  priority?: 'LOW' | 'STANDARD' | 'HIGH' | 'URGENT' | 'CRITICAL';
  specialInstructions?: string;
  temperatureControlled?: boolean;
  hazmatFlag?: boolean;
  createdById: string;
  lines: Array<{
    lineNumber: number;
    skuId: string;
    skuCode: string;
    productName: string;
    expectedQuantity: number;
    uom: string;
    batchNumberExpected?: string;
    expiryDateExpected?: Date;
    lpnExpected?: string;
  }>;
}

export interface ReceiveASNLineInput {
  asnId: string;
  lineId: string;
  receivedQuantity: number;
  batchNumberReceived?: string;
  expiryDateReceived?: Date;
  lpnReceived?: string;
  serialNumbers?: string[];
  temperatureReading?: number;
  weight?: number;
  dimensions?: any;
  qaHold?: boolean;
  photoEvidenceUrls?: string[];
  varianceNotes?: string;
  receivedById: string;
}

export class ASNService {
  /**
   * Create a new ASN
   */
  async createASN(data: CreateASNInput): Promise<ASN> {
    // Generate ASN number
    const lastASN = await prisma.aSN.findFirst({
      where: { tenantId: data.tenantId },
      orderBy: { createdAt: 'desc' },
    });

    const asnNumber = generateSequentialNumber('ASN', lastASN?.asnNumber);

    // Calculate totals
    const totalExpectedLines = data.lines.length;
    const totalExpectedUnits = data.lines.reduce(
      (sum, line) => sum + line.expectedQuantity,
      0
    );

    // Create ASN with lines
    const asn = await prisma.aSN.create({
      data: {
        tenantId: data.tenantId,
        warehouseId: data.warehouseId,
        asnNumber,
        poNumber: data.poNumber,
        supplierId: data.supplierId,
        supplierName: data.supplierName,
        carrier: data.carrier,
        trackingNumber: data.trackingNumber,
        expectedArrivalDate: data.expectedArrivalDate,
        receivingZoneId: data.receivingZoneId,
        priority: data.priority || 'STANDARD',
        shipmentStatus: 'CREATED',
        totalExpectedLines,
        totalExpectedUnits,
        specialInstructions: data.specialInstructions,
        temperatureControlled: data.temperatureControlled || false,
        hazmatFlag: data.hazmatFlag || false,
        createdById: data.createdById,
        lines: {
          create: data.lines.map((line) => ({
            tenantId: data.tenantId,
            lineNumber: line.lineNumber,
            skuId: line.skuId,
            skuCode: line.skuCode,
            productName: line.productName,
            expectedQuantity: line.expectedQuantity,
            uom: line.uom,
            batchNumberExpected: line.batchNumberExpected,
            expiryDateExpected: line.expiryDateExpected,
            lpnExpected: line.lpnExpected,
            lineStatus: 'PENDING',
          })),
        },
      },
      include: {
        lines: true,
        supplier: true,
        warehouse: true,
      },
    });

    return asn;
  }

  /**
   * Get ASN by ID with all details
   */
  async getASNById(id: string, tenantId: string): Promise<ASN | null> {
    const asn = await prisma.aSN.findFirst({
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
        supplier: true,
        warehouse: true,
        receivingZone: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        receivedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return asn;
  }

  /**
   * Get all ASNs for a warehouse with filters
   */
  async getASNs(params: {
    tenantId: string;
    warehouseId?: string;
    status?: ShipmentStatus;
    supplierId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  }) {
    const { tenantId, warehouseId, status, supplierId, dateFrom, dateTo, page = 1, limit = 50 } = params;

    const where: Prisma.ASNWhereInput = {
      tenantId,
      ...(warehouseId && { warehouseId }),
      ...(status && { shipmentStatus: status }),
      ...(supplierId && { supplierId }),
      ...(dateFrom &&
        dateTo && {
          expectedArrivalDate: {
            gte: dateFrom,
            lte: dateTo,
          },
        }),
    };

    const [asns, total] = await Promise.all([
      prisma.aSN.findMany({
        where,
        include: {
          supplier: true,
          warehouse: true,
          _count: {
            select: {
              lines: true,
              variances: true,
            },
          },
        },
        orderBy: { expectedArrivalDate: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.aSN.count({ where }),
    ]);

    return {
      data: asns,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update ASN status (e.g., mark as arrived, start receiving)
   */
  async updateASNStatus(
    id: string,
    tenantId: string,
    status: ShipmentStatus,
    actualArrivalDate?: Date
  ): Promise<ASN> {
    const asn = await prisma.aSN.findFirst({
      where: { id, tenantId },
    });

    if (!asn) {
      throw new AppError('ASN not found', 404);
    }

    return prisma.aSN.update({
      where: { id },
      data: {
        shipmentStatus: status,
        ...(actualArrivalDate && { actualArrivalDate }),
      },
    });
  }

  /**
   * Receive an ASN line item
   */
  async receiveASNLine(data: ReceiveASNLineInput): Promise<ASNLine> {
    const line = await prisma.aSNLine.findUnique({
      where: { id: data.lineId },
      include: {
        sku: true,
        asn: true,
      },
    });

    if (!line) {
      throw new AppError('ASN line not found', 404);
    }

    if (line.lineStatus === 'COMPLETED') {
      throw new AppError('ASN line already received', 400);
    }

    // Calculate variance
    const varianceQty = calculateVarianceQuantity(
      line.expectedQuantity,
      data.receivedQuantity
    );
    const variancePct = calculateVariancePercentage(
      line.expectedQuantity,
      data.receivedQuantity
    );

    let lineStatus: LineStatus = 'COMPLETED';
    let varianceType: VarianceType | null = null;

    // Determine variance type
    if (varianceQty !== 0) {
      lineStatus = 'VARIANCE';
      if (varianceQty < 0) {
        varianceType = 'SHORTAGE';
      } else {
        varianceType = 'OVERAGE';
      }
    }

    // Update the line
    const updatedLine = await prisma.aSNLine.update({
      where: { id: data.lineId },
      data: {
        receivedQuantity: data.receivedQuantity,
        acceptedQuantity: data.qaHold ? 0 : data.receivedQuantity,
        batchNumberReceived: data.batchNumberReceived,
        expiryDateReceived: data.expiryDateReceived,
        lpnReceived: data.lpnReceived,
        serialNumbers: data.serialNumbers || [],
        temperatureReading: data.temperatureReading,
        weight: data.weight,
        dimensions: data.dimensions,
        qaHold: data.qaHold || false,
        photoEvidenceUrls: data.photoEvidenceUrls || [],
        varianceNotes: data.varianceNotes,
        lineStatus,
        varianceType,
        receivedAt: new Date(),
      },
    });

    // Create variance record if needed
    if (varianceType && requiresSupervisorApproval(variancePct, Math.abs(varianceQty) * (line.sku.unitCost?.toNumber() || 0))) {
      const priority = determineVariancePriority(
        variancePct,
        Math.abs(varianceQty) * (line.sku.unitCost?.toNumber() || 0)
      );

      await prisma.variance.create({
        data: {
          tenantId: line.tenantId,
          warehouseId: line.asn.warehouseId,
          receiptType: 'ASN',
          asnId: line.asnId,
          receiptLineId: line.id,
          skuId: line.skuId,
          skuCode: line.skuCode,
          productName: line.productName,
          varianceType,
          expectedQuantity: line.expectedQuantity,
          receivedQuantity: data.receivedQuantity,
          varianceQuantity: varianceQty,
          variancePercentage: variancePct,
          varianceValue: Math.abs(varianceQty) * (line.sku.unitCost?.toNumber() || 0),
          reasonCode: data.varianceNotes || 'UNSPECIFIED',
          receiverNotes: data.varianceNotes,
          photoEvidenceUrls: data.photoEvidenceUrls || [],
          temperatureReading: data.temperatureReading,
          batchNumber: data.batchNumberReceived,
          expiryDate: data.expiryDateReceived,
          status: 'PENDING',
          priority,
          submittedById: data.receivedById,
        },
      });
    }

    // Update ASN totals
    await this.updateASNTotals(data.asnId);

    return updatedLine;
  }

  /**
   * Complete ASN receiving
   */
  async completeASN(
    id: string,
    tenantId: string,
    receivedById: string
  ): Promise<ASN> {
    const asn = await prisma.aSN.findFirst({
      where: { id, tenantId },
      include: { lines: true },
    });

    if (!asn) {
      throw new AppError('ASN not found', 404);
    }

    // Check if all lines are completed or have variances
    const pendingLines = asn.lines.filter(
      (line) => line.lineStatus === 'PENDING' || line.lineStatus === 'RECEIVING'
    );

    if (pendingLines.length > 0) {
      throw new AppError(
        `Cannot complete ASN. ${pendingLines.length} lines are still pending`,
        400
      );
    }

    return prisma.aSN.update({
      where: { id },
      data: {
        shipmentStatus: 'COMPLETED',
        receivedById,
        receivedAt: new Date(),
      },
    });
  }

  /**
   * Update ASN totals (received lines/units, variance count)
   */
  private async updateASNTotals(asnId: string): Promise<void> {
    const lines = await prisma.aSNLine.findMany({
      where: { asnId },
    });

    const totalReceivedLines = lines.filter(
      (line) => line.lineStatus === 'COMPLETED' || line.lineStatus === 'VARIANCE'
    ).length;

    const totalReceivedUnits = lines.reduce(
      (sum, line) => sum + line.receivedQuantity.toNumber(),
      0
    );

    const varianceCount = lines.filter(
      (line) => line.lineStatus === 'VARIANCE'
    ).length;

    await prisma.aSN.update({
      where: { id: asnId },
      data: {
        totalReceivedLines,
        totalReceivedUnits,
        varianceCount,
      },
    });
  }

  /**
   * Cancel an ASN
   */
  async cancelASN(id: string, tenantId: string): Promise<ASN> {
    const asn = await prisma.aSN.findFirst({
      where: { id, tenantId },
    });

    if (!asn) {
      throw new AppError('ASN not found', 404);
    }

    if (asn.shipmentStatus === 'COMPLETED') {
      throw new AppError('Cannot cancel completed ASN', 400);
    }

    return prisma.aSN.update({
      where: { id },
      data: {
        shipmentStatus: 'CANCELLED',
      },
    });
  }
}

export default new ASNService();
