import { Router } from 'express';
import {
  getSymptomLogs,
  createSymptomLog,
  updateSymptomLog,
  deleteSymptomLog,
} from '../controllers/symptomLog.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { createSymptomLogSchema, updateSymptomLogSchema } from '../schemas';

const router = Router();

router.get('/', authenticate, getSymptomLogs);
router.post('/', authenticate, validate(createSymptomLogSchema), createSymptomLog);
router.patch('/:id', authenticate, validate(updateSymptomLogSchema), updateSymptomLog);
router.delete('/:id', authenticate, deleteSymptomLog);

export default router;
