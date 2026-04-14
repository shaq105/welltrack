import { Router } from 'express';
import { exportCsv } from '../controllers/export.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.get('/csv', authenticate, exportCsv);

export default router;
