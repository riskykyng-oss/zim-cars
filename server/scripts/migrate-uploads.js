import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../src/config/database.js';
import { supabase, storageBucket, uploadImageBuffer } from '../src/config/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../uploads');

const contentTypeFor = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
};

const run = async () => {
  if (!supabase) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.');
  }

  const images = await prisma.vehicleImage.findMany({
    where: { url: { startsWith: '/uploads/' } },
  });

  if (images.length === 0) {
    console.log('No local /uploads images found in the database. Nothing to migrate.');
    return;
  }

  let migrated = 0;
  let missing = 0;

  for (const image of images) {
    const filename = path.basename(image.url);
    const localPath = path.join(uploadsDir, filename);

    if (!fs.existsSync(localPath)) {
      console.warn(`Missing local file for image ${image.id}: ${localPath}`);
      missing += 1;
      continue;
    }

    const buffer = fs.readFileSync(localPath);
    const storagePath = `legacy/${image.id}${path.extname(filename).toLowerCase()}`;
    const publicUrl = await uploadImageBuffer(
      buffer,
      storagePath,
      contentTypeFor(filename)
    );

    await prisma.vehicleImage.update({
      where: { id: image.id },
      data: { url: publicUrl },
    });

    migrated += 1;
    console.log(`Migrated ${image.url} -> ${publicUrl}`);
  }

  console.log(
    `Done. Migrated ${migrated} image(s).`
    + (missing ? ` ${missing} local file(s) were missing.` : '')
  );
  console.log(`Bucket: ${storageBucket}`);
};

run()
  .catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
