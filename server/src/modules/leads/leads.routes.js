import express from 'express';
import { createLead, getLeads, updateLead, generateWhatsAppLink, createAppointment, getLeadDetails, assignLead } from './leads.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const router = express.Router();

// Public route to create lead
router.post('/', createLead);

// Protected routes
router.get('/', requireAuth, getLeads);
router.get('/:id', requireAuth, getLeadDetails);
router.put('/:id', requireAuth, requireRole(['admin', 'dealer_owner', 'dealer_staff']), updateLead);
router.post('/:id/appointment', requireAuth, requireRole(['admin', 'dealer_owner', 'dealer_staff']), createAppointment);
router.put('/:id/assign', requireAuth, requireRole(['admin', 'dealer_owner']), assignLead);
router.get('/whatsapp/:vehicleId', generateWhatsAppLink);

export default router;
