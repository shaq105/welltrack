import { Router } from 'express';
import {
  getHabitLogs,
  createHabitLog,
  updateHabitLog,
  deleteHabitLog,
} from '../controllers/habitLog.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { createHabitLogSchema, updateHabitLogSchema } from '../schemas';

const router = Router();

router.get('/', authenticate, getHabitLogs);
router.post('/', authenticate, validate(createHabitLogSchema), createHabitLog);
router.patch('/:id', authenticate, validate(updateHabitLogSchema), updateHabitLog);
router.delete('/:id', authenticate, deleteHabitLog);

export default router;
