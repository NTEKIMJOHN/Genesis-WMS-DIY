import { Shipment, ShipmentType, DeliveryStatus, OrderStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { eventBus } from '../config/redis';
import { logger } from '../utils/logger';

export interface CreateShipmentDTO {
  tenantId: string;
  warehouseId: string;
  orderId: string;
  shipmentType: ShipmentType;
  carrier: string;
  serviceLevel: string;
  trackingNumber: string;
  estimatedDeliveryDate?: Date;
  shippingCost?: number;
  shippingWeight?: number;
  shippingDimensions?: any;
  cartonIds?: string[];
  createdById: string;
}

export class ShipmentService {
  /**
   * Create shipment from packed order
   */
  async createShipment(data: CreateShipmentDTO): Promise<Shipment> {
    try {
      const order = await prisma.order.findFirst({
        where: {
          id: data.orderId,
          tenantId: data.tenantId,
          status: OrderStatus.PACKED,
        },
        include: {
          orderLines: {
            include: {
              allocationDetails: {
                where: { status: 'PICKED' },
              },
            },
          },
        },
      });

      if (!order) {
        throw new AppError(404, 'Packed order not found');
      }

      const shipmentNumber = await this.generateShipmentNumber(data.tenantId);

      // Get cartons
      const cartons = data.cartonIds
        ? await prisma.carton.findMany({
            where: { id: { in: data.cartonIds } },
          })
        : [];

      const totalCartons = cartons.length;

      const shipment = await prisma.$transaction(async (tx) => {
        // Create shipment
        const newShipment = await tx.shipment.create({
          data: {
            tenantId: data.tenantId,
            warehouseId: data.warehouseId,
            orderId: data.orderId,
            shipmentNumber,
            shipmentType: data.shipmentType,
            carrier: data.carrier,
            serviceLevel: data.serviceLevel,
            trackingNumber: data.trackingNumber,
            trackingUrl: this.generateTrackingUrl(data.carrier, data.trackingNumber),
            estimatedDeliveryDate: data.estimatedDeliveryDate,
            shippingCost: data.shippingCost,
            shippingWeight: data.shippingWeight,
            shippingDimensions: data.shippingDimensions,
            totalCartons,
            cartonIds: data.cartonIds || [],
            deliveryStatus: DeliveryStatus.PENDING,
            createdById: data.createdById,
          },
        });

        // Create shipment lines from order lines
        for (const line of order.orderLines) {
          if (Number(line.quantityPacked) > 0) {
            await tx.shipmentLine.create({
              data: {
                tenantId: data.tenantId,
                shipmentId: newShipment.id,
                orderLineId: line.id,
                productId: line.productId,
                quantityShipped: Number(line.quantityPacked),
                // Get batch info from allocation details
                batchNumber: line.allocationDetails[0]?.batchNumber,
                lotNumber: line.allocationDetails[0]?.lotNumber,
                expiryDate: line.allocationDetails[0]?.expiryDate,
                serialNumbers: line.allocationDetails.flatMap(
                  (a) => a.serialNumbers || []
                ),
              },
            });

            // Update order line
            await tx.orderLine.update({
              where: { id: line.id },
              data: {
                quantityShipped: Number(line.quantityPacked),
                lineStatus: 'SHIPPED',
              },
            });
          }
        }

        // Update order status
        await tx.order.update({
          where: { id: data.orderId },
          data: {
            status: OrderStatus.SHIPPED,
            actualShipDate: new Date(),
            trackingNumber: data.trackingNumber,
            carrier: data.carrier,
            serviceLevel: data.serviceLevel,
            shippingCost: data.shippingCost,
            totalUnitsShipped: order.orderLines.reduce(
              (sum, line) => sum + Number(line.quantityPacked),
              0
            ),
          },
        });

        await tx.orderEvent.create({
          data: {
            orderId: data.orderId,
            eventType: 'order.shipped',
            description: `Order shipped via ${data.carrier}`,
            metadata: {
              shipmentId: newShipment.id,
              trackingNumber: data.trackingNumber,
            },
          },
        });

        return newShipment;
      });

      // Publish event
      await eventBus.publish('order.shipped', {
        shipmentId: shipment.id,
        orderId: data.orderId,
        orderNumber: order.orderNumber,
        tenantId: data.tenantId,
        trackingNumber: data.trackingNumber,
        timestamp: new Date(),
      });

      logger.info(`Shipment created: ${shipmentNumber}`, {
        shipmentId: shipment.id,
        orderId: data.orderId,
      });

      return shipment;
    } catch (error) {
      logger.error('Failed to create shipment:', error);
      throw error;
    }
  }

  /**
   * Update shipment delivery status
   */
  async updateDeliveryStatus(
    shipmentId: string,
    tenantId: string,
    deliveryStatus: DeliveryStatus,
    deliveryNotes?: string,
    actualDeliveryDate?: Date,
    signedBy?: string,
    proofOfDeliveryUrl?: string
  ): Promise<Shipment> {
    const shipment = await prisma.shipment.findFirst({
      where: { id: shipmentId, tenantId },
      include: { order: true },
    });

    if (!shipment) {
      throw new AppError(404, 'Shipment not found');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedShipment = await tx.shipment.update({
        where: { id: shipmentId },
        data: {
          deliveryStatus,
          deliveryNotes,
          actualDeliveryDate,
          signedBy,
          proofOfDeliveryUrl,
          ...(deliveryStatus === DeliveryStatus.DELIVERED && {
            signatureCapturedAt: new Date(),
          }),
        },
      });

      // If delivered, update order status
      if (deliveryStatus === DeliveryStatus.DELIVERED) {
        await tx.order.update({
          where: { id: shipment.orderId },
          data: { status: OrderStatus.DELIVERED },
        });

        await tx.orderEvent.create({
          data: {
            orderId: shipment.orderId,
            eventType: 'order.delivered',
            description: 'Order delivered to customer',
            metadata: {
              shipmentId,
              deliveryDate: actualDeliveryDate,
              signedBy,
            },
          },
        });
      }

      // If failed or returned
      if (
        deliveryStatus === DeliveryStatus.FAILED ||
        deliveryStatus === DeliveryStatus.RETURNED
      ) {
        await tx.orderEvent.create({
          data: {
            orderId: shipment.orderId,
            eventType: `order.${deliveryStatus.toLowerCase()}`,
            description: `Order ${deliveryStatus.toLowerCase()}: ${deliveryNotes || ''}`,
            metadata: {
              shipmentId,
              deliveryNotes,
            },
          },
        });
      }

      return updatedShipment;
    });

    await eventBus.publish('shipment.status_updated', {
      shipmentId,
      orderId: shipment.orderId,
      tenantId,
      deliveryStatus,
      timestamp: new Date(),
    });

    logger.info(`Shipment status updated: ${shipment.shipmentNumber}`, {
      shipmentId,
      deliveryStatus,
    });

    return updated;
  }

  /**
   * Get shipment by ID
   */
  async getShipmentById(shipmentId: string, tenantId: string) {
    const shipment = await prisma.shipment.findFirst({
      where: { id: shipmentId, tenantId },
      include: {
        shipmentLines: {
          include: {
            product: true,
            orderLine: true,
          },
        },
        order: {
          include: {
            customer: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!shipment) {
      throw new AppError(404, 'Shipment not found');
    }

    return shipment;
  }

  /**
   * List shipments with filters
   */
  async listShipments(
    tenantId: string,
    filters: {
      warehouseId?: string;
      orderId?: string;
      deliveryStatus?: DeliveryStatus;
      carrier?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
    page = 1,
    limit = 50
  ) {
    const where: any = { tenantId };

    if (filters.warehouseId) where.warehouseId = filters.warehouseId;
    if (filters.orderId) where.orderId = filters.orderId;
    if (filters.deliveryStatus) where.deliveryStatus = filters.deliveryStatus;
    if (filters.carrier) where.carrier = filters.carrier;

    if (filters.dateFrom || filters.dateTo) {
      where.shipDate = {};
      if (filters.dateFrom) where.shipDate.gte = filters.dateFrom;
      if (filters.dateTo) where.shipDate.lte = filters.dateTo;
    }

    const [shipments, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        include: {
          order: {
            include: {
              customer: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.shipment.count({ where }),
    ]);

    return { shipments, total };
  }

  /**
   * Track shipment (mock implementation - would integrate with carrier API)
   */
  async trackShipment(trackingNumber: string) {
    const shipment = await prisma.shipment.findFirst({
      where: { trackingNumber },
      include: { order: true },
    });

    if (!shipment) {
      throw new AppError(404, 'Shipment not found');
    }

    // TODO: Integrate with actual carrier tracking API
    return {
      trackingNumber,
      carrier: shipment.carrier,
      status: shipment.deliveryStatus,
      estimatedDelivery: shipment.estimatedDeliveryDate,
      actualDelivery: shipment.actualDeliveryDate,
      trackingUrl: shipment.trackingUrl,
      events: [
        {
          date: shipment.createdAt,
          status: 'Shipment Created',
          location: 'Warehouse',
        },
        // Mock tracking events
      ],
    };
  }

  /**
   * Generate unique shipment number
   */
  private async generateShipmentNumber(tenantId: string): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const prefix = `SHP-${year}${month}${day}`;

    const count = await prisma.shipment.count({
      where: {
        tenantId,
        shipmentNumber: { startsWith: prefix },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `${prefix}-${sequence}`;
  }

  /**
   * Generate tracking URL based on carrier
   */
  private generateTrackingUrl(carrier: string, trackingNumber: string): string {
    const carrierUrls: Record<string, string> = {
      FEDEX: `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
      UPS: `https://www.ups.com/track?tracknum=${trackingNumber}`,
      DHL: `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
      USPS: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
    };

    return carrierUrls[carrier.toUpperCase()] || `#${trackingNumber}`;
  }
}

export const shipmentService = new ShipmentService();
