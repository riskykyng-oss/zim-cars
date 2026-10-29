import bcrypt from 'bcryptjs';
import prisma from '../../config/database.js';

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  dealerId: user.dealerId,
  dealerName: user.dealer?.name,
});

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
