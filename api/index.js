import app from '../server/src/app.js';

// Vercel rewrites every /api/* request to this function while preserving the
// original request path. The Express app is exported directly so that request
// streams (including multipart uploads handled by multer) are not consumed by
// the platform first.
export default app;
