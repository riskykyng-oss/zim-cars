import { v4 as uuidv4 } from 'uuid';
import prisma from '../../config/database.js';

const LEAD_STATUSES = ['new', 'contacted', 'sold', 'lost'];
const LEAD_SOURCES = ['web', 'whatsapp', 'phone', 'walkin', 'qr'];
const REFERRAL_PATTERN = /^[A-Za-z0-9_-]{2,30}$/;

const generateLeadId = () => `L-${uuidv4().substring(0, 6).toUpperCase()}`;

const normalizePhone = (phone) => {
  if (!phone) return phone;
  let cleaned = phone.replace(/\s/g, '').replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('+263')) cleaned = `263${cleaned.substring(4)}`;
  if (cleaned.startsWith('263')) return cleaned;
  if (/^(077|078|071|073)[0-9]{7}$/.test(cleaned)) return `263${cleaned.substring(1)}`;
  return cleaned;
};

export const createLead = async (req, res) => {
  try {
    const {
      vehicleId,
      buyerName,
      buyerPhone,
      source,
      referralCode: customReferralCode,
      pageUrl,
    } = req.body;

    if (!vehicleId) {
      return res.status(400).json({ error: 'A vehicle is required for an enquiry.' });
    }

    if (!buyerPhone) {
      return res.status(400).json({ error: 'Enter your phone number.' });
    }

    if (buyerName && String(buyerName).length > 150) {
      return res.status(400).json({ error: 'Name is too long.' });
    }

    let referralCode = null;
    if (customReferralCode) {
      if (!REFERRAL_PATTERN.test(customReferralCode)) {
        return res.status(400).json({ error: 'Invalid referral code.' });
      }
      referralCode = customReferralCode.toUpperCase();
    }

    const cleanedPhone = normalizePhone(buyerPhone);
    const phoneRegex = /^263(77|78|71|73)[0-9]{7}$/;
    if (!phoneRegex.test(cleanedPhone)) {
      return res.status(400).json({
        error: 'Enter a valid Zimbabwe number (e.g., 0771234567 or +263771234567).',
      });
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Dedupe: same phone + same vehicle within 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const existingLead = await prisma.lead.findFirst({
      where: {
        vehicleId,
        buyerPhone: cleanedPhone,
        createdAt: { gte: thirtyDaysAgo },
      },
      include: { vehicle: true, dealer: true },
    });
    if (existingLead) {
      return res.status(200).json({ ...existingLead, deduplicated: true });
    }

    const leadIdShort = generateLeadId();
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress;

    const lead = await prisma.$transaction(async (tx) => {
      const created = await tx.lead.create({
        data: {
          dealerId: vehicle.dealerId,
          vehicleId,
          buyerName: buyerName ? String(buyerName).trim() : null,
          buyerPhone: cleanedPhone,
          source: LEAD_SOURCES.includes(source) ? source : 'web',
          referralCode,
          leadId: leadIdShort,
          status: 'new',
          ip,
          userAgent: req.headers['user-agent'],
          pageUrl: typeof pageUrl === 'string' ? pageUrl.slice(0, 2000) : null,
          consentAt: new Date(),
        },
        include: {
          vehicle: true,
          dealer: true,
        },
      });

      await tx.auditLog.create({
        data: {
          dealerId: vehicle.dealerId,
          entityType: 'lead',
          entityId: created.id,
          action: 'create',
          details: {
            source: created.source,
            buyerPhone: `${cleanedPhone.substring(0, 6)}***`,
            referralCode,
            leadId: leadIdShort,
          },
        },
      });

      await tx.leadEvent.create({
        data: {
          leadId: created.id,
          event: 'created',
          newValue: 'new',
          actor: 'system',
        },
      });

      return created;
    });

    return res.status(201).json({ ...lead, leadId: leadIdShort });
  } catch (error) {
    console.error('Create lead error:', error);
    return res.status(500).json({ error: 'Could not send enquiry. Try again.' });
  }
};

export const getLeads = async (req, res) => {
  try {
    const where = {};

    // Dealers can only see their own leads
    if (req.session.role !== 'admin') {
      if (!req.session.dealerId) {
        return res.status(403).json({ error: 'No dealer assigned' });
      }
      where.dealerId = req.session.dealerId;
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        vehicle: true,
        dealer: true,
        sale: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(leads);
  } catch (error) {
    console.error('Get leads error:', error);
    return res.status(500).json({ error: 'Failed to fetch leads' });
  }
};

export const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!LEAD_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid lead status.' });
    }

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Check access
    if (req.session.role !== 'admin' && req.session.dealerId !== lead.dealerId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updatedLead = await prisma.$transaction(async (tx) => {
      const updated = await tx.lead.update({
        where: { id },
        data: { status },
        include: { vehicle: true, dealer: true, sale: true },
      });

      await tx.auditLog.create({
        data: {
          actorId: req.session.userId,
          dealerId: lead.dealerId,
          entityType: 'lead',
          entityId: lead.id,
          action: 'update_status',
          details: { oldStatus: lead.status, newStatus: status },
        },
      });

      await tx.leadEvent.create({
        data: {
          leadId: lead.id,
          event: 'status_change',
          oldValue: lead.status,
          newValue: status,
          actor: req.session.email || req.session.userId,
        },
      });

      return updated;
    });

    return res.json(updatedLead);
  } catch (error) {
    console.error('Update lead error:', error);
    return res.status(500).json({ error: 'Failed to update lead' });
  }
};

export const generateWhatsAppLink = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { ref, leadId } = req.query;

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { dealer: true },
    });

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const phone = process.env.DEALER_WHATSAPP
      || (process.env.NODE_ENV === 'production' ? null : '+263123456789');
    if (!phone) {
      return res.status(500).json({ error: 'Dealer WhatsApp number is not configured.' });
    }

    const refCode = ref && REFERRAL_PATTERN.test(ref) ? ref.toUpperCase() : 'none';
    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173')
      .split(',')[0]
      .trim()
      .replace(/\/$/, '');
    const carUrl = `${clientUrl}/car/${vehicle.id}?ref=${encodeURIComponent(refCode === 'none' ? '' : refCode)}`;
    const message = encodeURIComponent(
      `Hi, I'm interested in ${vehicle.year} ${vehicle.make} ${vehicle.model} Ref: ${refCode}. Is it still available? Link: ${carUrl} (Lead ${leadId || 'N/A'})`
    );

    const whatsappUrl = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${message}`;

    return res.json({
      referralCode: refCode,
      whatsappUrl,
      message: message.replace(/%20/g, ' '),
    });
  } catch (error) {
    console.error('Generate WhatsApp link error:', error);
    return res.status(500).json({ error: 'Failed to generate link' });
  }
};
