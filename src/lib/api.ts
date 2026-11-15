const SESSION_STORAGE_KEY = 'zola_session_token';
const CSRF_STORAGE_KEY = 'zola_csrf_token';

function readStored(key: string): string | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function writeStored(key: string, val: string | null) {
  try {
    if (typeof window === 'undefined') return;
    if (val) window.sessionStorage.setItem(key, val);
    else window.sessionStorage.removeItem(key);
  } catch {
    // Ignore storage errors
  }
}

let csrfTokenCache: string | null = readStored(CSRF_STORAGE_KEY);
let sessionTokenCache: string | null = readStored(SESSION_STORAGE_KEY);

export function setCsrfToken(token: string | null) {
  csrfTokenCache = token;
  writeStored(CSRF_STORAGE_KEY, token);
}

export function setSessionToken(token: string | null) {
  sessionTokenCache = token;
  writeStored(SESSION_STORAGE_KEY, token);
}

export function getSessionToken(): string | null {
  return sessionTokenCache;
}

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (sessionTokenCache && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${sessionTokenCache}`);
  }
  if (csrfTokenCache && options.method && !['GET', 'HEAD', 'OPTIONS'].includes(options.method.toUpperCase())) {
    headers.set('X-CSRF-Token', csrfTokenCache);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Erreur réseau (${res.status})`);
  }
  return data as T;
}

export const AFRICAN_COUNTRIES = [
  'Burkina Faso',
  "Côte d'Ivoire",
  'Sénégal',
  'Mali',
  'Bénin',
  'Togo',
  'Niger',
  'Guinée',
  'Cameroun',
  'Gabon',
  'Congo',
  'RD Congo',
  'Rwanda',
  'Maroc',
  'Tunisie',
  'Algérie',
  'Ghana',
  'Nigeria',
  'Kenya',
  'Afrique du Sud',
];

export const ZODIAC_SIGNS = [
  'Bélier',
  'Taureau',
  'Gémeaux',
  'Cancer',
  'Lion',
  'Vierge',
  'Balance',
  'Scorpion',
  'Sagittaire',
  'Capricorne',
  'Verseau',
  'Poissons',
];
