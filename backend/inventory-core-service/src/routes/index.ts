import { Router } from 'express';
import inventoryRoutes from './inventory.routes';
import adjustmentRoutes from './adjustment.routes';

const router = Router();

router.use('/inventory', inventoryRoutes);
router.use('/adjustments', adjustmentRoutes);

export default router;
