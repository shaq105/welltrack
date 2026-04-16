import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { exportCsv, exportPdf } from '../controllers/export.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
});

router.get('/csv', authenticate, exportLimiter, exportCsv);
router.get('/pdf', authenticate, exportLimiter, exportPdf);

export default router;
