import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pg from 'pg';

const isProduction = process.env.NODE_ENV === 'production';

const secret = process.env.SESSION_SECRET
  || (isProduction ? null : 'dev-secret-key-change-in-production');

if (!secret) {
  throw new Error('SESSION_SECRET must be set in production');
}

if (isProduction && !process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set in production; in-memory sessions are not supported.');
}

// connect-pg-simple needs a normal Postgres connection. Supabase's transaction
// pooler URL contains pgbouncer/connection_limit params that node-postgres does
// not understand, so strip them here.
const stripPoolerParams = (connectionString) => connectionString
  .replace(/([?&])(pgbouncer|connection_limit|sslmode)=[^&]*/g, '$1')
  .replace(/[?&]$/, '');

const buildStore = () => {
  if (!process.env.DATABASE_URL) {
    return new session.MemoryStore();
  }

  const pool = new pg.Pool({
    connectionString: stripPoolerParams(process.env.SESSION_DATABASE_URL || process.env.DATABASE_URL),
    max: 3,
    ssl: isProduction ? { rejectUnauthorized: false } : undefined,
  });

  const PgSession = connectPgSimple(session);
  return new PgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 15,
  });
};

export const sessionConfig = {
  name: 'zimcars.sid',
  secret,
  resave: false,
  saveUninitialized: false,
  proxy: true,
  store: buildStore(),
  cookie: {
    secure: isProduction,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
};
