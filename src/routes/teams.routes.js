import { Router } from 'express';
import {
  createTeam,
  getTeams,
  getManagers,
  setDepartmentManager,
  moveMember,
} from '../controllers/teams.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAnyOf } from '../middleware/role.middleware.js';
import asyncHandler from '../lib/asyncHandler.js';

const router = Router();

router.use(authenticate);

// All teams endpoints require org_admin, hr_finance, or super_admin
// (dept_managers do NOT get team assignment — they manage their own team's timesheets)
router.use(requireAnyOf('hr_finance', 'org_admin', 'super_admin'));

router.post('/', asyncHandler(createTeam));
router.get('/', asyncHandler(getTeams));
router.get('/managers', asyncHandler(getManagers));
router.patch('/:deptId/manager', asyncHandler(setDepartmentManager));
router.patch('/members/:userId', asyncHandler(moveMember));

export default router;
