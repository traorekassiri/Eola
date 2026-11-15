import { AFRICAN_STICKERS, type CulturalSticker } from './africanStickers';
import type { SiteSettings } from '../types';

export type CmsIconName =
  | 'heart'
  | 'shield'
  | 'zap'
  | 'crown'
  | 'bookmark'
  | 'phone'
  | 'sparkles'
  | 'lock'
  | 'message';

export interface WhyCardItem {
  icon: CmsIconName;
  title_fr: string;
  title_en: string;
  desc_fr: string;
  desc_en: string;
}

export interface BentoCardItem {
  icon: CmsIconName;
  span2: boolean;
  tag_fr: string;
  tag_en: string;
  title_fr: string;
  title_en: string;
  desc_fr: string;
  desc_en: string;
  bullets_fr: string[];
  bullets_en: string[];
}

export interface StepItem {
  step_fr: string;
  step_en: string;
  desc_fr: string;
  desc_en: string;
}

export interface TestimonialItem {
  name: string;
  location_fr: string;
  location_en: string;
  photo: string;
  quote_fr: string;
  quote_en: string;
}

export interface FaqItem {
  q_fr: string;
  q_en: string;
  a_fr: string;
  a_en: string;
}

export interface CountryItem {
  name: string;
  en: string;
  default_city: string;
  code: string;
}

export interface BilingualItem {
  fr: string;
  en: string;
}

export interface CustomStickerConfig {
  id: string;
  label: string;
  origin_fr: string;
  origin_en: string;
  image_url?: string;
}

export interface FooterLinkItem {
  column: 'nav' | 'legal' | 'access';
  label_fr: string;
  label_en: string;
  action: 'section' | 'route' | 'url';
  target: string;
}

export const DEFAULT_FOOTER_LINKS: FooterLinkItem[] = [
  { column: 'nav', label_fr: 'Accueil', label_en: 'Home', action: 'section', target: 'accueil' },
  { column: 'nav', label_fr: 'Pourquoi ZOLA ?', label_en: 'Why ZOLA?', action: 'section', target: 'pourquoi' },
  { column: 'nav', label_fr: 'Fonctionnalités', label_en: 'Features', action: 'section', target: 'fonctionnalites' },
  { column: 'nav', label_fr: 'Tarifs', label_en: 'Pricing', action: 'section', target: 'tarifs' },
  { column: 'nav', label_fr: 'FAQ', label_en: 'FAQ', action: 'section', target: 'faq' },
  { column: 'legal', label_fr: "Conditions d'utilisation", label_en: 'Terms of Use', action: 'route', target: 'legal' },
  { column: 'legal', label_fr: 'Politique de confidentialité', label_en: 'Privacy Policy', action: 'route', target: 'legal' },
  { column: 'legal', label_fr: 'Règles de sécurité', label_en: 'Safety Rules', action: 'route', target: 'legal' },
  { column: 'access', label_fr: 'Connexion', label_en: 'Log in', action: 'route', target: 'login' },
  { column: 'access', label_fr: 'Créer un compte', label_en: 'Create account', action: 'route', target: 'register' },
];

export const DEFAULT_PREMIUM_BENEFITS: BilingualItem[] = [
  { fr: 'Voir qui vous a liké', en: 'See who liked you' },
  { fr: 'Envoyer des messages illimités', en: 'Send unlimited messages' },
  { fr: 'Remonter son profil', en: 'Boost your profile' },
  { fr: 'Accès aux filtres avancés', en: 'Access advanced filters' },
];

export const DEFAULT_WHY_CARDS: WhyCardItem[] = [
  {
    icon: 'heart',
    title_fr: 'Matchs authentiques',
    title_en: 'Authentic matches',
    desc_fr:
      'Des affinités calculées selon vos centres d’intérêt, votre ville et vos valeurs.',
    desc_en:
      'Compatibility scored around your shared interests, city, and personal values.',
  },
  {
    icon: 'shield',
    title_fr: 'Profils vérifiés',
    title_en: 'Verified profiles',
    desc_fr:
      'Contrôle photo avec code défi unique et équipe de modération dédiée.',
    desc_en:
      'Unique challenge-code selfie verification backed by dedicated moderation.',
  },
  {
    icon: 'zap',
    title_fr: 'Messagerie en temps réel',
    title_en: 'Real-time messaging',
    desc_fr:
      'Discutez instantanément avec vos matchs, partagez des photos et des notes vocales.',
    desc_en:
      'Chat live with matches, share photos, cultural stickers, and voice notes.',
  },
  {
    icon: 'crown',
    title_fr: 'Avantages Premium',
    title_en: 'Premium perks',
    desc_fr:
      'Découvrez qui vous a liké, remontez votre profil et payez en FCFA via SasPay en toute sécurité.',
    desc_en:
      'See who liked you, boost your profile visibility, and pay securely in FCFA via SasPay.',
  },
];

export const DEFAULT_BENTO_CARDS: BentoCardItem[] = [
  {
    icon: 'bookmark',
    span2: true,
    tag_fr: 'Favoris & Découverte ciblée',
    tag_en: 'Favorites & Targeted Discovery',
    title_fr: 'Sauvegardez vos coups de cœur pour plus tard',
    title_en: 'Bookmark your favorite profiles for later',
    desc_fr:
      'Ajoutez un profil à votre liste dédiée de Favoris en un geste depuis la découverte ou sa fiche complète, filtrez par pays, ville ou centres d’intérêt et retrouvez vos coups de cœur à tout moment.',
    desc_en:
      'Save any profile to your dedicated Favorites list in one tap from Discover or a member profile, filter by country, city, or interests, and revisit your saved matches anytime.',
    bullets_fr: [
      'Filtres par pays, ville et affinités',
      'Liste Favoris synchronisée',
      'Super Like & Boost prioritaires',
    ],
    bullets_en: [
      'Filters by country, city & affinities',
      'Synced Favorites list',
      'Priority Super Like & Boost',
    ],
  },
  {
    icon: 'phone',
    span2: false,
    tag_fr: 'Audio & Vidéo WebRTC',
    tag_en: 'WebRTC Audio & Video',
    title_fr: 'Appels chiffrés intégrés',
    title_en: 'Built-in encrypted calls',
    desc_fr:
      'Passez de la discussion texte à un appel vocal ou vidéo HD directement dans ZOLA sans partager votre numéro personnel.',
    desc_en:
      'Move smoothly from text chat to an HD voice or video call right inside ZOLA without exposing your personal phone number.',
    bullets_fr: [],
    bullets_en: [],
  },
  {
    icon: 'sparkles',
    span2: false,
    tag_fr: 'Stickers culturels africains',
    tag_en: 'African Cultural Stickers',
    title_fr: 'Exprimez-vous avec vos symboles',
    title_en: 'Express yourself with iconic symbols',
    desc_fr:
      'Envoyez des stickers Adinkra, Teranga, Kente, Baobab ou Djembé ainsi que des notes vocales dans vos conversations.',
    desc_en:
      'Send Adinkra, Teranga, Kente, Baobab, or Djembe stickers along with voice notes directly in your conversations.',
    bullets_fr: [],
    bullets_en: [],
  },
  {
    icon: 'shield',
    span2: true,
    tag_fr: 'Confidentialité & Modération active',
    tag_en: 'Privacy & Active Moderation',
    title_fr: 'Vous gardez le contrôle total de vos échanges',
    title_en: 'Stay in full control of every interaction',
    desc_fr:
      'Validation des profils par selfie avec code défi, authentification 2FA, signalement rapide et blocage immédiat avec suppression instantanée de la conversation et du match.',
    desc_en:
      'Challenge-code selfie verification, optional 2FA, fast reporting, and one-tap blocking that immediately clears the match and conversation.',
    bullets_fr: [
      'Badge vérifié par selfie',
      'Blocage immédiat',
      'Sécurité 2FA & gestion des sessions',
    ],
    bullets_en: [
      'Selfie-verified badge',
      'Instant user blocking',
      '2FA security & session control',
    ],
  },
];

export const DEFAULT_HOW_IT_WORKS: StepItem[] = [
  {
    step_fr: '01. Créez votre profil vérifié',
    step_en: '01. Create your verified profile',
    desc_fr:
      'Renseignez votre ville, vos centres d’intérêt et confirmez votre identité par selfie défi pour inspirer confiance dès le premier regard.',
    desc_en:
      'Add your city and interests, then verify your identity with a challenge selfie to build instant trust.',
  },
  {
    step_fr: '02. Explorez par affinités et Favoris',
    step_en: '02. Explore by affinity & Favorites',
    desc_fr:
      'Filtrez par pays, ville et centres d’intérêt, sauvegardez vos coups de cœur en Favoris et envoyez un Like ou Super Like ciblé.',
    desc_en:
      'Filter by country, city, and shared interests, bookmark standouts to Favorites, and send a Like or Super Like.',
  },
  {
    step_fr: '03. Matchez, appelez et échangez',
    step_en: '03. Match, call & connect',
    desc_fr:
      'Dès qu’un intérêt est mutuel, discutez en privé avec notes vocales, stickers culturels africains et appels audio ou vidéo chiffrés.',
    desc_en:
      'Once mutual interest sparks a match, chat privately with voice notes, African cultural stickers, and encrypted audio/video calls.',
  },
];

export const DEFAULT_TESTIMONIALS: TestimonialItem[] = [
  {
    name: 'Aminata & Ibrahim',
    location_fr: 'Abidjan, Côte d’Ivoire',
    location_en: 'Abidjan, Ivory Coast',
    photo: '/media/zola_portrait_woman_2_1794726546703.jpg',
    quote_fr:
      'Après plusieurs déceptions sur des applications impersonnelles, nous avons échangé dès le premier soir grâce aux badges vérifiés et aux appels audio intégrés. Six mois plus tard, nous préparons nos fiançailles.',
    quote_en:
      'After several disappointments on impersonal apps, we started talking on the very first evening thanks to verified badges and built-in audio calls. Six months later, we are planning our engagement.',
  },
  {
    name: 'Moussa Diallo',
    location_fr: 'Dakar, Sénégal',
    location_en: 'Dakar, Senegal',
    photo: '/media/zola_portrait_man_2_1794726546962.jpg',
    quote_fr:
      'Le filtre par ville et par centres d’intérêt change tout. J’ai rencontré des personnes sérieuses partageant les mêmes valeurs entrepreneuriales et familiales.',
    quote_en:
      'Filtering by city and shared interests changes everything. I met serious people who share my entrepreneurial and family values.',
  },
  {
    name: 'Clarisse Ouédraogo',
    location_fr: 'Ouagadougou, Burkina Faso',
    location_en: 'Ouagadougou, Burkina Faso',
    photo: '/media/zola_register_woman_1794726545235.jpg',
    quote_fr:
      'Pouvoir mettre un profil en Favori, bloquer immédiatement tout comportement déplacé et discuter avec les stickers culturels rend l’expérience chaleureuse et rassurante.',
    quote_en:
      'Being able to bookmark profiles to Favorites, instantly block inappropriate behavior, and chat using cultural stickers makes the experience warm and reassuring.',
  },
];

export const DEFAULT_FAQ_ITEMS: FaqItem[] = [
  {
    q_fr: 'Comment fonctionne la vérification des profils sur ZOLA ?',
    q_en: 'How does profile verification work on ZOLA?',
    a_fr:
      "Chaque membre peut soumettre un selfie accompagné d'un code défi unique depuis son profil. Notre équipe de modération valide ensuite le badge vérifié pour renforcer l'authenticité de la communauté.",
    a_en:
      'Every member can submit a selfie holding a unique challenge code from their profile page. Our moderation team reviews it and grants the verified badge to strengthen community trust.',
  },
  {
    q_fr: 'ZOLA est-il disponible dans tous les pays africains et la diaspora ?',
    q_en: 'Is ZOLA available across all African countries and the diaspora?',
    a_fr:
      "Oui. ZOLA connecte les célibataires d'Afrique de l'Ouest, Centrale, de l'Est, du Nord et d'Afrique Australe ainsi que de la diaspora, avec des filtres précis par pays, ville et centres d'intérêt.",
    a_en:
      'Yes. ZOLA connects singles across West, Central, East, North, and Southern Africa as well as the diaspora, with precise filters by country, city, and interests.',
  },
  {
    q_fr: 'Comment fonctionne le système de Match, d’appels et de confidentialité ?',
    q_en: 'How do matching, calls, and privacy work?',
    a_fr:
      'Seul un intérêt mutuel ouvre une messagerie privée. Vous pouvez y envoyer messages, notes vocales, stickers culturels, lancer des appels audio/vidéo WebRTC, et bloquer à tout moment un profil indésirable.',
    a_en:
      'Only mutual interest unlocks private messaging. There you can exchange messages, voice notes, cultural stickers, start WebRTC audio/video calls, and block any unwanted profile anytime.',
  },
  {
    q_fr: 'Quels moyens de paiement sont acceptés pour ZOLA Premium ?',
    q_en: 'Which payment methods are accepted for ZOLA Premium?',
    a_fr:
      'Tous les abonnements ZOLA Premium (1 mois, 3 mois ou 6 mois en FCFA) sont traités exclusivement via SasPay, acceptant Orange Money, MTN Mobile Money, Moov Money, Wave ainsi que les cartes Visa et Mastercard avec vérification serveur par webhook signé.',
    a_en:
      'All ZOLA Premium plans (1, 3, or 6 months in FCFA) are processed exclusively via SasPay, supporting Orange Money, MTN Mobile Money, Moov Money, Wave, and Visa/Mastercard with signed server webhook verification.',
  },
];

export const DEFAULT_COUNTRIES: CountryItem[] = [
  { name: 'Burkina Faso', en: 'Burkina Faso', default_city: 'Ouagadougou', code: 'BF' },
  { name: "Côte d'Ivoire", en: 'Ivory Coast', default_city: 'Abidjan', code: 'CI' },
  { name: 'Sénégal', en: 'Senegal', default_city: 'Dakar', code: 'SN' },
  { name: 'Mali', en: 'Mali', default_city: 'Bamako', code: 'ML' },
  { name: 'Bénin', en: 'Benin', default_city: 'Cotonou', code: 'BJ' },
  { name: 'Togo', en: 'Togo', default_city: 'Lomé', code: 'TG' },
  { name: 'Niger', en: 'Niger', default_city: 'Niamey', code: 'NE' },
  { name: 'Guinée', en: 'Guinea', default_city: 'Conakry', code: 'GN' },
  { name: 'Cameroun', en: 'Cameroon', default_city: 'Douala', code: 'CM' },
  { name: 'Gabon', en: 'Gabon', default_city: 'Libreville', code: 'GA' },
  { name: 'Congo', en: 'Republic of the Congo', default_city: 'Brazzaville', code: 'CG' },
  { name: 'RD Congo', en: 'DR Congo', default_city: 'Kinshasa', code: 'CD' },
  { name: 'Rwanda', en: 'Rwanda', default_city: 'Kigali', code: 'RW' },
  { name: 'Maroc', en: 'Morocco', default_city: 'Casablanca', code: 'MA' },
  { name: 'Tunisie', en: 'Tunisia', default_city: 'Tunis', code: 'TN' },
  { name: 'Algérie', en: 'Algeria', default_city: 'Alger', code: 'DZ' },
  { name: 'Ghana', en: 'Ghana', default_city: 'Accra', code: 'GH' },
  { name: 'Nigeria', en: 'Nigeria', default_city: 'Lagos', code: 'NG' },
  { name: 'Kenya', en: 'Kenya', default_city: 'Nairobi', code: 'KE' },
  { name: 'Afrique du Sud', en: 'South Africa', default_city: 'Johannesburg', code: 'ZA' },
];

export const DEFAULT_ZODIAC_ITEMS: BilingualItem[] = [
  { fr: 'Bélier', en: 'Aries' },
  { fr: 'Taureau', en: 'Taurus' },
  { fr: 'Gémeaux', en: 'Gemini' },
  { fr: 'Cancer', en: 'Cancer' },
  { fr: 'Lion', en: 'Leo' },
  { fr: 'Vierge', en: 'Virgo' },
  { fr: 'Balance', en: 'Libra' },
  { fr: 'Scorpion', en: 'Scorpio' },
  { fr: 'Sagittaire', en: 'Sagittarius' },
  { fr: 'Capricorne', en: 'Capricorn' },
  { fr: 'Verseau', en: 'Aquarius' },
  { fr: 'Poissons', en: 'Pisces' },
];

export const DEFAULT_REPORT_REASONS: BilingualItem[] = [
  { fr: 'Profil suspect ou faux', en: 'Suspicious or fake profile' },
  { fr: 'Contenu inapproprié', en: 'Inappropriate content' },
  { fr: 'Harcèlement ou comportement abusif', en: 'Harassment or abusive behavior' },
  { fr: 'Sollicitation financière / arnaque', en: 'Financial solicitation / scam' },
];

export const DEFAULT_CHAT_ICEBREAKERS: BilingualItem[] = [
  {
    fr: 'Salut ! Quel est ton plus beau souvenir de voyage en Afrique ? 🌍',
    en: 'Hey! What is your favorite travel memory in Africa? 🌍',
  },
  {
    fr: 'Bonjour ✨ Si tu devais me faire découvrir un plat de ta ville, ce serait lequel ?',
    en: 'Hi there ✨ If you could introduce me to one dish from your city, what would it be?',
  },
  {
    fr: 'Ravi(e) de matcher avec toi ! Qu’est-ce qui te passionne en ce moment ? 😊',
    en: 'So glad we matched! What are you most passionate about right now? 😊',
  },
];

export const DEFAULT_CUSTOM_STICKERS: CustomStickerConfig[] = AFRICAN_STICKERS.map((s) => ({
  id: s.id,
  label: s.label,
  origin_fr: s.origin,
  origin_en: s.origin,
}));

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  brand_name: 'ZOLA',
  support_email: 'support@zola.africa',
  site_title_fr: "ZOLA — Trouvez l'amour en Afrique",
  site_title_en: 'ZOLA — Find Love in Africa',
  announcement_enabled: '0',
  announcement_text_fr: '',
  announcement_text_en: '',
  hero_title: "Trouvez l'amour en Afrique",
  hero_title_en: 'Find Love in Africa',
  hero_highlight_fr: 'en Afrique',
  hero_highlight_en: 'in Africa',
  hero_subtitle:
    'Rencontrez des célibataires authentiques, près de chez vous ou partout en Afrique.',
  hero_subtitle_en:
    'Meet authentic singles near you or anywhere across Africa and the diaspora.',
  hero_cta_primary: 'Créer un compte',
  hero_cta_primary_en: 'Create an account',
  hero_cta_secondary: 'En savoir plus',
  hero_cta_secondary_en: 'Learn more',
  hero_image_url: '/media/zola_hero_couple_1794726544399.jpg',
  hero_avatar_1_url: '/media/zola_portrait_woman_2_1794726546703.jpg',
  hero_avatar_2_url: '/media/zola_login_man_1794726545582.jpg',
  hero_avatar_3_url: '/media/zola_hero_couple_1794726544399.jpg',
  savanna_bg_url: '/media/zola_savanna_sunset_1794726545758.jpg',
  cta_image_1_url: '/media/zola_portrait_woman_2_1794726546703.jpg',
  cta_image_2_url: '/media/zola_login_man_1794726545582.jpg',
  auth_register_image_url: '/media/zola_register_woman_1794726545235.jpg',
  auth_login_image_url: '/media/zola_login_man_1794726545582.jpg',
  footer_slogan: "Ensemble, trouvons l'amour",
  footer_slogan_en: 'Together, let us find love',
  footer_copyright_fr: '© 2026 ZOLA. Tous droits réservés.',
  footer_copyright_en: '© 2026 ZOLA. All rights reserved.',
  footer_payment_note_fr: 'Paiements sécurisés par SasPay',
  footer_payment_note_en: 'Payments secured by SasPay',
  footer_col_nav_fr: 'Navigation',
  footer_col_nav_en: 'Navigation',
  footer_col_legal_fr: 'Légal & Sécurité',
  footer_col_legal_en: 'Legal & Safety',
  footer_col_access_fr: 'Accès rapide',
  footer_col_access_en: 'Quick access',
  footer_links_json: JSON.stringify(DEFAULT_FOOTER_LINKS),
  why_section_title_fr: 'Pourquoi choisir ZOLA ?',
  why_section_title_en: 'Why choose ZOLA?',
  why_section_subtitle_fr: "Une expérience moderne pensée pour l'Afrique et sa diaspora.",
  why_section_subtitle_en: 'A modern experience crafted for Africa and its global diaspora.',
  premium_title_fr: 'Avantages Premium',
  premium_title_en: 'Premium Perks',
  premium_subtitle_fr: 'Débloquez tout le potentiel de vos rencontres en Afrique',
  premium_subtitle_en: 'Unlock the full potential of your connections across Africa',
  premium_note_fr: 'Paiements sécurisés via SasPay · Mobile Money & Cartes bancaires',
  premium_note_en: 'Secured via SasPay · Mobile Money & Cards',
  premium_benefits_json: JSON.stringify(DEFAULT_PREMIUM_BENEFITS),
  cta_section_title_fr: 'Prêt(e) à écrire votre plus belle',
  cta_section_title_en: 'Ready to write your most beautiful',
  cta_section_highlight_fr: 'histoire africaine ?',
  cta_section_highlight_en: 'African love story?',
  cta_section_subtitle_fr: 'Rejoignez la communauté vérifiée dès aujourd’hui et rencontrez des célibataires sérieux près de chez vous.',
  cta_section_subtitle_en: 'Join our verified community today and meet genuine singles near you.',
  cta_section_btn_fr: 'Créer mon profil gratuitement',
  cta_section_btn_en: 'Create my profile for free',
  legal_title_fr: "Conditions d'utilisation & Confidentialité",
  legal_title_en: 'Terms of Use & Privacy Policy',
  legal_p1_fr:
    'ZOLA protège la confidentialité de ses membres. Les données de profil, photos et messages privés sont utilisés exclusivement pour le fonctionnement de la plateforme et ne sont jamais revendus à des tiers. Chaque utilisateur peut exporter ou supprimer son compte à tout moment depuis les Paramètres.',
  legal_p1_en:
    'ZOLA protects the privacy of its members. Profile details, photos, and private messages are used exclusively to operate the platform and are never sold to third parties. Every user can delete their account anytime from Settings.',
  legal_p2_fr:
    'Règles de sécurité : la courtoisie, l’authenticité et le respect mutuel sont obligatoires. Tout comportement abusif, usurpation d’identité ou sollicitation financière entraîne une suspension immédiate.',
  legal_p2_en:
    'Safety rules: courtesy, authenticity, and mutual respect are mandatory. Any abusive behavior, impersonation, or financial solicitation results in immediate suspension.',
  about_text_fr:
    'ZOLA — Plateforme de rencontre africaine moderne. Rencontres authentiques, sécurité renforcée et messagerie en temps réel.',
  about_text_en:
    'ZOLA — Modern African dating platform. Authentic connections, strong safety, and real-time messaging.',
  oauth_google_enabled: '0',
  oauth_facebook_enabled: '0',
  oauth_apple_enabled: '0',
  payment_provider_label: 'Paiement sécurisé par SasPay (Mobile Money & Carte)',
  why_cards_json: JSON.stringify(DEFAULT_WHY_CARDS),
  bento_cards_json: JSON.stringify(DEFAULT_BENTO_CARDS),
  how_it_works_json: JSON.stringify(DEFAULT_HOW_IT_WORKS),
  testimonials_json: JSON.stringify(DEFAULT_TESTIMONIALS),
  faq_items_json: JSON.stringify(DEFAULT_FAQ_ITEMS),
  countries_json: JSON.stringify(DEFAULT_COUNTRIES),
  zodiac_signs_json: JSON.stringify(DEFAULT_ZODIAC_ITEMS),
  report_reasons_json: JSON.stringify(DEFAULT_REPORT_REASONS),
  chat_icebreakers_json: JSON.stringify(DEFAULT_CHAT_ICEBREAKERS),
  cultural_stickers_json: JSON.stringify(DEFAULT_CUSTOM_STICKERS),
  i18n_overrides_fr: '{}',
  i18n_overrides_en: '{}',
};

export function parseCmsJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw || typeof raw !== 'string') return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(fallback)) {
      return Array.isArray(parsed) ? (parsed as T) : fallback;
    }
    if (typeof fallback === 'object' && fallback !== null) {
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        ? (parsed as T)
        : fallback;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function resolveStickersFromSettings(
  settings?: SiteSettings
): Array<CulturalSticker & { origin_en?: string; image_url?: string }> {
  const configured = parseCmsJson<CustomStickerConfig[]>(
    settings?.cultural_stickers_json,
    DEFAULT_CUSTOM_STICKERS
  );
  const builtinMap = new Map(AFRICAN_STICKERS.map((s) => [s.id, s]));
  const result: Array<CulturalSticker & { origin_en?: string; image_url?: string }> = [];
  for (const cfg of configured) {
    const builtin = builtinMap.get(cfg.id);
    if (cfg.image_url) {
      result.push({
        id: cfg.id,
        label: cfg.label,
        origin: cfg.origin_fr,
        origin_en: cfg.origin_en || cfg.origin_fr,
        svg: builtin?.svg || '',
        image_url: cfg.image_url,
      });
    } else if (builtin) {
      result.push({
        ...builtin,
        label: cfg.label || builtin.label,
        origin: cfg.origin_fr || builtin.origin,
        origin_en: cfg.origin_en || cfg.origin_fr || builtin.origin,
      });
    }
  }
  return result;
}
