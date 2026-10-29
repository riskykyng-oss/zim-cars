import app from '../server/src/app.js';

// Vercel routes every /api/* request to this catch-all function. The Express
// app is exported directly so that request streams (including multipart
// uploads handled by multer) are not consumed by the platform first.
export default app;
