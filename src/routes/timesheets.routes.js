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

const router = Router();

router.use(authenticate);

router.post('/', createEntry);
router.get('/my', getMyEntries);
router.get('/my/calendar/:year/:month', getMyCalendar);
router.get('/team', requireRole('dept_manager'), getTeamEntries);
router.get('/:id', getEntry);
router.delete('/:id', requireAdmin, deleteEntry);

export default router;
