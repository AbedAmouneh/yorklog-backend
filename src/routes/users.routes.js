import { Router } from 'express';
import {
  getAllUsers,
  createUser,
  updateUser,
  deactivateUser,
} from '../controllers/users.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin, requireManager } from '../middleware/role.middleware.js';
import asyncHandler from '../lib/asyncHandler.js';

const router = Router();

router.use(authenticate);

// Managers can read users (needed for project assignment)
router.get('/', requireManager, asyncHandler(getAllUsers));

// User create/update/deactivate remains super_admin only
router.post('/', requireAdmin, asyncHandler(createUser));
router.patch('/:id', requireAdmin, asyncHandler(updateUser));
router.delete('/:id', requireAdmin, asyncHandler(deactivateUser));

export default router;
