import express from 'express';
import { getCommissionsSummary, recordPayment, getPayments } from './commissions.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const router = express.Router();

router.get('/summary', requireAuth, getCommissionsSummary);
router.get('/payments', requireAuth, getPayments);
router.post('/payments', requireAuth, requireRole(['admin']), recordPayment);

export default router;
