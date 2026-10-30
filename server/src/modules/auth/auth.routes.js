import express from 'express';
import rateLimit from 'express-rate-limit';
import { login, logout, getMe, registerDealer, uploadVerification, getDealerVerification, getAllDealers, verifyDealer, rejectDealer } from './auth.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { upload } from '../../middleware/upload.js';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Please try again later.' },
});

router.post('/login', loginLimiter, login);
router.post('/register-dealer', registerLimiter, registerDealer);
router.post('/logout', requireAuth, logout);
router.get('/me', getMe);
router.post('/dealer/verify/upload', requireAuth, upload.single('document'), uploadVerification);
router.get('/dealer/verify', requireAuth, getDealerVerification);
router.get('/dealers', requireAuth, requireRole(['admin']), getAllDealers);
router.post('/dealers/:id/verify', requireAuth, requireRole(['admin']), verifyDealer);
router.post('/dealers/:id/reject', requireAuth, requireRole(['admin']), rejectDealer);

export default router;
