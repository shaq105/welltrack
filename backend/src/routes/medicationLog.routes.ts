import { Router } from 'express';
import {
  getMedicationLogs,
  createMedicationLog,
  updateMedicationLog,
  deleteMedicationLog,
} from '../controllers/medicationLog.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.get('/', authenticate, getMedicationLogs);
router.post('/', authenticate, createMedicationLog);
router.patch('/:id', authenticate, updateMedicationLog);
router.delete('/:id', authenticate, deleteMedicationLog);

export default router;
