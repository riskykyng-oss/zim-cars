import express from 'express';
import { createSale, getSales, confirmSale } from './sales.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, getSales);
router.post('/', requireAuth, requireRole(['admin', 'dealer_owner', 'dealer_staff']), createSale);
router.post('/:id/confirm', requireAuth, requireRole(['admin', 'dealer_owner']), confirmSale);

export default router;
