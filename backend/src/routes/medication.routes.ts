import { Router } from 'express';
import {
  getMedications,
  createMedication,
  updateMedication,
  deleteMedication,
} from '../controllers/medication.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { createMedicationSchema, updateMedicationSchema } from '../schemas';

const router = Router();

router.get('/', authenticate, getMedications);
router.post('/', authenticate, validate(createMedicationSchema), createMedication);
router.patch('/:id', authenticate, validate(updateMedicationSchema), updateMedication);
router.delete('/:id', authenticate, deleteMedication);

export default router;
