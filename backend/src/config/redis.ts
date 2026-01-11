import Redis from 'ioredis';
import { logger } from '../utils/logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = new Redis(REDIS_URL, {
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redisClient.on('connect', () => {
  logger.info('Redis client connected');
});

redisClient.on('error', (error) => {
  logger.error('Redis client error:', error);
});

redisClient.on('reconnecting', () => {
  logger.warn('Redis client reconnecting...');
});

// Event Bus for Order Management
export class EventBus {
  private static instance: EventBus;
  private redis: Redis;

  private constructor() {
    this.redis = redisClient;
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  async publish(channel: string, message: any): Promise<void> {
    try {
      await this.redis.publish(channel, JSON.stringify(message));
      logger.debug(`Event published to ${channel}:`, message);
    } catch (error) {
      logger.error(`Failed to publish event to ${channel}:`, error);
      throw error;
    }
  }

  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    const subscriber = this.redis.duplicate();

    subscriber.subscribe(channel, (err) => {
      if (err) {
        logger.error(`Failed to subscribe to ${channel}:`, err);
        throw err;
      }
      logger.info(`Subscribed to channel: ${channel}`);
    });

    subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        try {
          const parsed = JSON.parse(message);
          callback(parsed);
        } catch (error) {
          logger.error(`Failed to parse message from ${channel}:`, error);
        }
      }
    });
  }
}

export const eventBus = EventBus.getInstance();
