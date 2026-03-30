import { Router } from 'express';
import {
  getAllUsers,
  createUser,
  updateUser,
  deactivateUser,
} from '../controllers/users.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin, requireManager, requireAnyOf } from '../middleware/role.middleware.js';
import asyncHandler from '../lib/asyncHandler.js';

const router = Router();

router.use(authenticate);

// Managers + HR can read users (needed for project assignment & team management)
router.get('/', requireAnyOf('dept_manager', 'hr_finance', 'org_admin', 'super_admin'), asyncHandler(getAllUsers));

// User create/update/deactivate remains super_admin only
router.post('/', requireAdmin, asyncHandler(createUser));
router.patch('/:id', requireAdmin, asyncHandler(updateUser));
router.delete('/:id', requireAdmin, asyncHandler(deactivateUser));

export default router;
