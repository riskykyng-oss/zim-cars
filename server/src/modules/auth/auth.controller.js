import bcrypt from 'bcryptjs';
import prisma from '../../config/database.js';
import crypto from 'crypto';

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  dealerId: user.dealerId,
  dealerName: user.dealer?.name,
});

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
      include: { dealer: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Prevent session fixation: discard any pre-login session ID.
    await new Promise((resolve, reject) => {
      req.session.regenerate((err) => (err ? reject(err) : resolve()));
    });

    req.session.userId = user.id;
    req.session.email = user.email;
    req.session.role = user.role;
    req.session.dealerId = user.dealerId;
    req.session.dealerName = user.dealer?.name;

    await new Promise((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });

    return res.json({ user: publicUser(user) });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
};

export const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('zimcars.sid', { path: '/' });
    return res.json({ message: 'Logged out successfully' });
  });
};

export const getMe = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      include: { dealer: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    return res.json({ user: publicUser(user) });
  } catch (error) {
    console.error('Get me error:', error);
    return res.status(500).json({ error: 'Failed to get user' });
  }
};

export const registerDealer = async (req, res) => {
  try {
    const {
      businessName,
      ownerFullName,
      email,
      phone,
      location,
      idNumber,
      ecoCashName,
      password,
    } = req.body;

    if (!businessName || !ownerFullName || !email || !phone || !password) {
      return res.status(400).json({ error: 'All required fields must be filled' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const emailLower = String(email).trim().toLowerCase();
    const phoneClean = String(phone).replace(/\s+/g, '');

    const existingUser = await prisma.user.findUnique({ where: { email: emailLower } });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const existingDealerByPhone = await prisma.dealer.findFirst({ where: { phone: phoneClean } });
    if (existingDealerByPhone) {
      return res.status(409).json({ error: 'A dealer with this phone number already exists' });
    }

    const baseSlug = slugify(businessName);
    let slug = baseSlug || `dealer-${crypto.randomUUID().slice(0, 8)}`;
    let counter = 1;
    while (await prisma.dealer.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const trialEndsAt = new Date();
    trialEndsAt.setMonth(trialEndsAt.getMonth() + 2);

    const result = await prisma.$transaction(async (tx) => {
      const dealer = await tx.dealer.create({
        data: {
          name: String(businessName).trim(),
          slug,
          phone: phoneClean,
          location: location ? String(location).trim() : null,
          ownerFullName: String(ownerFullName).trim(),
          businessEmail: emailLower,
          ecoCashName: ecoCashName ? String(ecoCashName).trim() : null,
          idNumber: idNumber ? String(idNumber).trim() : null,
          commissionRate: 3.0,
          status: 'pending_verification',
          verificationStatus: 'pending',
          plan: 'trial',
          trialEndsAt,
        },
      });

      const user = await tx.user.create({
        data: {
          dealerId: dealer.id,
          name: String(ownerFullName).trim(),
          email: emailLower,
          passwordHash: hashedPassword,
          role: 'dealer_owner',
        },
      });

      return { dealer, user };
    });

    // Log them in after registration
    await new Promise((resolve, reject) => {
      req.session.regenerate((err) => (err ? reject(err) : resolve()));
    });

    req.session.userId = result.user.id;
    req.session.email = result.user.email;
    req.session.role = result.user.role;
    req.session.dealerId = result.user.dealerId;
    req.session.dealerName = result.dealer.name;

    await new Promise((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });

    return res.status(201).json({
      message: 'Registration submitted. Please upload your verification documents for admin review.',
      user: publicUser(result.user),
      dealer: result.dealer,
    });
  } catch (error) {
    console.error('Register dealer error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
};

export const uploadVerification = async (req, res) => {
  try {
    if (!req.session.dealerId) {
      return res.status(403).json({ error: 'No dealer assigned' });
    }

    const { type, notes } = req.body;
    if (!type) {
      return res.status(400).json({ error: 'Document type required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Document file required' });
    }

    const allowedTypes = ['national_id', 'passport', 'proof_of_address', 'business_registration', 'other'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid document type' });
    }

    const path = await import('path');
    const { v4: uuidv4 } = await import('uuid');
    const { hasSupabaseStorage, uploadDocumentBuffer } = await import('../../config/supabase.js');
    const { uploadDir, ensureUploadDir } = await import('../../middleware/upload.js');
    const fs = await import('fs');

    const extension = path.extname(req.file.originalname).toLowerCase() || '.jpg';
    const filename = `verifications/${req.session.dealerId}/${uuidv4()}${extension}`;

    let fileUrl;
    if (hasSupabaseStorage()) {
      fileUrl = await uploadDocumentBuffer(req.file.buffer, filename, req.file.mimetype);
    } else {
      if (process.env.VERCEL) {
        return res.status(500).json({ error: 'Document storage is not configured.' });
      }
      ensureUploadDir();
      fs.writeFileSync(path.join(uploadDir, filename.replace('verifications/', '')), req.file.buffer);
      fileUrl = `/uploads/${filename.replace('verifications/', '')}`;
    }

    const verification = await prisma.dealerVerification.create({
      data: {
        dealerId: req.session.dealerId,
        type,
        fileUrl,
        notes: notes || null,
        status: 'pending',
      },
    });

    await prisma.dealer.update({
      where: { id: req.session.dealerId },
      data: { verificationStatus: 'in_review' },
    });

    return res.status(201).json(verification);
  } catch (error) {
    console.error('Upload verification error:', error);
    return res.status(500).json({ error: 'Failed to upload document' });
  }
};

export const getDealerVerification = async (req, res) => {
  try {
    if (!req.session.dealerId) {
      return res.status(403).json({ error: 'No dealer assigned' });
    }

    const dealer = await prisma.dealer.findUnique({
      where: { id: req.session.dealerId },
      include: { verifications: { orderBy: { createdAt: 'desc' } } },
    });

    return res.json({
      dealer: {
        status: dealer?.status,
        verificationStatus: dealer?.verificationStatus,
        rejectionReason: dealer?.rejectionReason,
        trialEndsAt: dealer?.trialEndsAt,
        subscriptionEndsAt: dealer?.subscriptionEndsAt,
        slug: dealer?.slug,
        ownerFullName: dealer?.ownerFullName,
      },
      verifications: dealer?.verifications || [],
    });
  } catch (error) {
    console.error('Get verification error:', error);
    return res.status(500).json({ error: 'Failed to get verification status' });
  }
};

export const getAllDealers = async (req, res) => {
  try {
    const dealers = await prisma.dealer.findMany({
      include: {
        users: true,
        verifications: { orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(dealers);
  } catch (error) {
    console.error('Get all dealers error:', error);
    return res.status(500).json({ error: 'Failed to fetch dealers' });
  }
};

export const verifyDealer = async (req, res) => {
  try {
    const { id } = req.params;
    const dealer = await prisma.dealer.findUnique({ 
      where: { id },
      include: { verifications: true },
    });
    if (!dealer) {
      return res.status(404).json({ error: 'Dealer not found' });
    }

    const hasId = dealer.verifications.some(v => (v.type === 'national_id' || v.type === 'passport') && v.status !== 'rejected');
    const hasProof = dealer.verifications.some(v => v.type === 'proof_of_address' && v.status !== 'rejected');
    
    if (!hasId || !hasProof) {
      return res.status(400).json({ 
        error: 'Cannot approve: National ID/Passport and Proof of Address are required for a legitimate verification profile.' 
      });
    }

    const trialEndsAt = dealer.trialEndsAt || (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + 2);
      return d;
    })();

    await prisma.dealer.update({
      where: { id },
      data: {
        verificationStatus: 'verified',
        verifiedAt: new Date(),
        verifiedBy: req.session.userId,
        status: 'trial',
        plan: 'trial',
        trialEndsAt,
        rejectionReason: null,
      },
    });

    await prisma.dealerVerification.updateMany({
      where: { dealerId: id, status: 'pending' },
      data: { status: 'approved', reviewedBy: req.session.userId, reviewedAt: new Date() },
    });

    return res.json({ message: 'Dealer verified. 2-month trial activated.' });
  } catch (error) {
    console.error('Verify dealer error:', error);
    return res.status(500).json({ error: 'Failed to verify dealer' });
  }
};

export const rejectDealer = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: 'Rejection reason required' });
    }

    await prisma.dealer.update({
      where: { id },
      data: {
        verificationStatus: 'rejected',
        status: 'rejected',
        rejectionReason: String(reason).trim(),
        verifiedBy: req.session.userId,
      },
    });

    await prisma.dealerVerification.updateMany({
      where: { dealerId: id, status: 'pending' },
      data: { status: 'rejected', reviewedBy: req.session.userId, reviewedAt: new Date() },
    });

    return res.json({ message: 'Dealer rejected' });
  } catch (error) {
    console.error('Reject dealer error:', error);
    return res.status(500).json({ error: 'Failed to reject dealer' });
  }
};

export const getPublicDealerProfile = async (req, res) => {
  try {
    const { slug } = req.params;
    const dealer = await prisma.dealer.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        phone: true,
        location: true,
        status: true,
        trialEndsAt: true,
        subscriptionEndsAt: true,
        createdAt: true,
      },
    });

    if (!dealer) {
      return res.status(404).json({ error: 'Dealer not found' });
    }

    const isEligible =
      dealer.status === 'active' ||
      (dealer.status === 'trial' && dealer.trialEndsAt && new Date(dealer.trialEndsAt) > new Date());

    if (!isEligible) {
      return res.status(404).json({ error: 'Dealer profile not available' });
    }

    const vehicles = await prisma.vehicle.findMany({
      where: {
        dealerId: dealer.id,
        status: 'available',
        images: { some: {} },
      },
      include: {
        images: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ dealer, vehicles });
  } catch (error) {
    console.error('Get public dealer profile error:', error);
    return res.status(500).json({ error: 'Failed to fetch dealer profile' });
  }
};
