import { Router } from 'express';
import batchRoutes from './batch.routes';

const router = Router();

router.use('/batches', batchRoutes);

export default router;
