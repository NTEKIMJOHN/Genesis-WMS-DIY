import { Router } from 'express';
import thresholdRoutes from './threshold.routes';

const router = Router();

router.use('/alerts', thresholdRoutes);

export default router;
