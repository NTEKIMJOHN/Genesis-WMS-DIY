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

    // Declare queues
    await channel.assertQueue('inventory-sync-realtime', { durable: true });
    await channel.assertQueue('inventory-sync-batch', { durable: true });
    await channel.assertQueue('threshold-alerts', { durable: true });
    await channel.assertQueue('cycle-count-processing', { durable: true });

    // Bind queues to exchanges
    await channel.bindQueue('inventory-sync-realtime', 'inventory-events', 'inventory.sync.realtime');
    await channel.bindQueue('inventory-sync-batch', 'inventory-events', 'inventory.sync.batch');

    connection.on('error', (err) => {
      logger.error('RabbitMQ connection error:', err);
    });

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed');
    });

    logger.info('RabbitMQ queues and exchanges configured');
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
