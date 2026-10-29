export const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.session.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!roles.includes(req.session.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};

export const requireDealerAccess = (req, res, next) => {
  // Admin can access all dealers
  if (req.session.role === 'admin') {
    return next();
  }
  // Dealer users must have a dealerId
  if (!req.session.dealerId) {
    return res.status(403).json({ error: 'Forbidden - No dealer assigned' });
  }
  next();
};
