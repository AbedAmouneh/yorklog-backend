import { Router } from 'express';
import {
  getMyTasks,
  getAllTasks,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
} from '../controllers/tasks.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireManager } from '../middleware/role.middleware.js';
import asyncHandler from '../lib/asyncHandler.js';

const router = Router();

router.use(authenticate);

// All authenticated users
router.get('/my', asyncHandler(getMyTasks));
router.post('/', asyncHandler(createTask));
router.patch('/:id', asyncHandler(updateTask));
router.post('/:id/complete', asyncHandler(completeTask));

// Managers only
router.get('/', requireManager, asyncHandler(getAllTasks));
router.delete('/:id', requireManager, asyncHandler(deleteTask));

export default router;
