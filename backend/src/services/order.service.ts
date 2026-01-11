import { Prisma, Order, OrderLine, OrderStatus, OrderType, OrderPriority, AllocationStrategy } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { eventBus } from '../config/redis';
import { logger } from '../utils/logger';

export interface CreateOrderDTO {
  tenantId: string;
  warehouseId: string;
  orderType: OrderType;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress: any;
  billingAddress?: any;
  requiredShipDate?: Date;
  requestedDeliveryDate?: Date;
  priority?: OrderPriority;
  allocationStrategy?: AllocationStrategy;
  carrier?: string;
  serviceLevel?: string;
  specialInstructions?: string;
  customReference1?: string;
  customReference2?: string;
  sourceSystem?: string;
  orderLines: {
    productId: string;
    lineNumber: number;
    quantityOrdered: number;
    uom?: string;
    unitPrice?: number;
    specialHandling?: string;
  }[];
  createdById: string;
}

export interface UpdateOrderDTO {
  requiredShipDate?: Date;
  requestedDeliveryDate?: Date;
  priority?: OrderPriority;
  carrier?: string;
  serviceLevel?: string;
  specialInstructions?: string;
  notes?: string;
  tags?: string[];
}

export interface OrderFilters {
  tenantId: string;
  warehouseId?: string;
  customerId?: string;
  status?: OrderStatus | OrderStatus[];
  orderType?: OrderType;
  priority?: OrderPriority;
  orderDateFrom?: Date;
  orderDateTo?: Date;
  requiredShipDateFrom?: Date;
  requiredShipDateTo?: Date;
  search?: string; // Search by order number, customer name, tracking number
  tags?: string[];
}

export class OrderService {
  /**
   * Create a new order
   */
  async createOrder(data: CreateOrderDTO): Promise<Order> {
    try {
      // Validate customer exists
      const customer = await prisma.customer.findUnique({
        where: { id: data.customerId },
      });

      if (!customer || customer.tenantId !== data.tenantId) {
        throw new AppError(404, 'Customer not found');
      }

      // Validate warehouse exists
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: data.warehouseId },
      });

      if (!warehouse || warehouse.tenantId !== data.tenantId) {
        throw new AppError(404, 'Warehouse not found');
      }

      // Validate all products exist
      const productIds = data.orderLines.map(line => line.productId);
      const products = await prisma.product.findMany({
        where: {
          id: { in: productIds },
          tenantId: data.tenantId,
        },
      });

      if (products.length !== productIds.length) {
        throw new AppError(400, 'One or more products not found');
      }

      // Generate order number
      const orderNumber = await this.generateOrderNumber(data.tenantId);

      // Calculate totals
      const totalLines = data.orderLines.length;
      const totalUnitsOrdered = data.orderLines.reduce(
        (sum, line) => sum + line.quantityOrdered,
        0
      );

      // Create order with lines in a transaction
      const order = await prisma.$transaction(async (tx) => {
        const newOrder = await tx.order.create({
          data: {
            tenantId: data.tenantId,
            warehouseId: data.warehouseId,
            orderNumber,
            orderType: data.orderType,
            customerId: data.customerId,
            customerName: data.customerName,
            customerEmail: data.customerEmail,
            customerPhone: data.customerPhone,
            shippingAddress: data.shippingAddress,
            billingAddress: data.billingAddress,
            requiredShipDate: data.requiredShipDate,
            requestedDeliveryDate: data.requestedDeliveryDate,
            priority: data.priority || OrderPriority.NORMAL,
            allocationStrategy: data.allocationStrategy || AllocationStrategy.FIFO,
            totalLines,
            totalUnitsOrdered,
            carrier: data.carrier,
            serviceLevel: data.serviceLevel,
            specialInstructions: data.specialInstructions,
            customReference1: data.customReference1,
            customReference2: data.customReference2,
            sourceSystem: data.sourceSystem || 'MANUAL',
            createdById: data.createdById,
            status: OrderStatus.NEW,
          },
        });

        // Create order lines
        await tx.orderLine.createMany({
          data: data.orderLines.map((line) => ({
            tenantId: data.tenantId,
            orderId: newOrder.id,
            productId: line.productId,
            lineNumber: line.lineNumber,
            quantityOrdered: line.quantityOrdered,
            uom: line.uom || 'Each',
            unitPrice: line.unitPrice,
            lineTotal: line.unitPrice ? line.quantityOrdered * line.unitPrice : null,
            specialHandling: line.specialHandling,
          })),
        });

        // Create order event
        await tx.orderEvent.create({
          data: {
            orderId: newOrder.id,
            eventType: 'order.created',
            description: `Order ${orderNumber} created`,
            metadata: {
              createdBy: data.createdById,
              sourceSystem: data.sourceSystem,
            },
          },
        });

        return newOrder;
      });

      // Publish event
      await eventBus.publish('order.created', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        tenantId: order.tenantId,
        timestamp: new Date(),
      });

      logger.info(`Order created: ${order.orderNumber}`, { orderId: order.id });

      return order;
    } catch (error) {
      logger.error('Failed to create order:', error);
      throw error;
    }
  }

  /**
   * Get order by ID with lines
   */
  async getOrderById(orderId: string, tenantId: string): Promise<Order | null> {
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: {
        orderLines: {
          include: {
            product: true,
            allocationDetails: {
              include: {
                location: true,
                inventory: true,
              },
            },
          },
          orderBy: { lineNumber: 'asc' },
        },
        customer: true,
        warehouse: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        orderEvents: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    return order;
  }

  /**
   * List orders with filters and pagination
   */
  async listOrders(
    filters: OrderFilters,
    page = 1,
    limit = 50
  ): Promise<{ orders: Order[]; total: number }> {
    const where: Prisma.OrderWhereInput = {
      tenantId: filters.tenantId,
    };

    if (filters.warehouseId) {
      where.warehouseId = filters.warehouseId;
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        where.status = { in: filters.status };
      } else {
        where.status = filters.status;
      }
    }

    if (filters.orderType) {
      where.orderType = filters.orderType;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.orderDateFrom || filters.orderDateTo) {
      where.orderDate = {};
      if (filters.orderDateFrom) {
        where.orderDate.gte = filters.orderDateFrom;
      }
      if (filters.orderDateTo) {
        where.orderDate.lte = filters.orderDateTo;
      }
    }

    if (filters.search) {
      where.OR = [
        { orderNumber: { contains: filters.search, mode: 'insensitive' } },
        { customerName: { contains: filters.search, mode: 'insensitive' } },
        { trackingNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: true,
          warehouse: true,
          orderLines: {
            select: {
              id: true,
              quantityOrdered: true,
              quantityAllocated: true,
              quantityPicked: true,
              quantityShipped: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, total };
  }

  /**
   * Update order
   */
  async updateOrder(
    orderId: string,
    tenantId: string,
    data: UpdateOrderDTO,
    userId: string
  ): Promise<Order> {
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
    });

    if (!order) {
      throw new AppError(404, 'Order not found');
    }

    // Cannot update if already allocated or in later stages
    if (![OrderStatus.NEW, OrderStatus.ON_HOLD].includes(order.status)) {
      throw new AppError(400, 'Cannot update order in current status');
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data,
      });

      await tx.orderEvent.create({
        data: {
          orderId,
          eventType: 'order.updated',
          description: 'Order updated',
          metadata: {
            updatedBy: userId,
            changes: data,
          },
        },
      });

      return updated;
    });

    logger.info(`Order updated: ${order.orderNumber}`, { orderId: order.id });

    return updatedOrder;
  }

  /**
   * Cancel order
   */
  async cancelOrder(
    orderId: string,
    tenantId: string,
    reason: string,
    userId: string
  ): Promise<Order> {
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { allocationDetails: true },
    });

    if (!order) {
      throw new AppError(404, 'Order not found');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new AppError(400, 'Order is already cancelled');
    }

    if ([OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(order.status)) {
      throw new AppError(400, 'Cannot cancel shipped or delivered order');
    }

    const cancelledOrder = await prisma.$transaction(async (tx) => {
      // De-allocate inventory if allocated
      if (order.allocationDetails.length > 0) {
        for (const allocation of order.allocationDetails) {
          await tx.inventory.update({
            where: { id: allocation.inventoryId },
            data: {
              quantityAllocated: { decrement: Number(allocation.quantityAllocated) },
              quantityAvailable: { increment: Number(allocation.quantityAllocated) },
            },
          });

          await tx.allocationDetail.update({
            where: { id: allocation.id },
            data: {
              status: 'CANCELLED',
              cancelledAt: new Date(),
            },
          });
        }
      }

      // Update order status
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledById: userId,
          cancelledAt: new Date(),
          cancellationReason: reason,
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId,
          eventType: 'order.cancelled',
          description: `Order cancelled: ${reason}`,
          metadata: {
            cancelledBy: userId,
            reason,
          },
        },
      });

      return updated;
    });

    await eventBus.publish('order.cancelled', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      tenantId: order.tenantId,
      reason,
    });

    logger.info(`Order cancelled: ${order.orderNumber}`, { orderId: order.id, reason });

    return cancelledOrder;
  }

  /**
   * Generate unique order number
   */
  private async generateOrderNumber(tenantId: string): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const prefix = `ORD-${year}${month}${day}`;

    // Get today's count
    const count = await prisma.order.count({
      where: {
        tenantId,
        orderNumber: { startsWith: prefix },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `${prefix}-${sequence}`;
  }
}

export const orderService = new OrderService();
