import 'dotenv/config';
import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { connectDatabase, closeDatabase } from './config/database';
import { connectRedis, closeRedis } from './config/redis';
import { connectRabbitMQ, closeRabbitMQ } from './config/rabbitmq';
import { logger } from './utils/logger';
import { rateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { thresholdMonitoringService } from './services/threshold.service';
import routes from './routes';

const app: Application = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'threshold-monitoring-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/v1', routes);

// Error handler (must be last)
app.use(errorHandler);

// Initialize connections and start server
const startServer = async () => {
  try {
    // Connect to services
    await connectDatabase();
    await connectRedis();
    await connectRabbitMQ();

    // Start threshold monitoring service
    thresholdMonitoringService.start();

    // Start server
    app.listen(PORT, () => {
      logger.info(`Threshold Monitoring Service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info('All connections established successfully');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down gracefully...');

  try {
    thresholdMonitoringService.stop();
    await closeRabbitMQ();
    await closeRedis();
    await closeDatabase();

    logger.info('All connections closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server
startServer();
