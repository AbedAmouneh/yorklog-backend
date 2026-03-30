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
import { requireManager } from '../middleware/role.middleware.js';
import asyncHandler from '../lib/asyncHandler.js';

const router = Router();

router.use(authenticate);

// Employees: see only their assigned projects
router.get('/my', asyncHandler(getMyProjects));

// Manager+: full project management
router.get('/', requireManager, asyncHandler(getAllProjects));
router.post('/', requireManager, asyncHandler(createProject));
router.patch('/:id', requireManager, asyncHandler(updateProject));
router.post('/:id/assign', requireManager, asyncHandler(assignEmployees));

// Tasks (accessible by assigned employees for reading)
router.get('/:id/tasks', asyncHandler(getProjectTasks));
router.post('/:id/tasks', requireManager, asyncHandler(createTask));
router.patch('/:id/tasks/:taskId', requireManager, asyncHandler(updateTask));
router.delete('/:id/tasks/:taskId', requireManager, asyncHandler(deleteTask));

export default router;
