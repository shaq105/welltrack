import { Router } from 'express';
import {
  getSymptomLogs,
  createSymptomLog,
  updateSymptomLog,
  deleteSymptomLog,
} from '../controllers/symptomLog.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.get('/', authenticate, getSymptomLogs);
router.post('/', authenticate, createSymptomLog);
router.patch('/:id', authenticate, updateSymptomLog);
router.delete('/:id', authenticate, deleteSymptomLog);

export default router;
