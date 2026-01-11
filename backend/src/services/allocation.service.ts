import { Prisma, AllocationStrategy, OrderStatus, OrderLineStatus, Inventory, InventoryStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { eventBus } from '../config/redis';
import { logger } from '../utils/logger';

export interface AllocationResult {
  orderId: string;
  success: boolean;
  fullyAllocated: boolean;
  allocatedLines: number;
  partiallyAllocatedLines: number;
  failedLines: number;
  message: string;
  details: {
    lineId: string;
    sku: string;
    quantityOrdered: number;
    quantityAllocated: number;
    allocations: {
      inventoryId: string;
      locationCode: string;
      quantity: number;
      batchNumber?: string;
      expiryDate?: Date;
    }[];
  }[];
}

export class AllocationService {
  /**
   * Allocate inventory for an order
   */
  async allocateOrder(orderId: string, tenantId: string): Promise<AllocationResult> {
    try {
      const order = await prisma.order.findFirst({
        where: { id: orderId, tenantId },
        include: {
          orderLines: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!order) {
        throw new AppError(404, 'Order not found');
      }

      if (order.status !== OrderStatus.NEW && order.status !== OrderStatus.ALLOCATION_FAILED) {
        throw new AppError(400, 'Order cannot be allocated in current status');
      }

      const result: AllocationResult = {
        orderId: order.id,
        success: false,
        fullyAllocated: false,
        allocatedLines: 0,
        partiallyAllocatedLines: 0,
        failedLines: 0,
        message: '',
        details: [],
      };

      // Allocate each order line
      await prisma.$transaction(async (tx) => {
        for (const line of order.orderLines) {
          const lineResult = await this.allocateLine(
            tx,
            order,
            line,
            order.allocationStrategy
          );

          result.details.push({
            lineId: line.id,
            sku: line.product.sku,
            quantityOrdered: Number(line.quantityOrdered),
            quantityAllocated: lineResult.quantityAllocated,
            allocations: lineResult.allocations,
          });

          if (lineResult.fullyAllocated) {
            result.allocatedLines++;
          } else if (lineResult.quantityAllocated > 0) {
            result.partiallyAllocatedLines++;
          } else {
            result.failedLines++;
          }
        }

        // Update order status based on allocation results
        let newStatus: OrderStatus;
        if (result.failedLines === 0 && result.partiallyAllocatedLines === 0) {
          newStatus = OrderStatus.ALLOCATED;
          result.fullyAllocated = true;
          result.success = true;
          result.message = 'Order fully allocated';
        } else if (result.allocatedLines > 0 || result.partiallyAllocatedLines > 0) {
          newStatus = OrderStatus.PARTIALLY_ALLOCATED;
          result.success = true;
          result.message = 'Order partially allocated';
        } else {
          newStatus = OrderStatus.ALLOCATION_FAILED;
          result.message = 'Order allocation failed - no inventory available';
        }

        // Calculate totals
        const totalAllocated = result.details.reduce(
          (sum, detail) => sum + detail.quantityAllocated,
          0
        );

        await tx.order.update({
          where: { id: orderId },
          data: {
            status: newStatus,
            totalUnitsAllocated: totalAllocated,
            allocatedAt: new Date(),
          },
        });

        await tx.orderEvent.create({
          data: {
            orderId,
            eventType: 'order.allocated',
            description: result.message,
            metadata: {
              allocatedLines: result.allocatedLines,
              partiallyAllocatedLines: result.partiallyAllocatedLines,
              failedLines: result.failedLines,
            },
          },
        });
      });

      // Publish event
      await eventBus.publish('order.allocated', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        tenantId: order.tenantId,
        fullyAllocated: result.fullyAllocated,
        timestamp: new Date(),
      });

      logger.info(`Order allocated: ${order.orderNumber}`, {
        orderId: order.id,
        result,
      });

      return result;
    } catch (error) {
      logger.error('Failed to allocate order:', error);
      throw error;
    }
  }

  /**
   * Allocate a single order line
   */
  private async allocateLine(
    tx: Prisma.TransactionClient,
    order: any,
    line: any,
    strategy: AllocationStrategy
  ): Promise<{
    fullyAllocated: boolean;
    quantityAllocated: number;
    allocations: any[];
  }> {
    const product = line.product;
    let quantityRemaining = Number(line.quantityOrdered);
    const allocations: any[] = [];

    // Get allocation strategy (line override or order default)
    const allocationStrategy = line.allocationRuleOverride || strategy;

    // Query available inventory
    const availableInventory = await this.getAvailableInventory(
      tx,
      order.tenantId,
      order.warehouseId,
      product.id,
      allocationStrategy,
      product.safetyBufferDays || 0
    );

    if (availableInventory.length === 0) {
      // No inventory available - update line status
      await tx.orderLine.update({
        where: { id: line.id },
        data: {
          lineStatus: OrderLineStatus.BACKORDERED,
          quantityBackordered: line.quantityOrdered,
        },
      });

      return {
        fullyAllocated: false,
        quantityAllocated: 0,
        allocations: [],
      };
    }

    // Allocate from available inventory
    for (const inventory of availableInventory) {
      if (quantityRemaining <= 0) break;

      const availableQty = Number(inventory.quantityAvailable);
      const allocateQty = Math.min(availableQty, quantityRemaining);

      // Create allocation detail
      const allocationDetail = await tx.allocationDetail.create({
        data: {
          tenantId: order.tenantId,
          orderId: order.id,
          orderLineId: line.id,
          inventoryId: inventory.id,
          locationId: inventory.locationId,
          productId: product.id,
          quantityAllocated: allocateQty,
          batchNumber: inventory.batchNumber,
          lotNumber: inventory.lotNumber,
          expiryDate: inventory.expiryDate,
          lpn: inventory.lpn,
          status: 'ALLOCATED',
        },
      });

      // Update inventory quantities
      await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          quantityAllocated: { increment: allocateQty },
          quantityAvailable: { decrement: allocateQty },
        },
      });

      // Create inventory transaction
      await tx.inventoryTransaction.create({
        data: {
          tenantId: order.tenantId,
          inventoryId: inventory.id,
          transactionType: 'ALLOCATE',
          quantity: allocateQty,
          referenceType: 'ORDER',
          referenceId: order.id,
          notes: `Allocated for order ${order.orderNumber}`,
        },
      });

      // Get location for result
      const location = await tx.location.findUnique({
        where: { id: inventory.locationId },
      });

      allocations.push({
        inventoryId: inventory.id,
        locationCode: location?.code || 'Unknown',
        quantity: allocateQty,
        batchNumber: inventory.batchNumber,
        expiryDate: inventory.expiryDate,
      });

      quantityRemaining -= allocateQty;
    }

    const quantityAllocated = Number(line.quantityOrdered) - quantityRemaining;
    const fullyAllocated = quantityRemaining === 0;

    // Update order line
    await tx.orderLine.update({
      where: { id: line.id },
      data: {
        quantityAllocated,
        lineStatus: fullyAllocated
          ? OrderLineStatus.ALLOCATED
          : OrderLineStatus.PARTIALLY_ALLOCATED,
        quantityBackordered: quantityRemaining > 0 ? quantityRemaining : 0,
      },
    });

    return {
      fullyAllocated,
      quantityAllocated,
      allocations,
    };
  }

  /**
   * Get available inventory sorted by allocation strategy
   */
  private async getAvailableInventory(
    tx: Prisma.TransactionClient,
    tenantId: string,
    warehouseId: string,
    productId: string,
    strategy: AllocationStrategy,
    safetyBufferDays: number
  ): Promise<Inventory[]> {
    const where: Prisma.InventoryWhereInput = {
      tenantId,
      warehouseId,
      productId,
      status: InventoryStatus.AVAILABLE,
      quantityAvailable: { gt: 0 },
    };

    // Exclude inventory expiring within safety buffer
    if (safetyBufferDays > 0) {
      const bufferDate = new Date();
      bufferDate.setDate(bufferDate.getDate() + safetyBufferDays);

      where.OR = [
        { expiryDate: null },
        { expiryDate: { gt: bufferDate } },
      ];
    }

    let orderBy: Prisma.InventoryOrderByWithRelationInput[] = [];

    switch (strategy) {
      case AllocationStrategy.FIFO:
        // First In, First Out - allocate oldest inventory first
        orderBy = [{ receivedDate: 'asc' }, { createdAt: 'asc' }];
        break;

      case AllocationStrategy.FEFO:
        // First Expired, First Out - allocate inventory with earliest expiry first
        orderBy = [
          { expiryDate: { sort: 'asc', nulls: 'last' } },
          { receivedDate: 'asc' },
        ];
        break;

      case AllocationStrategy.LIFO:
        // Last In, First Out - allocate newest inventory first
        orderBy = [{ receivedDate: 'desc' }, { createdAt: 'desc' }];
        break;

      case AllocationStrategy.MANUAL:
        // Manual allocation would require specific inventory IDs
        // For now, default to FIFO
        orderBy = [{ receivedDate: 'asc' }, { createdAt: 'asc' }];
        break;
    }

    const inventory = await tx.inventory.findMany({
      where,
      orderBy,
      include: {
        location: true,
      },
    });

    return inventory;
  }

  /**
   * De-allocate inventory for an order (used when canceling)
   */
  async deallocateOrder(orderId: string, tenantId: string): Promise<void> {
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { allocationDetails: true },
    });

    if (!order) {
      throw new AppError(404, 'Order not found');
    }

    if (order.allocationDetails.length === 0) {
      return; // Nothing to deallocate
    }

    await prisma.$transaction(async (tx) => {
      for (const allocation of order.allocationDetails) {
        // Return quantity to inventory
        await tx.inventory.update({
          where: { id: allocation.inventoryId },
          data: {
            quantityAllocated: { decrement: Number(allocation.quantityAllocated) },
            quantityAvailable: { increment: Number(allocation.quantityAllocated) },
          },
        });

        // Mark allocation as cancelled
        await tx.allocationDetail.update({
          where: { id: allocation.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
          },
        });

        // Create inventory transaction
        await tx.inventoryTransaction.create({
          data: {
            tenantId,
            inventoryId: allocation.inventoryId,
            transactionType: 'ADJUST',
            quantity: Number(allocation.quantityAllocated),
            referenceType: 'ORDER',
            referenceId: orderId,
            notes: `Deallocated from order ${order.orderNumber}`,
          },
        });
      }

      // Update order line statuses
      await tx.orderLine.updateMany({
        where: { orderId },
        data: {
          quantityAllocated: 0,
          lineStatus: OrderLineStatus.PENDING,
        },
      });

      // Update order
      await tx.order.update({
        where: { id: orderId },
        data: {
          totalUnitsAllocated: 0,
          status: OrderStatus.NEW,
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId,
          eventType: 'order.deallocated',
          description: 'Order inventory deallocated',
        },
      });
    });

    logger.info(`Order deallocated: ${order.orderNumber}`, { orderId: order.id });
  }

  /**
   * Check allocation availability without actually allocating
   */
  async checkAllocationAvailability(
    orderId: string,
    tenantId: string
  ): Promise<{
    canFullyAllocate: boolean;
    lines: {
      productSku: string;
      quantityOrdered: number;
      availableQuantity: number;
      canFullyAllocate: boolean;
    }[];
  }> {
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: {
        orderLines: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new AppError(404, 'Order not found');
    }

    const lines = [];
    let canFullyAllocateOrder = true;

    for (const line of order.orderLines) {
      const totalAvailable = await prisma.inventory.aggregate({
        where: {
          tenantId,
          warehouseId: order.warehouseId,
          productId: line.productId,
          status: InventoryStatus.AVAILABLE,
          quantityAvailable: { gt: 0 },
        },
        _sum: {
          quantityAvailable: true,
        },
      });

      const availableQuantity = Number(totalAvailable._sum.quantityAvailable || 0);
      const canFullyAllocate = availableQuantity >= Number(line.quantityOrdered);

      if (!canFullyAllocate) {
        canFullyAllocateOrder = false;
      }

      lines.push({
        productSku: line.product.sku,
        quantityOrdered: Number(line.quantityOrdered),
        availableQuantity,
        canFullyAllocate,
      });
    }

    return {
      canFullyAllocate: canFullyAllocateOrder,
      lines,
    };
  }
}

export const allocationService = new AllocationService();
