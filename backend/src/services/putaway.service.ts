import { Prisma, PutawayTask, PutawayStatus, SKU, Location } from '@prisma/client';
import prisma from '../config/database';
import { generateSequentialNumber, calculatePutawayDuration } from '../utils/helpers';
import { AppError } from '../middleware/errorHandler';

export interface CreatePutawayTasksInput {
  tenantId: string;
  warehouseId: string;
  receiptType: 'ASN' | 'BLIND';
  receiptId: string;
  sourceLocationId: string;
  items: Array<{
    skuId: string;
    quantity: number;
    batchNumber?: string;
    expiryDate?: Date;
    lpn?: string;
    serialNumbers?: string[];
  }>;
}

export interface PutawayStrategy {
  strategyName: string;
  destinationLocationId: string;
  priority: number;
}

export class PutawayService {
  /**
   * Generate putaway tasks for received items
   */
  async generatePutawayTasks(input: CreatePutawayTasksInput): Promise<PutawayTask[]> {
    const tasks: PutawayTask[] = [];

    for (const item of input.items) {
      const sku = await prisma.sKU.findUnique({
        where: { id: item.skuId },
      });

      if (!sku) {
        throw new AppError(`SKU not found: ${item.skuId}`, 404);
      }

      // Determine putaway strategy and destination
      const destination = await this.determineDestination(
        sku,
        input.warehouseId,
        item.quantity,
        item.expiryDate
      );

      if (!destination) {
        throw new AppError(
          `No suitable location found for SKU: ${sku.code}`,
          400
        );
      }

      // Get source and destination locations for distance calculation
      const sourceLocation = await prisma.location.findUnique({
        where: { id: input.sourceLocationId },
      });

      // Calculate estimated duration
      const distanceMeters = this.calculateDistance(
        sourceLocation,
        destination.location
      );
      const estimatedDuration = calculatePutawayDuration(
        distanceMeters,
        item.quantity
      );

      // Generate task number
      const lastTask = await prisma.putawayTask.findFirst({
        where: { tenantId: input.tenantId },
        orderBy: { createdAt: 'desc' },
      });

      const taskNumber = generateSequentialNumber('PA', lastTask?.taskNumber);

      // Create putaway task
      const task = await prisma.putawayTask.create({
        data: {
          tenantId: input.tenantId,
          warehouseId: input.warehouseId,
          taskNumber,
          receiptType: input.receiptType,
          receiptId: input.receiptId,
          status: 'PENDING',
          priority: sku.velocity === 'FAST' ? 'HIGH' : 'NORMAL',
          skuId: item.skuId,
          skuCode: sku.code,
          productName: sku.name,
          quantityToPutaway: item.quantity,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          lpn: item.lpn,
          serialNumbers: item.serialNumbers || [],
          sourceLocationId: input.sourceLocationId,
          sourceLocationCode: sourceLocation?.code || '',
          destinationLocationId: destination.location.id,
          destinationLocationCode: destination.location.code,
          destinationZoneId: destination.location.zoneId,
          putawayStrategy: destination.strategy,
          estimatedDurationMinutes: estimatedDuration,
          distanceMeters,
          specialHandling: {
            temperatureControlled: sku.temperatureControlled,
            hazmat: sku.isHazmat,
          },
        },
      });

      // Reserve bin capacity
      await this.reserveBinCapacity(
        destination.location.id,
        item.quantity
      );

      tasks.push(task);
    }

    return tasks;
  }

  /**
   * Determine optimal destination location for putaway
   */
  private async determineDestination(
    sku: SKU,
    warehouseId: string,
    quantity: number,
    expiryDate?: Date
  ): Promise<{ location: Location; strategy: string } | null> {
    // Strategy priority:
    // 1. Hazmat → Hazmat zones
    // 2. Temperature → Temperature-controlled zones
    // 3. FEFO (perishable) → Earliest expiry bins
    // 4. FIFO (batch-tracked) → Oldest batch bins
    // 5. Velocity → Fast-movers to pick faces
    // 6. Consolidation → Same SKU bins
    // 7. Bulk → High-capacity bins in reserve

    // Hazmat items
    if (sku.isHazmat) {
      const location = await this.findHazmatLocation(warehouseId, quantity, sku.hazardClass);
      if (location) {
        return { location, strategy: 'Hazmat_Zone' };
      }
    }

    // Temperature-controlled items
    if (sku.temperatureControlled) {
      const location = await this.findTemperatureControlledLocation(
        warehouseId,
        quantity,
        sku.temperatureMin?.toNumber(),
        sku.temperatureMax?.toNumber()
      );
      if (location) {
        return { location, strategy: 'Temperature_Zone' };
      }
    }

    // FEFO for perishable items
    if (sku.isPerishable && expiryDate) {
      const location = await this.findFEFOLocation(
        warehouseId,
        sku.id,
        quantity,
        expiryDate
      );
      if (location) {
        return { location, strategy: 'FEFO' };
      }
    }

    // FIFO for batch-tracked items
    if (sku.requiresBatchTracking && !sku.isPerishable) {
      const location = await this.findFIFOLocation(warehouseId, sku.id, quantity);
      if (location) {
        return { location, strategy: 'FIFO' };
      }
    }

    // Velocity-based for fast-movers
    if (sku.velocity === 'FAST' || sku.abcClassification === 'A') {
      const location = await this.findPickFaceLocation(warehouseId, sku.id, quantity);
      if (location) {
        return { location, strategy: 'Velocity_Based' };
      }
    }

    // Consolidation - try to place with existing SKU
    const location = await this.findConsolidationLocation(
      warehouseId,
      sku.id,
      quantity
    );
    if (location) {
      return { location, strategy: 'Consolidation' };
    }

    // Bulk storage for slow-movers
    if (sku.velocity === 'SLOW' || sku.abcClassification === 'C') {
      const location = await this.findBulkStorageLocation(warehouseId, quantity);
      if (location) {
        return { location, strategy: 'Bulk_Storage' };
      }
    }

    // Fallback - any available location
    const fallbackLocation = await this.findAnyAvailableLocation(warehouseId, quantity);
    if (fallbackLocation) {
      return { location: fallbackLocation, strategy: 'General_Storage' };
    }

    return null;
  }

  /**
   * Find hazmat-certified location
   */
  private async findHazmatLocation(
    warehouseId: string,
    quantity: number,
    hazardClass?: string | null
  ): Promise<Location | null> {
    return prisma.location.findFirst({
      where: {
        warehouseId,
        status: 'ACTIVE',
        hazmatCertified: true,
        temporarilyLocked: false,
        zone: {
          zoneType: 'HAZMAT',
        },
        currentCapacityUsed: {
          lt: prisma.location.fields.maxCapacity,
        },
      },
      orderBy: [
        { currentCapacityUsed: 'asc' },
      ],
    });
  }

  /**
   * Find temperature-controlled location
   */
  private async findTemperatureControlledLocation(
    warehouseId: string,
    quantity: number,
    tempMin?: number,
    tempMax?: number
  ): Promise<Location | null> {
    return prisma.location.findFirst({
      where: {
        warehouseId,
        status: 'ACTIVE',
        refrigerated: true,
        temporarilyLocked: false,
        zone: {
          temperatureControlled: true,
        },
        currentCapacityUsed: {
          lt: prisma.location.fields.maxCapacity,
        },
      },
      orderBy: [
        { currentCapacityUsed: 'asc' },
      ],
    });
  }

  /**
   * Find location for FEFO (First Expired, First Out)
   */
  private async findFEFOLocation(
    warehouseId: string,
    skuId: string,
    quantity: number,
    expiryDate: Date
  ): Promise<Location | null> {
    // Try to find bins with same SKU for consolidation
    return prisma.location.findFirst({
      where: {
        warehouseId,
        status: 'ACTIVE',
        temporarilyLocked: false,
        zone: {
          zoneType: { in: ['STORAGE', 'PICK_FACE'] },
        },
        currentCapacityUsed: {
          lt: prisma.location.fields.maxCapacity,
        },
      },
      orderBy: [
        { heightLevel: 'asc' }, // Lower shelves for easy access
        { currentCapacityUsed: 'asc' },
      ],
    });
  }

  /**
   * Find location for FIFO (First In, First Out)
   */
  private async findFIFOLocation(
    warehouseId: string,
    skuId: string,
    quantity: number
  ): Promise<Location | null> {
    return prisma.location.findFirst({
      where: {
        warehouseId,
        status: 'ACTIVE',
        temporarilyLocked: false,
        currentCapacityUsed: {
          lt: prisma.location.fields.maxCapacity,
        },
      },
      orderBy: [
        { currentCapacityUsed: 'asc' },
      ],
    });
  }

  /**
   * Find pick face location for fast-moving items
   */
  private async findPickFaceLocation(
    warehouseId: string,
    skuId: string,
    quantity: number
  ): Promise<Location | null> {
    return prisma.location.findFirst({
      where: {
        warehouseId,
        status: 'ACTIVE',
        temporarilyLocked: false,
        locationType: 'PICK_FACE',
        zone: {
          zoneType: 'PICK_FACE',
        },
        currentCapacityUsed: {
          lt: prisma.location.fields.maxCapacity,
        },
      },
      orderBy: [
        { heightLevel: 'asc' }, // Lower shelves first
        { currentCapacityUsed: 'asc' },
      ],
    });
  }

  /**
   * Find location for consolidation (same SKU)
   */
  private async findConsolidationLocation(
    warehouseId: string,
    skuId: string,
    quantity: number
  ): Promise<Location | null> {
    // This is simplified - in real implementation, you'd check inventory records
    return prisma.location.findFirst({
      where: {
        warehouseId,
        status: 'ACTIVE',
        temporarilyLocked: false,
        currentCapacityUsed: {
          lt: prisma.location.fields.maxCapacity,
        },
      },
      orderBy: [
        { currentCapacityUsed: 'desc' }, // Fill existing bins first
      ],
    });
  }

  /**
   * Find bulk storage location for slow-moving items
   */
  private async findBulkStorageLocation(
    warehouseId: string,
    quantity: number
  ): Promise<Location | null> {
    return prisma.location.findFirst({
      where: {
        warehouseId,
        status: 'ACTIVE',
        temporarilyLocked: false,
        locationType: 'RESERVE',
        zone: {
          zoneType: 'RESERVE',
        },
        currentCapacityUsed: {
          lt: prisma.location.fields.maxCapacity,
        },
      },
      orderBy: [
        { maxCapacity: 'desc' }, // Largest bins first
        { currentCapacityUsed: 'asc' },
      ],
    });
  }

  /**
   * Find any available location (fallback)
   */
  private async findAnyAvailableLocation(
    warehouseId: string,
    quantity: number
  ): Promise<Location | null> {
    return prisma.location.findFirst({
      where: {
        warehouseId,
        status: 'ACTIVE',
        temporarilyLocked: false,
        locationType: { in: ['STORAGE', 'RESERVE'] },
        currentCapacityUsed: {
          lt: prisma.location.fields.maxCapacity,
        },
      },
      orderBy: [
        { currentCapacityUsed: 'asc' },
      ],
    });
  }

  /**
   * Reserve bin capacity for putaway task
   */
  private async reserveBinCapacity(
    locationId: string,
    quantity: number
  ): Promise<void> {
    await prisma.location.update({
      where: { id: locationId },
      data: {
        reservedCapacity: {
          increment: quantity,
        },
      },
    });
  }

  /**
   * Calculate distance between two locations (simplified)
   */
  private calculateDistance(
    source: Location | null,
    destination: Location
  ): number {
    // Simplified distance calculation
    // In real implementation, use warehouse layout/coordinates
    return 50; // Default 50 meters
  }

  /**
   * Assign putaway task to operator
   */
  async assignTask(
    taskId: string,
    operatorUserId: string,
    tenantId: string
  ): Promise<PutawayTask> {
    const task = await prisma.putawayTask.findFirst({
      where: { id: taskId, tenantId },
    });

    if (!task) {
      throw new AppError('Putaway task not found', 404);
    }

    if (task.status !== 'PENDING') {
      throw new AppError('Task already assigned or completed', 400);
    }

    return prisma.putawayTask.update({
      where: { id: taskId },
      data: {
        status: 'ASSIGNED',
        operatorUserId,
        assignedAt: new Date(),
      },
    });
  }

  /**
   * Start putaway task
   */
  async startTask(taskId: string, tenantId: string): Promise<PutawayTask> {
    const task = await prisma.putawayTask.findFirst({
      where: { id: taskId, tenantId },
    });

    if (!task) {
      throw new AppError('Putaway task not found', 404);
    }

    if (task.status !== 'ASSIGNED' && task.status !== 'PENDING') {
      throw new AppError('Task cannot be started', 400);
    }

    return prisma.putawayTask.update({
      where: { id: taskId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });
  }

  /**
   * Complete putaway task
   */
  async completeTask(
    taskId: string,
    tenantId: string,
    actualQuantity?: number,
    operatorNotes?: string
  ): Promise<PutawayTask> {
    const task = await prisma.putawayTask.findFirst({
      where: { id: taskId, tenantId },
    });

    if (!task) {
      throw new AppError('Putaway task not found', 404);
    }

    if (task.status !== 'IN_PROGRESS') {
      throw new AppError('Task must be in progress to complete', 400);
    }

    const completedAt = new Date();
    const actualDuration = task.startedAt
      ? Math.round((completedAt.getTime() - task.startedAt.getTime()) / (1000 * 60))
      : null;

    // Update bin capacity
    if (task.destinationLocationId) {
      await prisma.location.update({
        where: { id: task.destinationLocationId },
        data: {
          currentCapacityUsed: {
            increment: actualQuantity || task.quantityToPutaway.toNumber(),
          },
          reservedCapacity: {
            decrement: task.quantityToPutaway.toNumber(),
          },
        },
      });
    }

    return prisma.putawayTask.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        quantityConfirmed: actualQuantity || task.quantityToPutaway,
        completedAt,
        actualDurationMinutes: actualDuration,
        operatorNotes,
      },
    });
  }

  /**
   * Get putaway tasks for operator
   */
  async getTasks(params: {
    tenantId: string;
    warehouseId?: string;
    operatorUserId?: string;
    status?: PutawayStatus;
    page?: number;
    limit?: number;
  }) {
    const { tenantId, warehouseId, operatorUserId, status, page = 1, limit = 50 } = params;

    const where: Prisma.PutawayTaskWhereInput = {
      tenantId,
      ...(warehouseId && { warehouseId }),
      ...(operatorUserId && { operatorUserId }),
      ...(status && { status }),
    };

    const [tasks, total] = await Promise.all([
      prisma.putawayTask.findMany({
        where,
        include: {
          sku: {
            select: {
              code: true,
              name: true,
              imageUrl: true,
            },
          },
          sourceLocation: {
            select: {
              code: true,
              zone: {
                select: {
                  name: true,
                },
              },
            },
          },
          destinationLocation: {
            select: {
              code: true,
              zone: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.putawayTask.count({ where }),
    ]);

    return {
      data: tasks,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export default new PutawayService();
