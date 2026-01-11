import { PackTask, PackTaskStatus, PackLineStatus, OrderStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { eventBus } from '../config/redis';
import { logger } from '../utils/logger';

export interface PackItemDTO {
  packTaskLineId: string;
  quantityPacked: number;
  cartonNumber?: number;
  varianceReason?: string;
}

export interface CartonDTO {
  cartonNumber: number;
  weight?: number;
  dimensions?: { length: number; width: number; height: number };
  items: {
    sku: string;
    quantity: number;
    batchNumber?: string;
  }[];
}

export class PackTaskService {
  /**
   * Generate pack task for picked order
   */
  async generatePackTask(orderId: string, tenantId: string): Promise<PackTask> {
    try {
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          tenantId,
          status: OrderStatus.PICKED,
        },
        include: {
          orderLines: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!order) {
        throw new AppError(404, 'Picked order not found');
      }

      const taskNumber = await this.generateTaskNumber(tenantId, 'PACK');

      const packTask = await prisma.$transaction(async (tx) => {
        // Calculate total items to pack
        const totalItemsToPack = order.orderLines.reduce(
          (sum, line) => sum + Number(line.quantityPicked),
          0
        );

        // Create pack task
        const task = await tx.packTask.create({
          data: {
            tenantId,
            warehouseId: order.warehouseId,
            orderId: order.id,
            status: PackTaskStatus.PENDING,
            totalItemsToPack,
            carrier: order.carrier,
            serviceLevel: order.serviceLevel,
          },
        });

        // Create pack task lines
        await tx.packTaskLine.createMany({
          data: order.orderLines.map((line) => ({
            tenantId,
            packTaskId: task.id,
            orderLineId: line.id,
            productId: line.productId,
            quantityToPack: Number(line.quantityPicked),
          })),
        });

        // Update order status
        await tx.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.PACKING },
        });

        await tx.orderEvent.create({
          data: {
            orderId,
            eventType: 'pack.task_created',
            description: `Pack task ${taskNumber} created`,
            metadata: { packTaskId: task.id },
          },
        });

        return task;
      });

      await eventBus.publish('pack.task_created', {
        packTaskId: packTask.id,
        orderId,
        tenantId,
        timestamp: new Date(),
      });

      logger.info(`Pack task created for order`, { orderId, packTaskId: packTask.id });

      return packTask;
    } catch (error) {
      logger.error('Failed to generate pack task:', error);
      throw error;
    }
  }

  /**
   * Start pack task
   */
  async startPackTask(
    packTaskId: string,
    tenantId: string,
    packerUserId: string
  ): Promise<PackTask> {
    const packTask = await prisma.packTask.findFirst({
      where: { id: packTaskId, tenantId },
    });

    if (!packTask) {
      throw new AppError(404, 'Pack task not found');
    }

    if (packTask.status !== PackTaskStatus.PENDING) {
      throw new AppError(400, 'Pack task cannot be started in current status');
    }

    const updated = await prisma.packTask.update({
      where: { id: packTaskId },
      data: {
        status: PackTaskStatus.IN_PROGRESS,
        packerUserId,
        startTime: new Date(),
      },
    });

    logger.info(`Pack task started`, { packTaskId, packerUserId });

    return updated;
  }

  /**
   * Pack an item
   */
  async packItem(
    packTaskId: string,
    tenantId: string,
    packData: PackItemDTO
  ): Promise<void> {
    const packTask = await prisma.packTask.findFirst({
      where: { id: packTaskId, tenantId },
      include: {
        packTaskLines: true,
      },
    });

    if (!packTask) {
      throw new AppError(404, 'Pack task not found');
    }

    if (packTask.status !== PackTaskStatus.IN_PROGRESS) {
      throw new AppError(400, 'Pack task is not in progress');
    }

    const packLine = packTask.packTaskLines.find(
      (line) => line.id === packData.packTaskLineId
    );

    if (!packLine) {
      throw new AppError(404, 'Pack line not found');
    }

    await prisma.$transaction(async (tx) => {
      const quantityToPack = Number(packLine.quantityToPack);
      const quantityPacked = packData.quantityPacked;
      const variance = quantityPacked - quantityToPack;

      let lineStatus = PackLineStatus.PACKED;
      if (variance !== 0) {
        lineStatus = PackLineStatus.VARIANCE;
      }

      // Update pack line
      await tx.packTaskLine.update({
        where: { id: packLine.id },
        data: {
          quantityPacked,
          cartonNumber: packData.cartonNumber,
          lineStatus,
          varianceQuantity: variance,
          varianceReason: packData.varianceReason,
          packedAt: new Date(),
        },
      });

      // Update pack task progress
      await tx.packTask.update({
        where: { id: packTaskId },
        data: {
          itemsPacked: { increment: quantityPacked },
        },
      });

      // Update order line
      await tx.orderLine.update({
        where: { id: packLine.orderLineId },
        data: {
          quantityPacked: { increment: quantityPacked },
        },
      });
    });

    logger.info(`Item packed`, {
      packTaskId,
      packLineId: packData.packTaskLineId,
      quantityPacked: packData.quantityPacked,
    });
  }

  /**
   * Add carton to pack task
   */
  async addCarton(
    packTaskId: string,
    tenantId: string,
    cartonData: CartonDTO
  ): Promise<void> {
    const packTask = await prisma.packTask.findFirst({
      where: { id: packTaskId, tenantId },
      include: { order: true },
    });

    if (!packTask) {
      throw new AppError(404, 'Pack task not found');
    }

    await prisma.$transaction(async (tx) => {
      await tx.carton.create({
        data: {
          packTaskId,
          orderId: packTask.orderId,
          cartonNumber: cartonData.cartonNumber,
          weight: cartonData.weight,
          dimensions: cartonData.dimensions,
          items: cartonData.items,
        },
      });

      await tx.packTask.update({
        where: { id: packTaskId },
        data: {
          cartonsUsed: { increment: 1 },
        },
      });
    });

    logger.info(`Carton added to pack task`, { packTaskId, cartonNumber: cartonData.cartonNumber });
  }

  /**
   * Generate shipping label
   */
  async generateShippingLabel(
    packTaskId: string,
    tenantId: string
  ): Promise<{ trackingNumber: string; labelUrl: string }> {
    const packTask = await prisma.packTask.findFirst({
      where: { id: packTaskId, tenantId },
      include: { order: true },
    });

    if (!packTask) {
      throw new AppError(404, 'Pack task not found');
    }

    // TODO: Integrate with actual carrier API (DHL, FedEx, etc.)
    // For now, generate mock tracking number
    const trackingNumber = this.generateMockTrackingNumber(packTask.carrier || 'FEDEX');
    const labelUrl = `/labels/${packTask.id}.pdf`; // Mock URL

    await prisma.packTask.update({
      where: { id: packTaskId },
      data: {
        shippingLabelGenerated: true,
        trackingNumber,
      },
    });

    await prisma.order.update({
      where: { id: packTask.orderId },
      data: {
        trackingNumber,
      },
    });

    logger.info(`Shipping label generated`, { packTaskId, trackingNumber });

    return { trackingNumber, labelUrl };
  }

  /**
   * Complete pack task
   */
  async completePackTask(
    packTaskId: string,
    tenantId: string,
    userId: string
  ): Promise<PackTask> {
    const packTask = await prisma.packTask.findFirst({
      where: { id: packTaskId, tenantId },
      include: {
        packTaskLines: true,
        order: true,
      },
    });

    if (!packTask) {
      throw new AppError(404, 'Pack task not found');
    }

    if (packTask.status !== PackTaskStatus.IN_PROGRESS) {
      throw new AppError(400, 'Pack task is not in progress');
    }

    // Check if all lines are packed
    const unpackedLines = packTask.packTaskLines.filter(
      (line) => line.lineStatus === PackLineStatus.PENDING
    );

    if (unpackedLines.length > 0) {
      throw new AppError(400, 'Not all lines have been packed');
    }

    if (!packTask.shippingLabelGenerated) {
      throw new AppError(400, 'Shipping label must be generated before completing');
    }

    const completionTime = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const task = await tx.packTask.update({
        where: { id: packTaskId },
        data: {
          status: PackTaskStatus.COMPLETED,
          completionTime,
        },
      });

      // Update order status
      await tx.order.update({
        where: { id: packTask.orderId },
        data: { status: OrderStatus.PACKED },
      });

      await tx.orderEvent.create({
        data: {
          orderId: packTask.orderId,
          eventType: 'pack.completed',
          description: 'Packing completed',
          metadata: { packTaskId },
        },
      });

      return task;
    });

    await eventBus.publish('pack.completed', {
      packTaskId: packTask.id,
      orderId: packTask.orderId,
      tenantId,
      timestamp: new Date(),
    });

    logger.info(`Pack task completed`, { packTaskId });

    return updated;
  }

  /**
   * Get pack task with lines
   */
  async getPackTask(packTaskId: string, tenantId: string) {
    const packTask = await prisma.packTask.findFirst({
      where: { id: packTaskId, tenantId },
      include: {
        packTaskLines: {
          include: {
            product: true,
            orderLine: true,
          },
        },
        cartons: true,
        order: {
          include: {
            customer: true,
          },
        },
        packer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!packTask) {
      throw new AppError(404, 'Pack task not found');
    }

    return packTask;
  }

  /**
   * Generate task number
   */
  private async generateTaskNumber(tenantId: string, prefix: string): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const taskPrefix = `${prefix}-${year}${month}${day}`;

    const count = await prisma.packTask.count({
      where: {
        tenantId,
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `${taskPrefix}-${sequence}`;
  }

  /**
   * Generate mock tracking number (replace with actual carrier API)
   */
  private generateMockTrackingNumber(carrier: string): string {
    const prefix = carrier.substring(0, 3).toUpperCase();
    const random = Math.random().toString(36).substring(2, 15).toUpperCase();
    return `${prefix}${random}`;
  }
}

export const packTaskService = new PackTaskService();
