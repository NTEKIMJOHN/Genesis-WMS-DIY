import {
  PickTask,
  PickTaskType,
  PickTaskStatus,
  PickLineStatus,
  OrderStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { eventBus } from '../config/redis';
import { logger } from '../utils/logger';

export interface CreatePickTaskDTO {
  tenantId: string;
  warehouseId: string;
  taskType: PickTaskType;
  orderIds: string[];
  zoneId?: string;
  pickerUserId?: string;
}

export interface PickItemDTO {
  pickTaskLineId: string;
  quantityPicked: number;
  varianceReason?: string;
  pickerNotes?: string;
  photoEvidenceUrl?: string;
}

export class PickTaskService {
  /**
   * Generate pick tasks for allocated orders
   */
  async generatePickTasks(
    orderIds: string[],
    tenantId: string,
    taskType: PickTaskType = PickTaskType.SINGLE
  ): Promise<PickTask[]> {
    try {
      const orders = await prisma.order.findMany({
        where: {
          id: { in: orderIds },
          tenantId,
          status: OrderStatus.ALLOCATED,
        },
        include: {
          orderLines: {
            include: {
              allocationDetails: {
                where: { status: 'ALLOCATED' },
                include: {
                  location: true,
                  product: true,
                },
              },
            },
          },
        },
      });

      if (orders.length === 0) {
        throw new AppError(400, 'No allocated orders found');
      }

      const pickTasks: PickTask[] = [];

      await prisma.$transaction(async (tx) => {
        for (const order of orders) {
          const taskNumber = await this.generateTaskNumber(tenantId, 'PICK');

          // Collect all pick lines for this order
          const pickLines: any[] = [];
          let totalUnits = 0;

          for (const line of order.orderLines) {
            for (const allocation of line.allocationDetails) {
              pickLines.push({
                allocationDetailId: allocation.id,
                orderId: order.id,
                orderLineId: line.id,
                productId: allocation.productId,
                locationId: allocation.locationId,
                quantityToPick: Number(allocation.quantityAllocated),
                pickSequence: 0, // Will be optimized later
              });

              totalUnits += Number(allocation.quantityAllocated);
            }
          }

          // Optimize pick path if enabled
          const optimizedLines = await this.optimizePickPath(pickLines);

          // Get priority from order
          const priority = order.priority;

          // Create pick task
          const pickTask = await tx.pickTask.create({
            data: {
              tenantId,
              warehouseId: order.warehouseId,
              taskNumber,
              taskType,
              orderIds: [order.id],
              status: PickTaskStatus.PENDING,
              priority,
              totalLines: optimizedLines.length,
              totalUnits,
              pickPathOptimized: true,
            },
          });

          // Create pick task lines
          await tx.pickTaskLine.createMany({
            data: optimizedLines.map((line, index) => ({
              tenantId,
              pickTaskId: pickTask.id,
              ...line,
              pickSequence: index + 1,
            })),
          });

          // Update order status
          await tx.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.PICKING },
          });

          await tx.orderEvent.create({
            data: {
              orderId: order.id,
              eventType: 'pick.task_created',
              description: `Pick task ${taskNumber} created`,
              metadata: { pickTaskId: pickTask.id },
            },
          });

          pickTasks.push(pickTask);
        }
      });

      // Publish events
      for (const pickTask of pickTasks) {
        await eventBus.publish('pick.task_created', {
          pickTaskId: pickTask.id,
          taskNumber: pickTask.taskNumber,
          tenantId,
          timestamp: new Date(),
        });
      }

      logger.info(`Generated ${pickTasks.length} pick tasks`, { orderIds });

      return pickTasks;
    } catch (error) {
      logger.error('Failed to generate pick tasks:', error);
      throw error;
    }
  }

  /**
   * Assign pick task to picker
   */
  async assignPickTask(
    pickTaskId: string,
    tenantId: string,
    pickerUserId: string
  ): Promise<PickTask> {
    const pickTask = await prisma.pickTask.findFirst({
      where: { id: pickTaskId, tenantId },
    });

    if (!pickTask) {
      throw new AppError(404, 'Pick task not found');
    }

    if (pickTask.status !== PickTaskStatus.PENDING) {
      throw new AppError(400, 'Pick task cannot be assigned in current status');
    }

    const updated = await prisma.pickTask.update({
      where: { id: pickTaskId },
      data: {
        pickerUserId,
        status: PickTaskStatus.ASSIGNED,
        assignedAt: new Date(),
      },
    });

    logger.info(`Pick task assigned: ${pickTask.taskNumber}`, {
      pickTaskId,
      pickerUserId,
    });

    return updated;
  }

  /**
   * Start pick task
   */
  async startPickTask(pickTaskId: string, tenantId: string, userId: string): Promise<PickTask> {
    const pickTask = await prisma.pickTask.findFirst({
      where: { id: pickTaskId, tenantId },
    });

    if (!pickTask) {
      throw new AppError(404, 'Pick task not found');
    }

    if (pickTask.status !== PickTaskStatus.ASSIGNED && pickTask.status !== PickTaskStatus.PENDING) {
      throw new AppError(400, 'Pick task cannot be started in current status');
    }

    const updated = await prisma.pickTask.update({
      where: { id: pickTaskId },
      data: {
        status: PickTaskStatus.IN_PROGRESS,
        startTime: new Date(),
        pickerUserId: userId, // Assign if not already assigned
      },
    });

    logger.info(`Pick task started: ${pickTask.taskNumber}`, { pickTaskId, userId });

    return updated;
  }

  /**
   * Pick an item (scan and confirm)
   */
  async pickItem(
    pickTaskId: string,
    tenantId: string,
    pickData: PickItemDTO,
    userId: string
  ): Promise<void> {
    const pickTask = await prisma.pickTask.findFirst({
      where: { id: pickTaskId, tenantId },
      include: {
        pickTaskLines: true,
      },
    });

    if (!pickTask) {
      throw new AppError(404, 'Pick task not found');
    }

    if (pickTask.status !== PickTaskStatus.IN_PROGRESS) {
      throw new AppError(400, 'Pick task is not in progress');
    }

    const pickLine = pickTask.pickTaskLines.find(
      (line) => line.id === pickData.pickTaskLineId
    );

    if (!pickLine) {
      throw new AppError(404, 'Pick line not found');
    }

    await prisma.$transaction(async (tx) => {
      const quantityToPick = Number(pickLine.quantityToPick);
      const quantityPicked = pickData.quantityPicked;
      const variance = quantityPicked - quantityToPick;

      let lineStatus = PickLineStatus.PICKED;
      if (quantityPicked < quantityToPick) {
        lineStatus = PickLineStatus.SHORT;
      }

      // Update pick line
      await tx.pickTaskLine.update({
        where: { id: pickLine.id },
        data: {
          quantityPicked,
          lineStatus,
          varianceQuantity: variance,
          varianceReason: pickData.varianceReason,
          pickerNotes: pickData.pickerNotes,
          photoEvidenceUrl: pickData.photoEvidenceUrl,
          pickedAt: new Date(),
        },
      });

      // Update pick task progress
      await tx.pickTask.update({
        where: { id: pickTaskId },
        data: {
          unitsPicked: { increment: quantityPicked },
        },
      });

      // Update order line
      await tx.orderLine.update({
        where: { id: pickLine.orderLineId },
        data: {
          quantityPicked: { increment: quantityPicked },
        },
      });

      // Update allocation detail
      if (pickLine.allocationDetailId) {
        await tx.allocationDetail.update({
          where: { id: pickLine.allocationDetailId },
          data: {
            status: 'PICKED',
            pickedAt: new Date(),
          },
        });
      }

      // Deduct from inventory
      const allocation = await tx.allocationDetail.findUnique({
        where: { id: pickLine.allocationDetailId || '' },
      });

      if (allocation) {
        await tx.inventory.update({
          where: { id: allocation.inventoryId },
          data: {
            quantityOnHand: { decrement: quantityPicked },
            quantityAllocated: { decrement: quantityPicked },
          },
        });

        await tx.inventoryTransaction.create({
          data: {
            tenantId,
            inventoryId: allocation.inventoryId,
            transactionType: 'PICK',
            quantity: -quantityPicked,
            referenceType: 'PICK_TASK',
            referenceId: pickTaskId,
            notes: `Picked for task ${pickTask.taskNumber}`,
          },
        });
      }
    });

    logger.info(`Item picked in task ${pickTask.taskNumber}`, {
      pickTaskId,
      pickLineId: pickData.pickTaskLineId,
      quantityPicked: pickData.quantityPicked,
    });
  }

  /**
   * Complete pick task
   */
  async completePickTask(
    pickTaskId: string,
    tenantId: string,
    userId: string
  ): Promise<PickTask> {
    const pickTask = await prisma.pickTask.findFirst({
      where: { id: pickTaskId, tenantId },
      include: {
        pickTaskLines: true,
      },
    });

    if (!pickTask) {
      throw new AppError(404, 'Pick task not found');
    }

    if (pickTask.status !== PickTaskStatus.IN_PROGRESS) {
      throw new AppError(400, 'Pick task is not in progress');
    }

    // Check if all lines are picked
    const unpickedLines = pickTask.pickTaskLines.filter(
      (line) => line.lineStatus === PickLineStatus.PENDING
    );

    if (unpickedLines.length > 0) {
      throw new AppError(400, 'Not all lines have been picked');
    }

    const completionTime = new Date();
    const duration = pickTask.startTime
      ? Math.floor((completionTime.getTime() - pickTask.startTime.getTime()) / 60000)
      : null;

    const updated = await prisma.$transaction(async (tx) => {
      const task = await tx.pickTask.update({
        where: { id: pickTaskId },
        data: {
          status: PickTaskStatus.COMPLETED,
          completionTime,
          actualDurationMinutes: duration,
        },
      });

      // Update order status
      for (const orderId of pickTask.orderIds) {
        await tx.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.PICKED },
        });

        await tx.orderEvent.create({
          data: {
            orderId,
            eventType: 'pick.completed',
            description: `Pick task ${pickTask.taskNumber} completed`,
            metadata: { pickTaskId, duration },
          },
        });
      }

      return task;
    });

    await eventBus.publish('pick.completed', {
      pickTaskId: pickTask.id,
      taskNumber: pickTask.taskNumber,
      tenantId,
      orderIds: pickTask.orderIds,
      timestamp: new Date(),
    });

    logger.info(`Pick task completed: ${pickTask.taskNumber}`, {
      pickTaskId,
      duration,
    });

    return updated;
  }

  /**
   * Get pick task with lines
   */
  async getPickTask(pickTaskId: string, tenantId: string) {
    const pickTask = await prisma.pickTask.findFirst({
      where: { id: pickTaskId, tenantId },
      include: {
        pickTaskLines: {
          include: {
            product: true,
            location: true,
          },
          orderBy: { pickSequence: 'asc' },
        },
        picker: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!pickTask) {
      throw new AppError(404, 'Pick task not found');
    }

    return pickTask;
  }

  /**
   * Optimize pick path based on location
   */
  private async optimizePickPath(pickLines: any[]): Promise<any[]> {
    // Simple optimization: sort by location code
    // In a real implementation, this would use warehouse layout and pathfinding
    const locations = await prisma.location.findMany({
      where: {
        id: { in: pickLines.map((line) => line.locationId) },
      },
    });

    const locationMap = new Map(locations.map((loc) => [loc.id, loc]));

    return pickLines.sort((a, b) => {
      const locA = locationMap.get(a.locationId);
      const locB = locationMap.get(b.locationId);

      if (!locA || !locB) return 0;

      return locA.code.localeCompare(locB.code);
    });
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

    const count = await prisma.pickTask.count({
      where: {
        tenantId,
        taskNumber: { startsWith: taskPrefix },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `${taskPrefix}-${sequence}`;
  }
}

export const pickTaskService = new PickTaskService();
