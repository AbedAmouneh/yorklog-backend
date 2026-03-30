import { Router } from 'express';
import { login, logout, getMe, updateMe } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import asyncHandler from '../lib/asyncHandler.js';

const router = Router();

router.post('/login', asyncHandler(login));
router.post('/logout', logout);
router.get('/me', authenticate, asyncHandler(getMe));
router.patch('/me', authenticate, asyncHandler(updateMe));

export default router;
