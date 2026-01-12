import { Router } from 'express';
import authRoutes from './auth.routes';
import orderRoutes from './order.routes';
import allocationRoutes from './allocation.routes';
import pickTaskRoutes from './pickTask.routes';
import packTaskRoutes from './packTask.routes';
import shipmentRoutes from './shipment.routes';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Genesis WMS API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/orders', orderRoutes);
router.use('/allocation', allocationRoutes);
router.use('/pick-tasks', pickTaskRoutes);
router.use('/pack-tasks', packTaskRoutes);
router.use('/shipments', shipmentRoutes);

export default router;
