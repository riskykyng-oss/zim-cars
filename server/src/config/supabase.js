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

export const uploadDocumentBuffer = async (buffer, filename, contentType, bucket = process.env.SUPABASE_DOCUMENTS_BUCKET || 'dealer-documents') => {
  const { error } = await supabase
    .storage
    .from(bucket)
    .upload(filename, buffer, { contentType, upsert: false });

  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(filename).data.publicUrl;
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

// For sensitive documents (IDs, payment proofs), generate short-lived signed URLs
// when reading records. Falls back to the original URL if signing is unavailable
// (e.g., local dev without Supabase, or non-Supabase URLs).
export const getSignedUrlForStoredUrl = async (storedUrl, expiresIn = 60 * 30) => {
  if (!storedUrl || typeof storedUrl !== 'string') return storedUrl;
  if (!supabase) return storedUrl;
  // Match /object/public/<bucket>/<path> or /storage/v1/object/public/<bucket>/<path>
  const match = storedUrl.match(/\/object\/public\/([^/]+)\/(.+?)(?:\?|$)/);
  if (!match) return storedUrl;
  const bucket = decodeURIComponent(match[1]);
  const filePath = decodeURIComponent(match[2]);
  // Only sign sensitive buckets; vehicle images remain public.
  if (bucket === storageBucket) return storedUrl;
  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, expiresIn);
    if (error || !data?.signedUrl) return storedUrl;
    return data.signedUrl;
  } catch {
    return storedUrl;
  }
};
