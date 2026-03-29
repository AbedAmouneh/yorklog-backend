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

const router = Router();

router.use(authenticate, requireRole('dept_manager'));

router.get('/summary', getSummary);
router.get('/by-employee', getByEmployee);
router.get('/by-project', getByProject);
router.get('/who-logged-today', whoLoggedToday);
router.get('/export', exportReport); // returns .xlsx

export default router;
