import 'dotenv/config';
import { supabase, storageBucket } from '../src/config/supabase.js';

const run = async () => {
  if (!supabase) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.');
  }

  const { data: existing, error: getError } = await supabase.storage.getBucket(storageBucket);

  if (existing) {
    console.log(`Bucket "${storageBucket}" already exists.`);
  } else {
    if (getError && !/not found/i.test(getError.message)) {
      console.warn('Bucket lookup warning:', getError.message);
    }

    const { error } = await supabase.storage.createBucket(storageBucket, {
      public: true,
      fileSizeLimit: '4MB',
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });

    if (error) {
      throw new Error(`Could not create bucket "${storageBucket}": ${error.message}`);
    }

    console.log(`Created public bucket "${storageBucket}".`);
  }

  console.log('Storage setup complete. Uploads are served from the public bucket URL.');
};

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
