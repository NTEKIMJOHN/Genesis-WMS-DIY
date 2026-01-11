import amqp, { Connection, Channel } from 'amqplib';
import { logger } from '../utils/logger';

let connection: Connection | null = null;
let channel: Channel | null = null;

export const connectRabbitMQ = async (): Promise<void> => {
  const rabbitmqUrl = process.env.RABBITMQ_URL;

  if (!rabbitmqUrl) {
    throw new Error('RABBITMQ_URL environment variable is not defined');
  }

  try {
    connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();

    // Declare exchanges
    await channel.assertExchange('inventory-events', 'topic', { durable: true });
    await channel.assertExchange('threshold-alerts', 'topic', { durable: true });

    // Declare queues
    await channel.assertQueue('threshold-alerts', { durable: true });
    await channel.assertQueue('threshold-low-stock', { durable: true });
    await channel.assertQueue('threshold-critical-stock', { durable: true });
    await channel.assertQueue('threshold-overstock', { durable: true });

    // Bind queues to exchanges
    await channel.bindQueue('threshold-low-stock', 'threshold-alerts', 'threshold.low.*');
    await channel.bindQueue('threshold-critical-stock', 'threshold-alerts', 'threshold.critical.*');
    await channel.bindQueue('threshold-overstock', 'threshold-alerts', 'threshold.overstock.*');

    connection.on('error', (err) => {
      logger.error('RabbitMQ connection error:', err);
    });

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed');
    });

    logger.info('RabbitMQ queues and exchanges configured for Threshold Monitoring Service');
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ:', error);
    throw error;
  }
};

export const getChannel = (): Channel => {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized. Call connectRabbitMQ() first.');
  }
  return channel;
};

export const publishMessage = async (
  exchange: string,
  routingKey: string,
  message: any
): Promise<void> => {
  try {
    const ch = getChannel();
    const content = Buffer.from(JSON.stringify(message));
    ch.publish(exchange, routingKey, content, {
      persistent: true,
      contentType: 'application/json',
      timestamp: Date.now()
    });
    logger.debug('Message published:', { exchange, routingKey, message });
  } catch (error) {
    logger.error('Failed to publish message:', { exchange, routingKey, error });
    throw error;
  }
};

export const closeRabbitMQ = async (): Promise<void> => {
  if (channel) {
    await channel.close();
    channel = null;
  }
  if (connection) {
    await connection.close();
    connection = null;
  }
  logger.info('RabbitMQ connection closed');
};
