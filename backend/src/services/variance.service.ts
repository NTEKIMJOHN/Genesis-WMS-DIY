import { Variance, VarianceStatus, ResolutionAction, Prisma } from '@prisma/client';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

export interface GetVariancesParams {
  tenantId: string;
  warehouseId?: string;
  status?: VarianceStatus;
  priority?: string;
  varianceType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface ResolveVarianceInput {
  varianceId: string;
  tenantId: string;
  reviewedById: string;
  resolutionAction: ResolutionAction;
  supervisorNotes: string;
  adjustedQuantity?: number;
}

export class VarianceService {
  /**
   * Get variance by ID
   */
  async getVarianceById(id: string, tenantId: string): Promise<Variance | null> {
    const variance = await prisma.variance.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        asn: {
          include: {
            supplier: true,
          },
        },
        blindReceipt: true,
        sku: true,
        warehouse: true,
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
        escalatedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return variance;
  }

  /**
   * Get all variances with filters
   */
  async getVariances(params: GetVariancesParams) {
    const {
      tenantId,
      warehouseId,
      status,
      priority,
      varianceType,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50,
    } = params;

    const where: Prisma.VarianceWhereInput = {
      tenantId,
      ...(warehouseId && { warehouseId }),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(varianceType && { varianceType }),
      ...(dateFrom &&
        dateTo && {
          submittedAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        }),
    };

    const [variances, total] = await Promise.all([
      prisma.variance.findMany({
        where,
        include: {
          asn: {
            select: {
              asnNumber: true,
              supplier: {
                select: {
                  name: true,
                },
              },
            },
          },
          blindReceipt: {
            select: {
              receiptNumber: true,
              supplierName: true,
            },
          },
          sku: {
            select: {
              code: true,
              name: true,
            },
          },
          submittedBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: [{ priority: 'desc' }, { submittedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.variance.count({ where }),
    ]);

    return {
      data: variances,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get variance statistics for dashboard
   */
  async getVarianceStatistics(params: {
    tenantId: string;
    warehouseId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const { tenantId, warehouseId, dateFrom, dateTo } = params;

    const where: Prisma.VarianceWhereInput = {
      tenantId,
      ...(warehouseId && { warehouseId }),
      ...(dateFrom &&
        dateTo && {
          submittedAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        }),
    };

    const [
      total,
      pending,
      underReview,
      approved,
      rejected,
      escalated,
      byType,
      byPriority,
      totalValue,
      avgResolutionTime,
    ] = await Promise.all([
      prisma.variance.count({ where }),
      prisma.variance.count({ where: { ...where, status: 'PENDING' } }),
      prisma.variance.count({ where: { ...where, status: 'UNDER_REVIEW' } }),
      prisma.variance.count({ where: { ...where, status: 'APPROVED' } }),
      prisma.variance.count({ where: { ...where, status: 'REJECTED' } }),
      prisma.variance.count({ where: { ...where, status: 'ESCALATED' } }),
      prisma.variance.groupBy({
        by: ['varianceType'],
        where,
        _count: true,
      }),
      prisma.variance.groupBy({
        by: ['priority'],
        where,
        _count: true,
      }),
      prisma.variance.aggregate({
        where,
        _sum: {
          varianceValue: true,
        },
      }),
      this.calculateAverageResolutionTime(where),
    ]);

    return {
      total,
      byStatus: {
        pending,
        underReview,
        approved,
        rejected,
        escalated,
      },
      byType: byType.reduce((acc, item) => {
        acc[item.varianceType] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byPriority: byPriority.reduce((acc, item) => {
        acc[item.priority] = item._count;
        return acc;
      }, {} as Record<string, number>),
      totalVarianceValue: totalValue._sum.varianceValue?.toNumber() || 0,
      avgResolutionTimeHours: avgResolutionTime,
    };
  }

  /**
   * Approve variance
   */
  async approveVariance(input: ResolveVarianceInput): Promise<Variance> {
    const variance = await prisma.variance.findFirst({
      where: {
        id: input.varianceId,
        tenantId: input.tenantId,
      },
      include: {
        asn: true,
      },
    });

    if (!variance) {
      throw new AppError('Variance not found', 404);
    }

    if (variance.status !== 'PENDING' && variance.status !== 'UNDER_REVIEW') {
      throw new AppError('Variance already resolved', 400);
    }

    const resolvedVariance = await prisma.variance.update({
      where: { id: input.varianceId },
      data: {
        status: 'APPROVED',
        resolutionAction: input.resolutionAction,
        supervisorNotes: input.supervisorNotes,
        reviewedById: input.reviewedById,
        reviewedAt: new Date(),
        resolvedAt: new Date(),
      },
    });

    // If adjusting quantity, update the corresponding ASN line or blind receipt line
    if (input.adjustedQuantity !== undefined && variance.receiptLineId) {
      if (variance.receiptType === 'ASN') {
        await prisma.aSNLine.update({
          where: { id: variance.receiptLineId },
          data: {
            acceptedQuantity: input.adjustedQuantity,
            lineStatus: 'COMPLETED',
          },
        });
      }
    }

    return resolvedVariance;
  }

  /**
   * Reject variance
   */
  async rejectVariance(
    varianceId: string,
    tenantId: string,
    reviewedById: string,
    supervisorNotes: string
  ): Promise<Variance> {
    const variance = await prisma.variance.findFirst({
      where: {
        id: varianceId,
        tenantId,
      },
    });

    if (!variance) {
      throw new AppError('Variance not found', 404);
    }

    if (variance.status !== 'PENDING' && variance.status !== 'UNDER_REVIEW') {
      throw new AppError('Variance already resolved', 400);
    }

    const rejectedVariance = await prisma.variance.update({
      where: { id: varianceId },
      data: {
        status: 'REJECTED',
        resolutionAction: 'REJECT_LINE',
        supervisorNotes,
        reviewedById,
        reviewedAt: new Date(),
        resolvedAt: new Date(),
      },
    });

    // Update corresponding receipt line to correction needed
    if (variance.receiptLineId) {
      if (variance.receiptType === 'ASN') {
        await prisma.aSNLine.update({
          where: { id: variance.receiptLineId },
          data: {
            lineStatus: 'CORRECTION_NEEDED',
          },
        });
      }
    }

    return rejectedVariance;
  }

  /**
   * Escalate variance to manager
   */
  async escalateVariance(
    varianceId: string,
    tenantId: string,
    escalatedToId: string,
    escalationNotes: string
  ): Promise<Variance> {
    const variance = await prisma.variance.findFirst({
      where: {
        id: varianceId,
        tenantId,
      },
    });

    if (!variance) {
      throw new AppError('Variance not found', 404);
    }

    return prisma.variance.update({
      where: { id: varianceId },
      data: {
        status: 'ESCALATED',
        escalatedToId,
        escalatedAt: new Date(),
        supervisorNotes: escalationNotes,
      },
    });
  }

  /**
   * Update variance status to under review
   */
  async markUnderReview(
    varianceId: string,
    tenantId: string,
    reviewedById: string
  ): Promise<Variance> {
    return prisma.variance.update({
      where: { id: varianceId },
      data: {
        status: 'UNDER_REVIEW',
        reviewedById,
        reviewedAt: new Date(),
      },
    });
  }

  /**
   * Calculate average resolution time
   */
  private async calculateAverageResolutionTime(
    where: Prisma.VarianceWhereInput
  ): Promise<number> {
    const resolvedVariances = await prisma.variance.findMany({
      where: {
        ...where,
        status: { in: ['APPROVED', 'REJECTED'] },
        submittedAt: { not: null },
        resolvedAt: { not: null },
      },
      select: {
        submittedAt: true,
        resolvedAt: true,
      },
    });

    if (resolvedVariances.length === 0) return 0;

    const totalHours = resolvedVariances.reduce((sum, variance) => {
      const diff =
        variance.resolvedAt!.getTime() - variance.submittedAt.getTime();
      return sum + diff / (1000 * 60 * 60); // Convert to hours
    }, 0);

    return totalHours / resolvedVariances.length;
  }

  /**
   * Get top suppliers with variances
   */
  async getSupplierVarianceReport(params: {
    tenantId: string;
    warehouseId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  }) {
    const { tenantId, warehouseId, dateFrom, dateTo, limit = 10 } = params;

    const variances = await prisma.variance.findMany({
      where: {
        tenantId,
        ...(warehouseId && { warehouseId }),
        ...(dateFrom &&
          dateTo && {
            submittedAt: {
              gte: dateFrom,
              lte: dateTo,
            },
          }),
        asn: {
          isNot: null,
        },
      },
      include: {
        asn: {
          include: {
            supplier: true,
          },
        },
      },
    });

    const supplierStats = variances.reduce((acc, variance) => {
      const supplierName = variance.asn?.supplier.name || 'Unknown';
      if (!acc[supplierName]) {
        acc[supplierName] = {
          supplierName,
          varianceCount: 0,
          totalVarianceValue: 0,
          shortages: 0,
          overages: 0,
          damaged: 0,
        };
      }

      acc[supplierName].varianceCount++;
      acc[supplierName].totalVarianceValue +=
        variance.varianceValue?.toNumber() || 0;

      if (variance.varianceType === 'SHORTAGE') acc[supplierName].shortages++;
      if (variance.varianceType === 'OVERAGE') acc[supplierName].overages++;
      if (variance.varianceType === 'DAMAGED') acc[supplierName].damaged++;

      return acc;
    }, {} as Record<string, any>);

    return Object.values(supplierStats)
      .sort((a: any, b: any) => b.varianceCount - a.varianceCount)
      .slice(0, limit);
  }
}

export default new VarianceService();
