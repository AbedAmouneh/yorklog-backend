import { Router } from 'express';
import {
  submitEditRequest,
  getTeamEditRequests,
  getMyEditRequests,
  approveEditRequest,
  rejectEditRequest,
} from '../controllers/edit-requests.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

router.use(authenticate);

// Employee: submit edit request for their own entry
router.post('/timesheets/:entryId', submitEditRequest);

// Employee: see their own edit request history
router.get('/my', getMyEditRequests);

// Manager+: see pending requests for their team
router.get('/', requireRole('dept_manager'), getTeamEditRequests);
router.patch('/:id/approve', requireRole('dept_manager'), approveEditRequest);
router.patch('/:id/reject', requireRole('dept_manager'), rejectEditRequest);

export default router;
