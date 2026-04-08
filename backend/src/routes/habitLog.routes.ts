import { Router } from 'express';
import {
  getHabitLogs,
  createHabitLog,
  updateHabitLog,
  deleteHabitLog,
} from '../controllers/habitLog.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.get('/', authenticate, getHabitLogs);
router.post('/', authenticate, createHabitLog);
router.patch('/:id', authenticate, updateHabitLog);
router.delete('/:id', authenticate, deleteHabitLog);

export default router;
