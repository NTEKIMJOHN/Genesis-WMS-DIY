import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

let redisClient: RedisClientType | null = null;

export const connectRedis = async (): Promise<RedisClientType> => {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is not defined');
  }

  redisClient = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error('Too many Redis reconnection attempts');
          return new Error('Too many reconnection attempts');
        }
        return Math.min(retries * 100, 3000);
      }
    }
  });

  redisClient.on('error', (err) => {
    logger.error('Redis client error:', err);
  });

  redisClient.on('connect', () => {
    logger.info('Redis client connected');
  });

  redisClient.on('reconnecting', () => {
    logger.warn('Redis client reconnecting...');
  });

  await redisClient.connect();

  return redisClient;
};

export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
};

export const closeRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis client closed');
  }
};

// Cache helper functions
export const cacheGet = async (key: string): Promise<string | null> => {
  try {
    return await getRedisClient().get(key);
  } catch (error) {
    logger.error('Redis GET error:', { key, error });
    return null;
  }
};

export const cacheSet = async (key: string, value: string, ttl?: number): Promise<void> => {
  try {
    const client = getRedisClient();
    if (ttl) {
      await client.setEx(key, ttl, value);
    } else {
      await client.set(key, value);
    }
  } catch (error) {
    logger.error('Redis SET error:', { key, error });
  }
};

export const cacheDel = async (key: string | string[]): Promise<void> => {
  try {
    const keys = Array.isArray(key) ? key : [key];
    await getRedisClient().del(keys);
  } catch (error) {
    logger.error('Redis DEL error:', { key, error });
  }
};

export const cacheExists = async (key: string): Promise<boolean> => {
  try {
    const exists = await getRedisClient().exists(key);
    return exists === 1;
  } catch (error) {
    logger.error('Redis EXISTS error:', { key, error });
    return false;
  }
};
