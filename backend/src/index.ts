import express, { Application } from 'express';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { initializeApp } from './app';
import { logger } from './utils/logger';
import { prisma } from './config/database';
import { redisClient } from './config/redis';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function startServer() {
  try {
    // Initialize Express app
    const app: Application = express();
    const httpServer = createServer(app);

    // Initialize app (middleware, routes, etc.)
    initializeApp(app);

    // Test database connection
    await prisma.$connect();
    logger.info('✓ Database connected successfully');

    // Test Redis connection
    await redisClient.ping();
    logger.info('✓ Redis connected successfully');

    // Start server
    httpServer.listen(PORT, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║         🚀 Genesis WMS API Server Started            ║
║                                                       ║
║  Environment: ${NODE_ENV.padEnd(38)}║
║  Port:        ${String(PORT).padEnd(38)}║
║  API Docs:    http://localhost:${PORT}/api-docs${' '.repeat(14)}║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      httpServer.close(async () => {
        logger.info('HTTP server closed');

        // Close database connection
        await prisma.$disconnect();
        logger.info('Database disconnected');

        // Close Redis connection
        await redisClient.quit();
        logger.info('Redis disconnected');

        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
