import { Router } from 'express';
import { getHabits, createHabit, updateHabit, deleteHabit } from '../controllers/habit.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { createHabitSchema, updateHabitSchema } from '../schemas';

const router = Router();

router.get('/', authenticate, getHabits);
router.post('/', authenticate, validate(createHabitSchema), createHabit);
router.patch('/:id', authenticate, validate(updateHabitSchema), updateHabit);
router.delete('/:id', authenticate, deleteHabit);

export default router;
