import { Router } from 'express';
import {
  getMedicationLogs,
  createMedicationLog,
  updateMedicationLog,
  deleteMedicationLog,
} from '../controllers/medicationLog.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { createMedicationLogSchema, updateMedicationLogSchema } from '../schemas';

const router = Router();

router.get('/', authenticate, getMedicationLogs);
router.post('/', authenticate, validate(createMedicationLogSchema), createMedicationLog);
router.patch('/:id', authenticate, validate(updateMedicationLogSchema), updateMedicationLog);
router.delete('/:id', authenticate, deleteMedicationLog);

export default router;
