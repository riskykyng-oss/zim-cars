import prisma from '../config/database.js';

export const requireDealerActive = async (req, res, next) => {
  try {
    // Admins can do everything
    if (req.session.role === 'admin') {
      return next();
    }

    if (!req.session.dealerId) {
      return res.status(403).json({ error: 'No dealer assigned to this account' });
    }

    const dealer = await prisma.dealer.findUnique({
      where: { id: req.session.dealerId },
    });

    if (!dealer) {
      return res.status(403).json({ error: 'Dealer not found' });
    }

    if (dealer.verificationStatus !== 'verified') {
      return res.status(403).json({ 
        error: 'Your dealer account is pending verification. Upload your ID and supporting documents for review.',
        code: 'NOT_VERIFIED'
      });
    }

    if (dealer.status === 'rejected') {
      return res.status(403).json({ 
        error: `Account rejected: ${dealer.rejectionReason || 'Does not meet verification requirements.'}`,
        code: 'REJECTED'
      });
    }

    if (dealer.status === 'suspended') {
      return res.status(403).json({ 
        error: 'Your account has been suspended. Contact support.',
        code: 'SUSPENDED'
      });
    }

    // Check if trial is still active
    if (dealer.status === 'trial') {
      if (dealer.trialEndsAt && new Date(dealer.trialEndsAt) < new Date()) {
        await prisma.dealer.update({
          where: { id: dealer.id },
          data: { status: 'expired' },
        });
        return res.status(403).json({ 
          error: 'Your 2-month free trial has expired. Please subscribe to continue listing vehicles.',
          code: 'TRIAL_EXPIRED'
        });
      }
      return next();
    }

    // Check subscription for non-trial dealers
    if (dealer.status === 'pending_payment') {
      return res.status(403).json({ 
        error: 'Complete your payment to activate your dealer account.',
        code: 'PENDING_PAYMENT'
      });
    }

    if (dealer.status === 'expired') {
      return res.status(403).json({ 
        error: 'Your subscription has expired. Please renew to continue listing vehicles.',
        code: 'SUBSCRIPTION_EXPIRED'
      });
    }

    if (dealer.status === 'suspended') {
      return res.status(403).json({ 
        error: 'Your account has been suspended. Contact support.',
        code: 'SUSPENDED'
      });
    }

    if (dealer.status === 'active') {
      if (dealer.subscriptionEndsAt && new Date(dealer.subscriptionEndsAt) < new Date()) {
        await prisma.dealer.update({
          where: { id: dealer.id },
          data: { status: 'expired' },
        });
        return res.status(403).json({ 
          error: 'Your subscription has expired. Please renew to continue listing vehicles.',
          code: 'SUBSCRIPTION_EXPIRED'
        });
      }
      return next();
    }

    return res.status(403).json({ error: 'Account not activated' });
  } catch (error) {
    console.error('requireDealerActive error:', error);
    return res.status(500).json({ error: 'Failed to verify dealer status' });
  }
};
