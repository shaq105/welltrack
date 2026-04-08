import { Router } from 'express';
import { getHabits, createHabit, updateHabit, deleteHabit } from '../controllers/habit.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.get('/', authenticate, getHabits);
router.post('/', authenticate, createHabit);
router.patch('/:id', authenticate, updateHabit);
router.delete('/:id', authenticate, deleteHabit);

export default router;
