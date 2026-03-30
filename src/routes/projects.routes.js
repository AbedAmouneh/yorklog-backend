import { Router } from 'express';
import {
  getMyProjects,
  getAllProjects,
  createProject,
  updateProject,
  assignEmployees,
  getProjectTasks,
  createTask,
  updateTask,
  deleteTask,
} from '../controllers/projects.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/role.middleware.js';
import asyncHandler from '../lib/asyncHandler.js';

const router = Router();

router.use(authenticate);

// Employees: see only their assigned projects
router.get('/my', asyncHandler(getMyProjects));

// Admin: full project management
router.get('/', requireAdmin, asyncHandler(getAllProjects));
router.post('/', requireAdmin, asyncHandler(createProject));
router.patch('/:id', requireAdmin, asyncHandler(updateProject));
router.post('/:id/assign', requireAdmin, asyncHandler(assignEmployees));

// Tasks (accessible by assigned employees for reading)
router.get('/:id/tasks', asyncHandler(getProjectTasks));
router.post('/:id/tasks', requireAdmin, asyncHandler(createTask));
router.patch('/:id/tasks/:taskId', requireAdmin, asyncHandler(updateTask));
router.delete('/:id/tasks/:taskId', requireAdmin, asyncHandler(deleteTask));

export default router;
