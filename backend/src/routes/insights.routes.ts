import { Router } from 'express';
import { getCorrelations } from '../controllers/insights.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.get('/correlations', authenticate, getCorrelations);

export default router;
