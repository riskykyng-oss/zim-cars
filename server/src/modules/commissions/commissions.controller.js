import prisma from '../../config/database.js';

const roundMoney = (value) => Math.round(value * 100) / 100;

export const getCommissionsSummary = async (req, res) => {
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
        payments: true,
      },
    });

    let totalCommissionEarned = 0;
    let totalPaid = 0;
    let pendingCommission = 0;

    for (const sale of sales) {
      const paidAmount = sale.payments.reduce((sum, p) => sum + p.amount, 0);

      // Pending sales are not earned yet, so they do not count towards the
      // balance owed. Payments are only allowed on confirmed sales.
      if (sale.status === 'confirmed' || sale.status === 'completed') {
        totalCommissionEarned += sale.commissionAmount;
        totalPaid += paidAmount;
      } else {
        pendingCommission += sale.commissionAmount;
      }
    }

    totalCommissionEarned = roundMoney(totalCommissionEarned);
    totalPaid = roundMoney(totalPaid);
    pendingCommission = roundMoney(pendingCommission);

    return res.json({
      totalCommissionEarned,
      totalPaid,
      totalOutstanding: roundMoney(totalCommissionEarned - totalPaid),
      pendingCommission,
      salesCount: sales.length,
      confirmedSalesCount: sales.filter(
        (sale) => sale.status === 'confirmed' || sale.status === 'completed'
      ).length,
    });
  } catch (error) {
    console.error('Get commissions summary error:', error);
    return res.status(500).json({ error: 'Failed to fetch commissions' });
  }
};

export const recordPayment = async (req, res) => {
  try {
    const { saleId, paymentReference } = req.body;
    const amount = Number(req.body.amount);

    if (!saleId) {
      return res.status(400).json({ error: 'A sale is required.' });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Enter a valid payment amount greater than zero.' });
    }

    // Only admin can record payments
    if (req.session.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can record payments' });
    }

    const sale = await prisma.sales.findUnique({
      where: { id: saleId },
      include: { lead: true, payments: true },
    });

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    if (sale.status !== 'confirmed' && sale.status !== 'completed') {
      return res.status(400).json({ error: 'Confirm the sale before recording commission payments.' });
    }

    const alreadyPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = roundMoney(sale.commissionAmount - alreadyPaid);

    if (outstanding <= 0) {
      return res.status(400).json({ error: 'This commission has already been paid in full.' });
    }

    if (amount > outstanding) {
      return res.status(400).json({
        error: `Payment exceeds the outstanding commission of ${outstanding.toFixed(2)}.`,
      });
    }

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.commissionPayment.create({
        data: {
          saleId,
          amount: roundMoney(amount),
          paymentReference: typeof paymentReference === 'string' && paymentReference.trim()
            ? paymentReference.trim()
            : null,
          recordedById: req.session.userId,
        },
        include: {
          recordedBy: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: req.session.userId,
          dealerId: sale.lead.dealerId,
          entityType: 'commission_payment',
          entityId: created.id,
          action: 'create',
          details: {
            saleId,
            amount: roundMoney(amount),
            paymentReference: created.paymentReference,
          },
        },
      });

      return created;
    });

    return res.status(201).json(payment);
  } catch (error) {
    console.error('Record payment error:', error);
    return res.status(500).json({ error: 'Failed to record payment' });
  }
};

export const getPayments = async (req, res) => {
  try {
    const where = {};

    if (req.session.role !== 'admin') {
      if (!req.session.dealerId) {
        return res.status(403).json({ error: 'No dealer assigned' });
      }
      where.sale = { lead: { dealerId: req.session.dealerId } };
    }

    const payments = await prisma.commissionPayment.findMany({
      where,
      include: {
        sale: {
          include: {
            lead: {
              include: { dealer: true },
            },
            vehicle: true,
          },
        },
        recordedBy: true,
      },
      orderBy: { paidAt: 'desc' },
    });

    return res.json(payments);
  } catch (error) {
    console.error('Get payments error:', error);
    return res.status(500).json({ error: 'Failed to fetch payments' });
  }
};
