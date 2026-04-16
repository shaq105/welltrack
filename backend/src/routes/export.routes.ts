import { Router } from 'express';
import { exportCsv, exportPdf } from '../controllers/export.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.get('/csv', authenticate, exportCsv);
router.get('/pdf', authenticate, exportPdf);

export default router;
