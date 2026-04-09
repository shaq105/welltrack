import { Router } from 'express';
import { getMe, updateMe, deleteMe } from '../controllers/user.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { updateMeSchema } from '../schemas';

const router = Router();

router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, validate(updateMeSchema), updateMe);
router.delete('/me', authenticate, deleteMe);

export default router;
