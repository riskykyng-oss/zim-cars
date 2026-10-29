import prisma from '../../config/database.js';

const isPositiveAmount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const createSale = async (req, res) => {
  try {
    const { leadId } = req.body;
    const salePrice = isPositiveAmount(req.body.salePrice);

    if (!leadId) {
      return res.status(400).json({ error: 'A lead is required to record a sale.' });
    }

    if (salePrice === null) {
      return res.status(400).json({ error: 'Enter a valid sale price greater than zero.' });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { dealer: true, vehicle: true, sale: true },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (req.session.role !== 'admin' && req.session.dealerId !== lead.dealerId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (lead.sale) {
      return res.status(400).json({ error: 'Sale already exists for this lead' });
    }

    if (!lead.vehicleId) {
      return res.status(400).json({ error: 'This lead is not linked to a vehicle.' });
    }

    const commissionRate = lead.dealer.commissionRate;
    const commissionAmount = Math.round(salePrice * (commissionRate / 100) * 100) / 100;
    const actor = req.session.email || req.session.userId;

    const sale = await prisma.$transaction(async (tx) => {
      const created = await tx.sales.create({
        data: {
          leadId,
          vehicleId: lead.vehicleId,
          refCode: lead.referralCode,
          salePrice,
          commissionRate,
          commissionAmount,
          status: 'pending',
          markedBy: actor,
        },
        include: {
          lead: true,
          vehicle: true,
        },
      });

      await tx.lead.update({
        where: { id: leadId },
        data: { status: 'sold' },
      });

      await tx.auditLog.create({
        data: {
          actorId: req.session.userId,
          dealerId: lead.dealerId,
          entityType: 'sale',
          entityId: created.id,
          action: 'create',
          details: {
            salePrice,
            commissionRate,
            commissionAmount,
            refCode: lead.referralCode,
            leadId: lead.leadId,
          },
        },
      });

      await tx.leadEvent.create({
        data: {
          leadId: lead.id,
          event: 'sold',
          oldValue: lead.status,
          newValue: 'sold',
          actor,
        },
      });

      return created;
    });

    return res.status(201).json(sale);
  } catch (error) {
    console.error('Create sale error:', error);
    return res.status(500).json({ error: 'Failed to create sale' });
  }
};

export const getSales = async (req, res) => {
  try {
    const where = {};

    if (req.session.role !== 'admin') {
      if (!req.session.dealerId) {
        return res.status(403).json({ error: 'No dealer assigned' });
      }
      where.lead = { dealerId: req.session.dealerId };
    }

    const sales = await prisma.sales.findMany({
      where,
      include: {
        lead: {
          include: { dealer: true },
        },
        vehicle: true,
        confirmedBy: true,
        payments: true,
      },
      orderBy: { soldAt: 'desc' },
    });

    return res.json(sales);
  } catch (error) {
    console.error('Get sales error:', error);
    return res.status(500).json({ error: 'Failed to fetch sales' });
  }
};

export const confirmSale = async (req, res) => {
  try {
    const { id } = req.params;

    const sale = await prisma.sales.findUnique({
      where: { id },
      include: { lead: true },
    });

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    if (req.session.role !== 'admin' && req.session.dealerId !== sale.lead.dealerId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (sale.status === 'confirmed' || sale.status === 'completed') {
      return res.status(400).json({ error: 'Sale is already confirmed.' });
    }

    const updatedSale = await prisma.$transaction(async (tx) => {
      const updated = await tx.sales.update({
        where: { id },
        data: {
          status: 'confirmed',
          confirmedById: req.session.userId,
          confirmedAt: new Date(),
        },
        include: { lead: true, vehicle: true, confirmedBy: true },
      });

      await tx.auditLog.create({
        data: {
          actorId: req.session.userId,
          dealerId: sale.lead.dealerId,
          entityType: 'sale',
          entityId: sale.id,
          action: 'confirm',
          details: { oldStatus: sale.status, newStatus: 'confirmed' },
        },
      });

      return updated;
    });

    return res.json(updatedSale);
  } catch (error) {
    console.error('Confirm sale error:', error);
    return res.status(500).json({ error: 'Failed to confirm sale' });
  }
};
