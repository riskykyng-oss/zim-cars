import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Only used for the local-development fallback when Supabase Storage is not
// configured. Vercel's filesystem is read-only, so production always uses
// Supabase Storage.
export const uploadDir = path.join(__dirname, '../../uploads');

export const ensureUploadDir = () => {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
};

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  }
  return cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed!'));
};

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    // Vercel rejects request bodies above 4.5 MB, so stay below that.
    fileSize: 4 * 1024 * 1024,
  },
  fileFilter,
});
