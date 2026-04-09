import { Router } from 'express';
import { getSymptoms, createSymptom, updateSymptom, deleteSymptom } from '../controllers/symptom.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { createSymptomSchema, updateSymptomSchema } from '../schemas';

const router = Router();

router.get('/', authenticate, getSymptoms);
router.post('/', authenticate, validate(createSymptomSchema), createSymptom);
router.patch('/:id', authenticate, validate(updateSymptomSchema), updateSymptom);
router.delete('/:id', authenticate, deleteSymptom);

export default router;
