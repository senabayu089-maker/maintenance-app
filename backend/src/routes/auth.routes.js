import { Router } from 'express';

import rateLimit from 'express-rate-limit';

import {
  login,
  getMe,
  logout,
} from '../controllers/auth.controller.js';

import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

router.post('/login', loginLimiter, login);
router.get('/me', requireAuth, getMe);
router.post('/logout', requireAuth, logout);

export default router;