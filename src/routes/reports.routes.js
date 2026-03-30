import { Router } from 'express';
import {
  getSummary,
  getByEmployee,
  getByProject,
  whoLoggedToday,
  exportReport,
} from '../controllers/reports.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import asyncHandler from '../lib/asyncHandler.js';

const router = Router();

router.use(authenticate, requireRole('dept_manager'));

router.get('/summary', asyncHandler(getSummary));
router.get('/by-employee', asyncHandler(getByEmployee));
router.get('/by-project', asyncHandler(getByProject));
router.get('/who-logged-today', asyncHandler(whoLoggedToday));
router.get('/export', asyncHandler(exportReport));

export default router;
