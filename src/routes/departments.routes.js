import { Router } from 'express';
import {
  getAllDepartments,
  createDepartment,
  updateDepartment,
} from '../controllers/departments.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin, requireRole } from '../middleware/role.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', requireRole('dept_manager'), getAllDepartments);
router.post('/', requireAdmin, createDepartment);
router.patch('/:id', requireAdmin, updateDepartment);

export default router;
