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
import asyncHandler from '../lib/asyncHandler.js';

const router = Router();

router.use(authenticate);

router.post('/timesheets/:entryId', asyncHandler(submitEditRequest));
router.get('/my', asyncHandler(getMyEditRequests));
router.get('/', requireRole('dept_manager'), asyncHandler(getTeamEditRequests));
router.patch('/:id/approve', requireRole('dept_manager'), asyncHandler(approveEditRequest));
router.patch('/:id/reject', requireRole('dept_manager'), asyncHandler(rejectEditRequest));

export default router;
