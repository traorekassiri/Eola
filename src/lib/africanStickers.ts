export interface CulturalSticker {
  id: string;
  label: string;
  origin: string;
  svg: string;
  image_url?: string;
}

function wrapStickerSvg(inner: string, accentA: string, accentB: string, title: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320" height="320">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E1412" />
      <stop offset="100%" stop-color="#110B0A" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${accentA}" />
      <stop offset="100%" stop-color="${accentB}" />
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="46%" r="50%">
      <stop offset="0%" stop-color="${accentA}" stop-opacity="0.24" />
      <stop offset="100%" stop-color="${accentA}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect x="12" y="12" width="296" height="296" rx="56" fill="url(#bgGrad)" stroke="url(#goldGrad)" stroke-width="5" />
  <rect x="24" y="24" width="272" height="272" rx="46" fill="url(#glow)" stroke="rgba(255,255,255,0.08)" stroke-width="1.5" stroke-dasharray="8 6" />
  <g>${inner}</g>
  <rect x="48" y="246" width="224" height="36" rx="18" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.12)" stroke-width="1.2" />
  <text x="160" y="269" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" fill="#FDE68A" letter-spacing="1">${title}</text>
</svg>`;
}

export const AFRICAN_STICKERS: CulturalSticker[] = [
  {
    id: 'akoma',
    label: 'Akoma',
    origin: 'Adinkra • Amour & Patience',
    svg: wrapStickerSvg(
      `
      <path d="M160 212 C160 212 86 164 86 112 C86 84 108 66 132 66 C148 66 156 76 160 86 C164 76 172 66 188 66 C212 66 234 84 234 112 C234 164 160 212 160 212 Z" fill="url(#goldGrad)" />
      <path d="M160 184 C160 184 112 152 112 116 C112 98 126 86 140 86 C151 86 157 93 160 101 C163 93 169 86 180 86 C194 86 208 98 208 116 C208 152 160 184 160 184 Z" fill="#18100E" />
      <circle cx="160" cy="134" r="16" fill="url(#goldGrad)" />
      <path d="M160 50 L166 60 L154 60 Z M70 120 L80 126 L80 114 Z M250 120 L240 126 L240 114 Z" fill="#FBBF24" />
      `,
      '#F97316',
      '#FBBF24',
      'AKOMA • AMOUR'
    ),
  },
  {
    id: 'gye-nyame',
    label: 'Gye Nyame',
    origin: 'Adinkra • Harmonie',
    svg: wrapStickerSvg(
      `
      <circle cx="160" cy="142" r="76" fill="none" stroke="url(#goldGrad)" stroke-width="5" stroke-dasharray="10 6" />
      <path d="M160 76 C196 76 218 106 200 132 C188 148 164 142 164 126 C164 116 174 110 182 116" fill="none" stroke="url(#goldGrad)" stroke-width="11" stroke-linecap="round" />
      <path d="M160 208 C124 208 102 178 120 152 C132 136 156 142 156 158 C156 168 146 174 138 168" fill="none" stroke="url(#goldGrad)" stroke-width="11" stroke-linecap="round" />
      <path d="M114 102 L144 132 M206 182 L176 152" stroke="#FDE68A" stroke-width="9" stroke-linecap="round" />
      <circle cx="160" cy="142" r="10" fill="#EF4444" stroke="#FDE68A" stroke-width="3" />
      `,
      '#FBBF24',
      '#EA580C',
      'GYE NYAME'
    ),
  },
  {
    id: 'djembe',
    label: 'Djembé',
    origin: "Afrique de l'Ouest • Joie",
    svg: wrapStickerSvg(
      `
      <path d="M108 86 L212 86 L192 152 L176 166 L186 214 L134 214 L144 166 L128 152 Z" fill="url(#goldGrad)" />
      <ellipse cx="160" cy="86" rx="54" ry="16" fill="#FDE68A" stroke="#9A3412" stroke-width="4" />
      <path d="M116 102 L126 146 M138 104 L142 152 M160 105 L160 154 M182 104 L178 152 M204 102 L194 146" stroke="#1A110F" stroke-width="4" stroke-linecap="round" />
      <path d="M84 118 Q72 134 84 150 M236 118 Q248 134 236 150" fill="none" stroke="#FBBF24" stroke-width="5" stroke-linecap="round" />
      <path d="M68 106 Q50 134 68 162 M252 106 Q270 134 252 162" fill="none" stroke="#FB923C" stroke-width="4" stroke-linecap="round" />
      `,
      '#EA580C',
      '#FBBF24',
      'RYTHME & JOIE'
    ),
  },
  {
    id: 'kente',
    label: 'Éclat Kente',
    origin: 'Motif Royal • Fierté',
    svg: wrapStickerSvg(
      `
      <g transform="translate(160,142)">
        <polygon points="0,-74 74,0 0,74 -74,0" fill="#EA580C" stroke="#FDE68A" stroke-width="4" />
        <polygon points="0,-52 52,0 0,52 -52,0" fill="#10B981" stroke="#FDE68A" stroke-width="3" />
        <rect x="-32" y="-32" width="64" height="64" fill="#FBBF24" stroke="#140E0D" stroke-width="4" />
        <polygon points="0,-24 24,0 0,24 -24,0" fill="#DC2626" />
        <circle cx="0" cy="0" r="8" fill="#FEF3C7" />
      </g>
      `,
      '#FBBF24',
      '#10B981',
      'ÉCLAT KENTE'
    ),
  },
  {
    id: 'baobab',
    label: 'Baobab',
    origin: 'Savane • Coucher de soleil',
    svg: wrapStickerSvg(
      `
      <circle cx="160" cy="134" r="68" fill="url(#goldGrad)" />
      <path d="M144 212 L148 144 Q146 124 114 114 Q134 110 148 118 Q138 96 126 88 Q148 92 158 110 Q164 88 168 78 Q172 94 168 112 Q186 92 204 94 Q186 106 174 122 Q194 116 212 122 Q184 128 172 146 L176 212 Z" fill="#18100E" />
      <ellipse cx="160" cy="214" rx="76" ry="8" fill="#18100E" />
      `,
      '#FDE047',
      '#DC2626',
      'TERRE & SOLEIL'
    ),
  },
  {
    id: 'sankofa',
    label: 'Sankofa',
    origin: 'Adinkra • Sagesse',
    svg: wrapStickerSvg(
      `
      <path d="M160 206 C106 206 82 162 104 122 C116 98 142 96 154 116 C160 126 160 138 160 146 C160 138 160 126 166 116 C178 96 204 98 216 122 C238 162 214 206 160 206 Z" fill="none" stroke="url(#goldGrad)" stroke-width="12" stroke-linejoin="round" />
      <path d="M160 72 C142 72 132 88 142 102 C150 112 170 112 178 102 C188 88 178 72 160 72 Z" fill="url(#goldGrad)" />
      <circle cx="132" cy="144" r="10" fill="#FDE68A" />
      <circle cx="188" cy="144" r="10" fill="#FDE68A" />
      <circle cx="160" cy="176" r="10" fill="#EF4444" />
      `,
      '#FBBF24',
      '#F97316',
      'SANKOFA'
    ),
  },
  {
    id: 'teranga',
    label: 'Teranga',
    origin: 'Hospitalité • Akwaaba',
    svg: wrapStickerSvg(
      `
      <path d="M92 132 C92 186 124 214 160 214 C196 214 228 186 228 132 Z" fill="url(#goldGrad)" />
      <ellipse cx="160" cy="132" rx="68" ry="16" fill="#FDE68A" stroke="#7C2D12" stroke-width="4" />
      <path d="M112 154 L132 174 L160 150 L188 174 L208 154" fill="none" stroke="#18100E" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M138 96 Q130 80 142 66 M162 92 Q154 74 166 58 M184 96 Q176 80 188 66" fill="none" stroke="#FBBF24" stroke-width="5" stroke-linecap="round" />
      `,
      '#FB923C',
      '#FACC15',
      'TERANGA • AKWAABA'
    ),
  },
  {
    id: 'masque',
    label: 'Art Royal',
    origin: 'Masque • Prestige',
    svg: wrapStickerSvg(
      `
      <path d="M160 66 C198 66 216 102 210 146 C204 190 184 216 160 216 C136 216 116 190 110 146 C104 102 122 66 160 66 Z" fill="url(#goldGrad)" />
      <path d="M126 124 Q142 114 152 126 Q140 134 126 124 Z M194 124 Q178 114 168 126 Q180 134 194 124 Z" fill="#18100E" />
      <path d="M160 110 L160 162" stroke="#18100E" stroke-width="7" stroke-linecap="round" />
      <rect x="142" y="176" width="36" height="10" rx="5" fill="#18100E" />
      <path d="M130 92 L190 92 M122 150 L140 156 M198 150 L180 156" stroke="#7C2D12" stroke-width="4" stroke-linecap="round" />
      `,
      '#FBBF24',
      '#C2410C',
      'PRESTIGE ZOLA'
    ),
  },
];

export function getStickerDataUrl(sticker: CulturalSticker): string {
  if (sticker.image_url) return sticker.image_url;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sticker.svg)}`;
}

export async function stickerToPngFile(sticker: CulturalSticker): Promise<File> {
  const url = getStickerDataUrl(sticker);
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.width = 320;
  img.height = 320;

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Impossible de préparer le sticker.'));
    img.src = url;
  });

  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Contexte graphique indisponible.');
  }
  ctx.clearRect(0, 0, 320, 320);
  ctx.drawImage(img, 0, 0, 320, 320);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Conversion PNG du sticker impossible.'));
    }, 'image/png');
  });

  return new File([blob], `zola-sticker-${sticker.id}.png`, { type: 'image/png' });
}
