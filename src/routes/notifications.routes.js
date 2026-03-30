import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllRead,
} from '../controllers/notifications.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import asyncHandler from '../lib/asyncHandler.js';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(getNotifications));
router.patch('/:id/read', asyncHandler(markAsRead));
router.patch('/read-all', asyncHandler(markAllRead));

export default router;
