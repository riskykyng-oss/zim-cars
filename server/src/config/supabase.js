import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || 'vehicle-images';

// The service role key is server-only. Never expose it to the client bundle.
export const supabase = url && serviceRoleKey
  ? createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  : null;

export const hasSupabaseStorage = () => Boolean(supabase);

export const getPublicImageUrl = (filename) => supabase
  .storage
  .from(storageBucket)
  .getPublicUrl(filename)
  .data
  .publicUrl;

export const uploadImageBuffer = async (buffer, filename, contentType) => {
  const { error } = await supabase
    .storage
    .from(storageBucket)
    .upload(filename, buffer, { contentType, upsert: false });

  if (error) throw error;
  return getPublicImageUrl(filename);
};

export const deleteImageByUrl = async (imageUrl) => {
  const marker = `/object/public/${storageBucket}/`;
  const markerIndex = imageUrl.indexOf(marker);
  if (markerIndex === -1) return false;

  const storagePath = decodeURIComponent(
    imageUrl.slice(markerIndex + marker.length).split('?')[0]
  );
  if (!storagePath) return false;

  const { error } = await supabase.storage.from(storageBucket).remove([storagePath]);
  if (error) throw error;
  return true;
};
