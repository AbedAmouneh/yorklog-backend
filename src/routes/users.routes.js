import { Router } from 'express';
import {
  getAllUsers,
  createUser,
  updateUser,
  deactivateUser,
} from '../controllers/users.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/role.middleware.js';
import asyncHandler from '../lib/asyncHandler.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/', asyncHandler(getAllUsers));
router.post('/', asyncHandler(createUser));
router.patch('/:id', asyncHandler(updateUser));
router.delete('/:id', asyncHandler(deactivateUser));

export default router;
