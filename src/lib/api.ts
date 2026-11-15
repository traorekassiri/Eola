let csrfTokenCache: string | null = null;

export function setCsrfToken(token: string | null) {
  csrfTokenCache = token;
}

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
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
