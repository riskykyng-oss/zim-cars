import express from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { upload } from '../../middleware/upload.js';
import {
  getPaymentInfo,
  submitPayment,
  getMyPayments,
  getAllPayments,
  approvePayment,
  rejectPayment,
} from './payments.controller.js';

const router = express.Router();

// Dealer routes
router.get('/info', getPaymentInfo);
router.post('/submit', requireAuth, requireRole(['dealer_owner', 'dealer_staff']), upload.single('proof'), submitPayment);
router.get('/my', requireAuth, requireRole(['dealer_owner', 'dealer_staff']), getMyPayments);

// Admin routes
router.get('/all', requireAuth, requireRole(['admin']), getAllPayments);
router.post('/:id/approve', requireAuth, requireRole(['admin']), approvePayment);
router.post('/:id/reject', requireAuth, requireRole(['admin']), rejectPayment);

export default router;
