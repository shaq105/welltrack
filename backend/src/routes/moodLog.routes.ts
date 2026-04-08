import { Router } from 'express';
import { getMoodLogs, createMoodLog, updateMoodLog, deleteMoodLog } from '../controllers/moodLog.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.get('/', authenticate, getMoodLogs);
router.post('/', authenticate, createMoodLog);
router.patch('/:id', authenticate, updateMoodLog);
router.delete('/:id', authenticate, deleteMoodLog);

export default router;
