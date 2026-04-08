import { Router } from 'express';
import {
  getMedications,
  createMedication,
  updateMedication,
  deleteMedication,
} from '../controllers/medication.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.get('/', authenticate, getMedications);
router.post('/', authenticate, createMedication);
router.patch('/:id', authenticate, updateMedication);
router.delete('/:id', authenticate, deleteMedication);

export default router;
