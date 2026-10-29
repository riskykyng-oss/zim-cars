import express from 'express';
import rateLimit from 'express-rate-limit';
import { login, logout, getMe } from './auth.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

router.post('/login', loginLimiter, login);
router.post('/logout', requireAuth, logout);
router.get('/me', getMe);

export default router;
