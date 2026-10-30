import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { sessionConfig } from './config/session.js';

// Import routes
import authRoutes from './modules/auth/auth.routes.js';
import vehiclesRoutes from './modules/vehicles/vehicles.routes.js';
import leadsRoutes from './modules/leads/leads.routes.js';
import salesRoutes from './modules/sales/sales.routes.js';
import commissionsRoutes from './modules/commissions/commissions.routes.js';
import paymentsRoutes from './modules/payments/payments.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// Vercel terminates TLS in front of the function, so Express needs to trust
// the first proxy hop for secure cookies and client IP detection.
app.set('trust proxy', 1);

// Vercel's catch-all function may strip the /api prefix from req.url. Normalise
// it so the same Express routes work locally and in production.
app.use((req, res, next) => {
  if (process.env.VERCEL && !req.url.startsWith('/api')) {
    req.url = `/api${req.url}`;
  }
  next();
});

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
if (process.env.VERCEL_URL) {
  allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
}

app.use(cors({
  origin: (origin, callback) => {
    // Same-origin requests and server-to-server calls have no Origin header.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(session(sessionConfig));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check should not be rate limited.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Basic protection for the whole API. The in-memory store is per instance;
// use a shared store (e.g. Upstash Redis) if you need strict global limits.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
app.use('/api', apiLimiter);

// Public lead creation is the most abuse-prone endpoint.
const leadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many enquiries. Try again later.' },
});
app.use('/api/leads', (req, res, next) => (
  req.method === 'POST' ? leadLimiter(req, res, next) : next()
));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/commissions', commissionsRoutes);
app.use('/api/payments', paymentsRoutes);

// Unknown API route
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Central error handler (multer, body-parser, and unexpected errors)
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Image is too large. Maximum size is 4 MB.' });
    }
    return res.status(400).json({ error: err.message });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large.' });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body.' });
  }

  // File filter rejections from multer
  if (err.message && err.message.includes('Only image files')) {
    return res.status(400).json({ error: err.message });
  }

  console.error('Unhandled API error:', err);
  return res.status(500).json({ error: 'Something went wrong.' });
});

// On Vercel the app is exported as a serverless handler. Locally we listen.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}${isProduction ? ' (production)' : ''}`);
  });
}

export default app;
