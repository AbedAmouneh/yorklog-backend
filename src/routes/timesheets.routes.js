import { Router } from 'express';
import {
  createEntry,
  getMyEntries,
  getMyCalendar,
  getTeamEntries,
  getEntry,
  deleteEntry,
} from '../controllers/timesheets.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole, requireAdmin } from '../middleware/role.middleware.js';
import asyncHandler from '../lib/asyncHandler.js';

const router = Router();

router.use(authenticate);

router.post('/', asyncHandler(createEntry));
router.get('/my', asyncHandler(getMyEntries));
router.get('/my/calendar/:year/:month', asyncHandler(getMyCalendar));
router.get('/team', requireRole('dept_manager'), asyncHandler(getTeamEntries));
router.get('/:id', asyncHandler(getEntry));
router.delete('/:id', requireAdmin, asyncHandler(deleteEntry));

export default router;
