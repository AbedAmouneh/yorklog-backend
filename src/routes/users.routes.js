import { Router } from 'express';
import {
  getAllUsers,
  createUser,
  updateUser,
  deactivateUser,
} from '../controllers/users.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/role.middleware.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/', getAllUsers);
router.post('/', createUser);
router.patch('/:id', updateUser);
router.delete('/:id', deactivateUser);

export default router;
