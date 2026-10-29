import express from 'express';
import { createLead, getLeads, updateLead, generateWhatsAppLink } from './leads.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const router = express.Router();

// Public route to create lead
router.post('/', createLead);

// Protected routes
router.get('/', requireAuth, getLeads);
router.put('/:id', requireAuth, requireRole(['admin', 'dealer_owner', 'dealer_staff']), updateLead);
router.get('/whatsapp/:vehicleId', generateWhatsAppLink);

export default router;
