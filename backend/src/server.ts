import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { errorHandler, notFound } from './middleware/errorHandler';
import logger from './utils/logger';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// MIDDLEWARE
// ==========================================

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  }));
}

// ==========================================
// SWAGGER API DOCUMENTATION
// ==========================================

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Genesis WMS - Receiving Management API',
      version: '1.0.0',
      description:
        'Comprehensive API for warehouse receiving operations, including ASN/PO receiving, blind receiving, variance management, and putaway operations.',
      contact: {
        name: 'Genesis WMS Support',
        email: 'support@genesis-wms.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ==========================================
// ROUTES
// ==========================================

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Genesis WMS API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API routes (placeholder - will be imported)
app.get('/api/v1', (req, res) => {
  res.json({
    success: true,
    message: 'Genesis WMS Receiving Management API v1',
    endpoints: {
      health: '/health',
      docs: '/api-docs',
      auth: '/api/v1/auth',
      asn: '/api/v1/asn',
      blindReceipts: '/api/v1/blind-receipts',
      variances: '/api/v1/variances',
      putaway: '/api/v1/putaway',
      lpn: '/api/v1/lpn',
    },
  });
});

// Import routes (these will be created next)
// import authRoutes from './routes/auth.routes';
// import asnRoutes from './routes/asn.routes';
// import blindReceiptRoutes from './routes/blindReceipt.routes';
// import varianceRoutes from './routes/variance.routes';
// import putawayRoutes from './routes/putaway.routes';

// app.use('/api/v1/auth', authRoutes);
// app.use('/api/v1/asn', asnRoutes);
// app.use('/api/v1/blind-receipts', blindReceiptRoutes);
// app.use('/api/v1/variances', varianceRoutes);
// app.use('/api/v1/putaway', putawayRoutes);

// ==========================================
// ERROR HANDLING
// ==========================================

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// ==========================================
// START SERVER
// ==========================================

const server = app.listen(PORT, () => {
  logger.info(`
    ╔════════════════════════════════════════════════════════════╗
    ║                                                            ║
    ║          Genesis WMS - Receiving Management API           ║
    ║                                                            ║
    ║  Environment: ${process.env.NODE_ENV?.toUpperCase().padEnd(11)} ${' '.repeat(35)}║
    ║  Server:      http://localhost:${PORT}                        ║
    ║  API Docs:    http://localhost:${PORT}/api-docs             ║
    ║                                                            ║
    ╚════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default app;
