import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllRead,
} from '../controllers/notifications.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);
router.patch('/read-all', markAllRead);

export default router;
