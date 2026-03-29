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

const router = Router();

router.use(authenticate);

// Employees: see only their assigned projects
router.get('/my', getMyProjects);

// Admin: full project management
router.get('/', requireAdmin, getAllProjects);
router.post('/', requireAdmin, createProject);
router.patch('/:id', requireAdmin, updateProject);
router.post('/:id/assign', requireAdmin, assignEmployees);

// Tasks (accessible by assigned employees for reading)
router.get('/:id/tasks', getProjectTasks);
router.post('/:id/tasks', requireAdmin, createTask);
router.patch('/:id/tasks/:taskId', requireAdmin, updateTask);
router.delete('/:id/tasks/:taskId', requireAdmin, deleteTask);

export default router;
