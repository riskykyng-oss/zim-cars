const REF_KEY = 'zimcars_ref';
const REF_COOKIE = 'zimcars_ref';
const REF_TTL_DAYS = 30;

function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/; SameSite=Lax';
}

function getCookie(name) {
  const value = '; ' + document.cookie;
  const parts = value.split('; ' + name + '=');
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
  return null;
}

export function captureRef() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  if (ref && /^[A-Za-z0-9_-]{2,30}$/.test(ref)) {
    const code = ref.toUpperCase();
    localStorage.setItem(REF_KEY, JSON.stringify({ code, ts: Date.now() }));
    setCookie(REF_COOKIE, code, REF_TTL_DAYS);
    return code;
  }
  const stored = localStorage.getItem(REF_KEY);
  if (stored) {
    try {
      const data = JSON.parse(stored);
      if (Date.now() - data.ts < REF_TTL_DAYS * 864e5) {
        setCookie(REF_COOKIE, data.code, REF_TTL_DAYS);
        return data.code;
      }
    } catch (e) {}
  }
  return getCookie(REF_COOKIE);
}

export function getRef() {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(REF_KEY);
  if (stored) {
    try {
      const data = JSON.parse(stored);
      if (Date.now() - data.ts < REF_TTL_DAYS * 864e5) return data.code;
    } catch (e) {}
  }
  return getCookie(REF_COOKIE);
}
