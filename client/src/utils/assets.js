// Image URLs are stored either as a full Supabase public URL or, in local
// development, as a path like /uploads/photo.jpg. When the API is hosted on a
// different origin, set VITE_API_ORIGIN to that origin.
const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN || '').replace(/\/$/, '');

export const assetUrl = (url) => {
  if (!url) return '';
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${API_ORIGIN}${path}`;
};

export default assetUrl;
