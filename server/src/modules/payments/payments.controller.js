import prisma from '../../config/database.js';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { uploadDir, ensureUploadDir } from '../../middleware/upload.js';

export const getPaymentInfo = async (req, res) => {
  try {
    return res.json({
      ecocash: process.env.ECOCASH_NUMBER || '0773412018',
      pricing: {
        joiningFee: 3,
        monthlyFee: 2,
        commissionRate: 3,
        trialMonths: 2,
      },
    });
  } catch (error) {
    console.error('Get payment info error:', error);
    return res.status(500).json({ error: 'Failed to get payment info' });
  }
};

export const submitPayment = async (req, res) => {
  try {
    if (!req.session.dealerId) {
      return res.status(403).json({ error: 'No dealer assigned' });
    }

    const { type, amount, method, reference } = req.body;

    if (!type || !['joining', 'subscription'].includes(type)) {
      return res.status(400).json({ error: 'Invalid payment type' });
    }
    if (!amount || isNaN(parseFloat(amount))) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    if (!method || !['ecocash', 'innbucks', 'onemoney'].includes(method)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    let proofUrl = null;
    if (req.file) {
      ensureUploadDir();
      const extension = path.extname(req.file.originalname).toLowerCase() || '.jpg';
      const filename = `${uuidv4()}${extension}`;
      fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);
      proofUrl = `/uploads/${filename}`;
    }

    const payment = await prisma.payment.create({
      data: {
        dealerId: req.session.dealerId,
        type,
        amount: parseFloat(amount),
        currency: 'USD',
        method,
        reference: reference || null,
        proofUrl,
        status: 'pending',
      },
    });

    // Update dealer status to pending payment
    await prisma.dealer.update({
      where: { id: req.session.dealerId },
      data: { status: 'pending_payment' },
    });

    return res.status(201).json(payment);
  } catch (error) {
    console.error('Submit payment error:', error);
    return res.status(500).json({ error: 'Failed to submit payment' });
  }
};

export const getMyPayments = async (req, res) => {
  try {
    if (!req.session.dealerId) {
      return res.status(403).json({ error: 'No dealer assigned' });
    }

    const payments = await prisma.payment.findMany({
      where: { dealerId: req.session.dealerId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(payments);
  } catch (error) {
    console.error('Get my payments error:', error);
    return res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

export const getAllPayments = async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        dealer: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(payments);
  } catch (error) {
    console.error('Get all payments error:', error);
    return res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

export const approvePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { dealer: true },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ error: 'Payment already processed' });
    }

    const now = new Date();
    const subscriptionEndsAt = new Date(now);
    subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + 1);

    await prisma.$transaction([
      prisma.payment.update({
        where: { id },
        data: {
          status: 'approved',
          approvedBy: req.session.userId,
          approvedAt: now,
          notes: notes || null,
        },
      }),
      prisma.dealer.update({
        where: { id: payment.dealerId },
        data: {
          status: 'active',
          plan: 'starter',
          subscriptionPaid: true,
          onboardingPaid: payment.type === 'joining' ? true : payment.dealer.onboardingPaid,
          lastPaymentAt: now,
          subscriptionEndsAt,
          approvedAt: payment.dealer.approvedAt || now,
        },
      }),
    ]);

    return res.json({ message: 'Payment approved' });
  } catch (error) {
    console.error('Approve payment error:', error);
    return res.status(500).json({ error: 'Failed to approve payment' });
  }
};

export const rejectPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ error: 'Payment already processed' });
    }

    await prisma.$transaction([
      prisma.payment.update({
        where: { id },
        data: {
          status: 'rejected',
          approvedBy: req.session.userId,
          approvedAt: new Date(),
          notes: notes || null,
        },
      }),
      prisma.dealer.update({
        where: { id: payment.dealerId },
        data: { status: 'pending_payment' },
      }),
    ]);

    return res.json({ message: 'Payment rejected' });
  } catch (error) {
    console.error('Reject payment error:', error);
    return res.status(500).json({ error: 'Failed to reject payment' });
  }
};
