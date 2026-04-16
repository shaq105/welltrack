import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getCorrelations } from '../controllers/insights.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

const correlationsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

router.get('/correlations', correlationsLimiter, authenticate, getCorrelations);

export default router;
