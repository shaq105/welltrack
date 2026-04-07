import { Router } from 'express';
import { getSymptoms, createSymptom, updateSymptom, deleteSymptom } from '../controllers/symptom.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.get('/', authenticate, getSymptoms);
router.post('/', authenticate, createSymptom);
router.patch('/:id', authenticate, updateSymptom);
router.delete('/:id', authenticate, deleteSymptom);

export default router;
