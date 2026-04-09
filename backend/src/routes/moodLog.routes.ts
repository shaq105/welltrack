import { Router } from 'express';
import { getMoodLogs, createMoodLog, updateMoodLog, deleteMoodLog } from '../controllers/moodLog.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { createMoodLogSchema, updateMoodLogSchema } from '../schemas';

const router = Router();

router.get('/', authenticate, getMoodLogs);
router.post('/', authenticate, validate(createMoodLogSchema), createMoodLog);
router.patch('/:id', authenticate, validate(updateMoodLogSchema), updateMoodLog);
router.delete('/:id', authenticate, deleteMoodLog);

export default router;
