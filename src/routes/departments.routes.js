import { Router } from 'express';
import {
  getAllDepartments,
  createDepartment,
  updateDepartment,
} from '../controllers/departments.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin, requireRole } from '../middleware/role.middleware.js';
import asyncHandler from '../lib/asyncHandler.js';

const router = Router();

router.use(authenticate);

router.get('/', requireRole('dept_manager'), asyncHandler(getAllDepartments));
router.post('/', requireAdmin, asyncHandler(createDepartment));
router.patch('/:id', requireAdmin, asyncHandler(updateDepartment));

export default router;
