import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Crown,
  FileText,
  Globe,
  Image as ImageIcon,
  Layers,
  Link2,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import {
  DEFAULT_BENTO_CARDS,
  DEFAULT_CHAT_ICEBREAKERS,
  DEFAULT_COUNTRIES,
  DEFAULT_CUSTOM_STICKERS,
  DEFAULT_FAQ_ITEMS,
  DEFAULT_FOOTER_LINKS,
  DEFAULT_HOW_IT_WORKS,
  DEFAULT_PREMIUM_BENEFITS,
  DEFAULT_REPORT_REASONS,
  DEFAULT_TESTIMONIALS,
  DEFAULT_WHY_CARDS,
  DEFAULT_ZODIAC_ITEMS,
  parseCmsJson,
  type BentoCardItem,
  type BilingualItem,
  type CmsIconName,
  type CountryItem,
  type CustomStickerConfig,
  type FaqItem,
  type FooterLinkItem,
  type StepItem,
  type TestimonialItem,
  type WhyCardItem,
} from '../lib/cms';
import { translations, type TranslationKey, useI18n } from '../lib/i18n';
import type { Interest, SiteSettings } from '../types';

interface AdminCmsPanelProps {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings | null>>;
  interests: Interest[];
  onReloadAdmin: () => void;
  onSettingsUpdated: () => void;
  setFeedback: (msg: string) => void;
}

type CmsSection = 'landing' | 'footer' | 'branding' | 'appData' | 'legal' | 'texts';

const ICON_OPTIONS: Array<{ value: CmsIconName; label: string }> = [
  { value: 'heart', label: 'Cœur' },
  { value: 'shield', label: 'Bouclier' },
  { value: 'zap', label: 'Éclair' },
  { value: 'crown', label: 'Couronne' },
  { value: 'bookmark', label: 'Favori' },
  { value: 'phone', label: 'Appel' },
  { value: 'sparkles', label: 'Étoiles' },
  { value: 'message', label: 'Message' },
  { value: 'lock', label: 'Cadenas' },
];

const TEXT_CATEGORIES: Array<{ prefix: string; label: string }> = [
  { prefix: '', label: 'Toutes les sections' },
  { prefix: 'landing.', label: "Page d'accueil" },
  { prefix: 'nav.', label: 'Navigation & Menus' },
  { prefix: 'auth.', label: 'Authentification' },
  { prefix: 'discover.', label: 'Découverte & Filtres' },
  { prefix: 'favorites.', label: 'Favoris' },
  { prefix: 'member.', label: 'Profil membre' },
  { prefix: 'msg.', label: 'Messagerie & Appels' },
  { prefix: 'premium.', label: 'Premium & Paiement' },
  { prefix: 'edit.', label: 'Édition du profil' },
  { prefix: 'settings.', label: 'Paramètres' },
  { prefix: 'notif.', label: 'Notifications' },
  { prefix: 'admin.', label: 'Administration' },
  { prefix: 'legal.', label: 'Mentions légales' },
  { prefix: 'pwa.', label: 'PWA & Hors-ligne' },
  { prefix: 'common.', label: 'Communs & Match' },
];

export const AdminCmsPanel: React.FC<AdminCmsPanelProps> = ({
  settings,
  setSettings,
  interests,
  onReloadAdmin,
  onSettingsUpdated,
  setFeedback,
}) => {
  const { t } = useI18n();
  const [section, setSection] = useState<CmsSection>('landing');
  const [saving, setSaving] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [syncState, setSyncState] = useState<'idle' | 'pending' | 'saving' | 'saved'>('saved');
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  // Interests CRUD local form
  const [newInterestName, setNewInterestName] = useState('');
  const [newInterestCategory, setNewInterestCategory] = useState('Culture');
  const [editingInterestId, setEditingInterestId] = useState<number | null>(null);
  const [editingInterestName, setEditingInterestName] = useState('');
  const [editingInterestCat, setEditingInterestCat] = useState('');

  // Universal text search & category filter
  const [textSearch, setTextSearch] = useState('');
  const [textCategory, setTextCategory] = useState('');
  const [onlyModified, setOnlyModified] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadCallbackRef = useRef<((url: string) => void) | null>(null);
  const latestSettingsRef = useRef<SiteSettings>(settings);
  latestSettingsRef.current = settings;
  const syncTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    };
  }, []);

  const persistSettings = async (payload: SiteSettings, showBanner: boolean) => {
    setSaving(true);
    setSyncState('saving');
    try {
      await apiFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings: payload }),
      });
      setSyncState('saved');
      if (showBanner) {
        setFeedback('Tout le contenu du site a été enregistré et publié en direct !');
      }
      onSettingsUpdated();
    } catch (err) {
      setSyncState('idle');
      setFeedback(err instanceof Error ? err.message : "Erreur lors de l'enregistrement des paramètres.");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: string, value: string) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      latestSettingsRef.current = next;
      if (autoSync) {
        setSyncState('pending');
        if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
        syncTimerRef.current = window.setTimeout(() => {
          persistSettings(latestSettingsRef.current, false);
        }, 700);
      } else {
        setSyncState('idle');
      }
      return next;
    });
  };

  const triggerUpload = (uploadId: string, onUrl: (url: string) => void) => {
    setUploadingKey(uploadId);
    pendingUploadCallbackRef.current = onUrl;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) {
      setUploadingKey(null);
      return;
    }
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await apiFetch<{ url: string }>('/api/admin/media', {
        method: 'POST',
        body: fd,
      });
      pendingUploadCallbackRef.current?.(res.url);
      setFeedback('Image importée et synchronisée.');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Échec de l'import d'image.");
    } finally {
      setUploadingKey(null);
      pendingUploadCallbackRef.current = null;
    }
  };

  const saveAllSettings = async () => {
    if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    await persistSettings(settings, true);
  };

  // Parsed JSON lists
  const whyCards = parseCmsJson<WhyCardItem[]>(settings.why_cards_json, DEFAULT_WHY_CARDS);
  const bentoCards = parseCmsJson<BentoCardItem[]>(settings.bento_cards_json, DEFAULT_BENTO_CARDS);
  const howItWorks = parseCmsJson<StepItem[]>(settings.how_it_works_json, DEFAULT_HOW_IT_WORKS);
  const testimonials = parseCmsJson<TestimonialItem[]>(settings.testimonials_json, DEFAULT_TESTIMONIALS);
  const faqItems = parseCmsJson<FaqItem[]>(settings.faq_items_json, DEFAULT_FAQ_ITEMS);
  const footerLinks = parseCmsJson<FooterLinkItem[]>(settings.footer_links_json, DEFAULT_FOOTER_LINKS);
  const premiumBenefits = parseCmsJson<BilingualItem[]>(
    settings.premium_benefits_json,
    DEFAULT_PREMIUM_BENEFITS
  );
  const countries = parseCmsJson<CountryItem[]>(settings.countries_json, DEFAULT_COUNTRIES);
  const zodiacSigns = parseCmsJson<BilingualItem[]>(settings.zodiac_signs_json, DEFAULT_ZODIAC_ITEMS);
  const reportReasons = parseCmsJson<BilingualItem[]>(settings.report_reasons_json, DEFAULT_REPORT_REASONS);
  const icebreakers = parseCmsJson<BilingualItem[]>(settings.chat_icebreakers_json, DEFAULT_CHAT_ICEBREAKERS);
  const stickers = parseCmsJson<CustomStickerConfig[]>(settings.cultural_stickers_json, DEFAULT_CUSTOM_STICKERS);

  const overridesFr = parseCmsJson<Record<string, string>>(settings.i18n_overrides_fr, {});
  const overridesEn = parseCmsJson<Record<string, string>>(settings.i18n_overrides_en, {});

  const allTextKeys = useMemo(() => Object.keys(translations.fr) as TranslationKey[], []);

  const filteredTextKeys = useMemo(() => {
    const q = textSearch.trim().toLowerCase();
    return allTextKeys.filter((k) => {
      if (textCategory && !k.startsWith(textCategory)) return false;
      const hasOverride = Boolean(overridesFr[k] || overridesEn[k]);
      if (onlyModified && !hasOverride) return false;
      if (!q) return true;
      const frVal = (overridesFr[k] ?? translations.fr[k]).toLowerCase();
      const enVal = (overridesEn[k] ?? translations.en[k]).toLowerCase();
      return k.toLowerCase().includes(q) || frVal.includes(q) || enVal.includes(q);
    });
  }, [allTextKeys, textSearch, textCategory, onlyModified, overridesFr, overridesEn]);

  const setTextOverride = (langKey: 'fr' | 'en', key: string, value: string) => {
    const settingKey = langKey === 'en' ? 'i18n_overrides_en' : 'i18n_overrides_fr';
    const current = langKey === 'en' ? { ...overridesEn } : { ...overridesFr };
    if (!value || value === translations[langKey][key as TranslationKey]) {
      delete current[key];
    } else {
      current[key] = value;
    }
    updateField(settingKey, JSON.stringify(current));
  };

  // Interests CRUD handlers
  const handleAddInterest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInterestName.trim()) return;
    try {
      await apiFetch('/api/admin/interests', {
        method: 'POST',
        body: JSON.stringify({ name: newInterestName.trim(), category: newInterestCategory.trim() || 'Culture' }),
      });
      setNewInterestName('');
      setFeedback("Centre d'intérêt ajouté.");
      onReloadAdmin();
      onSettingsUpdated();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Impossible d'ajouter ce centre d'intérêt.");
    }
  };

  const handleSaveInterest = async (id: number) => {
    try {
      await apiFetch(`/api/admin/interests/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editingInterestName.trim(), category: editingInterestCat.trim() || 'Culture' }),
      });
      setEditingInterestId(null);
      setFeedback("Centre d'intérêt mis à jour.");
      onReloadAdmin();
      onSettingsUpdated();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Impossible de modifier ce centre d'intérêt.");
    }
  };

  const handleDeleteInterest = async (id: number) => {
    try {
      await apiFetch(`/api/admin/interests/${id}`, { method: 'DELETE' });
      setFeedback("Centre d'intérêt supprimé.");
      onReloadAdmin();
      onSettingsUpdated();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Impossible de supprimer ce centre d'intérêt.");
    }
  };

  const imageFields: Array<{ key: string; label: string }> = [
    { key: 'hero_image_url', label: 'Image principale du Hero' },
    { key: 'savanna_bg_url', label: 'Image de fond Tarifs & Footer' },
    { key: 'cta_image_1_url', label: 'Photo CTA finale (gauche)' },
    { key: 'cta_image_2_url', label: 'Photo CTA finale (droite)' },
    { key: 'auth_register_image_url', label: 'Photo latérale Inscription' },
    { key: 'auth_login_image_url', label: 'Photo latérale Connexion' },
    { key: 'hero_avatar_1_url', label: 'Avatar Hero #1' },
    { key: 'hero_avatar_2_url', label: 'Avatar Hero #2' },
    { key: 'hero_avatar_3_url', label: 'Avatar Hero #3' },
  ];

  return (
    <div className="space-y-5">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Sticky CMS Action Bar */}
      <div className="zola-card rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-white">Gestion du Contenu (CMS Temps Réel)</h2>
            <p className="text-xs text-stone-400">
              Modifiez en direct la page d'accueil, les liens du footer, Pourquoi choisir ZOLA et les Avantages Premium.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-xs text-stone-200 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="accent-orange-500"
              />
              Temps réel
            </label>
            <span className="inline-flex items-center gap-1.5 text-xs">
              <CheckCircle2
                className={`h-3.5 w-3.5 ${
                  syncState === 'saved'
                    ? 'text-emerald-400'
                    : syncState === 'saving' || syncState === 'pending'
                      ? 'text-amber-400 animate-pulse'
                      : 'text-stone-400'
                }`}
              />
              <span className="text-stone-300">
                {syncState === 'saving'
                  ? 'Enregistrement...'
                  : syncState === 'pending'
                    ? 'Modification...'
                    : syncState === 'saved'
                      ? 'Synchronisé en BDD'
                      : 'Non enregistré'}
              </span>
            </span>
            <button
              type="button"
              disabled={saving}
              onClick={saveAllSettings}
              className="zola-gradient zola-gradient-hover inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-orange-600/25 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Enregistrement...' : t('admin.settings.save')}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 border-t border-white/8 pt-3">
          {[
            { id: 'landing', label: "Page d'accueil & Sections", icon: <Layers className="h-3.5 w-3.5" /> },
            { id: 'footer', label: 'Footer & Liens', icon: <Link2 className="h-3.5 w-3.5" /> },
            { id: 'branding', label: 'Identité & Médias', icon: <ImageIcon className="h-3.5 w-3.5" /> },
            { id: 'appData', label: 'Listes, Intérêts & Stickers', icon: <Sparkles className="h-3.5 w-3.5" /> },
            { id: 'legal', label: 'Légal, À propos & OAuth', icon: <FileText className="h-3.5 w-3.5" /> },
            { id: 'texts', label: 'Tous les Textes (FR/EN)', icon: <Globe className="h-3.5 w-3.5" /> },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id as CmsSection)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                section === s.id
                  ? 'zola-gradient text-white shadow'
                  : 'border border-white/10 bg-white/5 text-stone-300 hover:text-white'
              }`}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: BRANDING & MEDIA */}
      {section === 'branding' && (
        <div className="space-y-6">
          <div className="zola-card rounded-2xl p-5 space-y-4">
            <h2 className="font-display text-lg font-bold text-white">Identité globale & Bannière</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-stone-400 mb-1">Nom du site / Marque</label>
                <input
                  type="text"
                  value={settings.brand_name || ''}
                  onChange={(e) => updateField('brand_name', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3.5 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Email de support</label>
                <input
                  type="email"
                  value={settings.support_email || ''}
                  onChange={(e) => updateField('support_email', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3.5 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Titre du navigateur (FR)</label>
                <input
                  type="text"
                  value={settings.site_title_fr || ''}
                  onChange={(e) => updateField('site_title_fr', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3.5 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Titre du navigateur (EN)</label>
                <input
                  type="text"
                  value={settings.site_title_en || ''}
                  onChange={(e) => updateField('site_title_en', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3.5 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-white">
                <input
                  type="checkbox"
                  checked={settings.announcement_enabled === '1'}
                  onChange={(e) => updateField('announcement_enabled', e.target.checked ? '1' : '0')}
                  className="accent-orange-500"
                />
                Afficher une bannière d'annonce en haut de la page d'accueil
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Texte de l'annonce (FR)"
                  value={settings.announcement_text_fr || ''}
                  onChange={(e) => updateField('announcement_text_fr', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-black/30 px-3 py-2 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Announcement banner text (EN)"
                  value={settings.announcement_text_en || ''}
                  onChange={(e) => updateField('announcement_text_en', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-black/30 px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          </div>

          <div className="zola-card rounded-2xl p-5 space-y-4">
            <h2 className="font-display text-lg font-bold text-white">Images & Visuels du site</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {imageFields.map((item) => (
                <div key={item.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2.5">
                  <p className="text-xs font-semibold text-white">{item.label}</p>
                  <div className="h-28 w-full overflow-hidden rounded-lg bg-black/40 border border-white/10">
                    {settings[item.key] && (
                      <img src={settings[item.key]} alt={item.label} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <input
                    type="text"
                    value={settings[item.key] || ''}
                    onChange={(e) => updateField(item.key, e.target.value)}
                    placeholder="URL de l'image"
                    className="w-full rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-stone-200"
                  />
                  <button
                    type="button"
                    disabled={uploadingKey === item.key}
                    onClick={() => triggerUpload(item.key, (url) => updateField(item.key, url))}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-orange-500/35 bg-orange-500/10 py-1.5 text-xs font-medium text-orange-300 hover:bg-orange-500/20"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {uploadingKey === item.key ? 'Import...' : 'Importer une photo'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: LANDING PAGE FULL EDITOR */}
      {section === 'landing' && (
        <div className="space-y-6">
          {/* Hero */}
          <div className="zola-card rounded-2xl p-5 space-y-4">
            <h2 className="font-display text-lg font-bold text-white">Section Hero</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-stone-400 mb-1">Titre Hero (FR)</label>
                <input
                  type="text"
                  value={settings.hero_title || ''}
                  onChange={(e) => updateField('hero_title', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Titre Hero (EN)</label>
                <input
                  type="text"
                  value={settings.hero_title_en || ''}
                  onChange={(e) => updateField('hero_title_en', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Mot en dégradé (FR)</label>
                <input
                  type="text"
                  value={settings.hero_highlight_fr || ''}
                  onChange={(e) => updateField('hero_highlight_fr', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Mot en dégradé (EN)</label>
                <input
                  type="text"
                  value={settings.hero_highlight_en || ''}
                  onChange={(e) => updateField('hero_highlight_en', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Sous-titre Hero (FR)</label>
                <textarea
                  rows={2}
                  value={settings.hero_subtitle || ''}
                  onChange={(e) => updateField('hero_subtitle', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Sous-titre Hero (EN)</label>
                <textarea
                  rows={2}
                  value={settings.hero_subtitle_en || ''}
                  onChange={(e) => updateField('hero_subtitle_en', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Bouton principal (FR / EN)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={settings.hero_cta_primary || ''}
                    onChange={(e) => updateField('hero_cta_primary', e.target.value)}
                    placeholder="FR"
                    className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={settings.hero_cta_primary_en || ''}
                    onChange={(e) => updateField('hero_cta_primary_en', e.target.value)}
                    placeholder="EN"
                    className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Bouton secondaire (FR / EN)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={settings.hero_cta_secondary || ''}
                    onChange={(e) => updateField('hero_cta_secondary', e.target.value)}
                    placeholder="FR"
                    className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={settings.hero_cta_secondary_en || ''}
                    onChange={(e) => updateField('hero_cta_secondary_en', e.target.value)}
                    placeholder="EN"
                    className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Why Cards */}
          <div className="zola-card rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-white">Section « Pourquoi choisir ZOLA » ({whyCards.length})</h2>
              <button
                type="button"
                onClick={() =>
                  updateField(
                    'why_cards_json',
                    JSON.stringify([
                      ...whyCards,
                      { icon: 'heart', title_fr: 'Nouvel avantage', title_en: 'New perk', desc_fr: '', desc_en: '' },
                    ])
                  )
                }
                className="inline-flex items-center gap-1 rounded-full border border-orange-500/35 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-300"
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter une carte
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
              <div>
                <label className="block text-[11px] text-stone-400 mb-1">Titre de la section (FR)</label>
                <input
                  type="text"
                  value={settings.why_section_title_fr || ''}
                  onChange={(e) => updateField('why_section_title_fr', e.target.value)}
                  className="w-full rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-400 mb-1">Section Title (EN)</label>
                <input
                  type="text"
                  value={settings.why_section_title_en || ''}
                  onChange={(e) => updateField('why_section_title_en', e.target.value)}
                  className="w-full rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-400 mb-1">Sous-titre de la section (FR)</label>
                <input
                  type="text"
                  value={settings.why_section_subtitle_fr || ''}
                  onChange={(e) => updateField('why_section_subtitle_fr', e.target.value)}
                  className="w-full rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-stone-200"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-400 mb-1">Section Subtitle (EN)</label>
                <input
                  type="text"
                  value={settings.why_section_subtitle_en || ''}
                  onChange={(e) => updateField('why_section_subtitle_en', e.target.value)}
                  className="w-full rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-stone-200"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {whyCards.map((card, idx) => (
                <div key={idx} className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <select
                      value={card.icon}
                      onChange={(e) => {
                        const next = [...whyCards];
                        next[idx] = { ...card, icon: e.target.value as CmsIconName };
                        updateField('why_cards_json', JSON.stringify(next));
                      }}
                      className="rounded-lg border border-white/12 bg-[#1B1413] px-2.5 py-1 text-xs text-white"
                    >
                      {ICON_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        updateField('why_cards_json', JSON.stringify(whyCards.filter((_, i) => i !== idx)))
                      }
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={card.title_fr}
                      placeholder="Titre FR"
                      onChange={(e) => {
                        const next = [...whyCards];
                        next[idx] = { ...card, title_fr: e.target.value };
                        updateField('why_cards_json', JSON.stringify(next));
                      }}
                      className="rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={card.title_en}
                      placeholder="Title EN"
                      onChange={(e) => {
                        const next = [...whyCards];
                        next[idx] = { ...card, title_en: e.target.value };
                        updateField('why_cards_json', JSON.stringify(next));
                      }}
                      className="rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={card.desc_fr}
                    placeholder="Description FR"
                    onChange={(e) => {
                      const next = [...whyCards];
                      next[idx] = { ...card, desc_fr: e.target.value };
                      updateField('why_cards_json', JSON.stringify(next));
                    }}
                    className="w-full rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-stone-200"
                  />
                  <textarea
                    rows={2}
                    value={card.desc_en}
                    placeholder="Description EN"
                    onChange={(e) => {
                      const next = [...whyCards];
                      next[idx] = { ...card, desc_en: e.target.value };
                      updateField('why_cards_json', JSON.stringify(next));
                    }}
                    className="w-full rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-stone-200"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Bento Cards */}
          <div className="zola-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white">Cartes Fonctionnalités Bento ({bentoCards.length})</h2>
              <button
                type="button"
                onClick={() =>
                  updateField(
                    'bento_cards_json',
                    JSON.stringify([
                      ...bentoCards,
                      {
                        icon: 'sparkles',
                        span2: false,
                        tag_fr: 'Nouveau module',
                        tag_en: 'New module',
                        title_fr: 'Fonctionnalité',
                        title_en: 'Feature',
                        desc_fr: '',
                        desc_en: '',
                        bullets_fr: [],
                        bullets_en: [],
                      },
                    ])
                  )
                }
                className="inline-flex items-center gap-1 rounded-full border border-orange-500/35 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-300"
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter
              </button>
            </div>
            <div className="space-y-3">
              {bentoCards.map((card, idx) => (
                <div key={idx} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <select
                        value={card.icon}
                        onChange={(e) => {
                          const next = [...bentoCards];
                          next[idx] = { ...card, icon: e.target.value as CmsIconName };
                          updateField('bento_cards_json', JSON.stringify(next));
                        }}
                        className="rounded-lg border border-white/12 bg-[#1B1413] px-2.5 py-1 text-xs text-white"
                      >
                        {ICON_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-1.5 text-xs text-stone-300">
                        <input
                          type="checkbox"
                          checked={card.span2}
                          onChange={(e) => {
                            const next = [...bentoCards];
                            next[idx] = { ...card, span2: e.target.checked };
                            updateField('bento_cards_json', JSON.stringify(next));
                          }}
                          className="accent-orange-500"
                        />
                        Large (2 colonnes)
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateField('bento_cards_json', JSON.stringify(bentoCards.filter((_, i) => i !== idx)))
                      }
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      value={card.tag_fr}
                      placeholder="Badge FR"
                      onChange={(e) => {
                        const next = [...bentoCards];
                        next[idx] = { ...card, tag_fr: e.target.value };
                        updateField('bento_cards_json', JSON.stringify(next));
                      }}
                      className="rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={card.tag_en}
                      placeholder="Badge EN"
                      onChange={(e) => {
                        const next = [...bentoCards];
                        next[idx] = { ...card, tag_en: e.target.value };
                        updateField('bento_cards_json', JSON.stringify(next));
                      }}
                      className="rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={card.title_fr}
                      placeholder="Titre FR"
                      onChange={(e) => {
                        const next = [...bentoCards];
                        next[idx] = { ...card, title_fr: e.target.value };
                        updateField('bento_cards_json', JSON.stringify(next));
                      }}
                      className="rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={card.title_en}
                      placeholder="Title EN"
                      onChange={(e) => {
                        const next = [...bentoCards];
                        next[idx] = { ...card, title_en: e.target.value };
                        updateField('bento_cards_json', JSON.stringify(next));
                      }}
                      className="rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-white"
                    />
                    <textarea
                      rows={2}
                      value={card.desc_fr}
                      placeholder="Description FR"
                      onChange={(e) => {
                        const next = [...bentoCards];
                        next[idx] = { ...card, desc_fr: e.target.value };
                        updateField('bento_cards_json', JSON.stringify(next));
                      }}
                      className="rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-stone-200"
                    />
                    <textarea
                      rows={2}
                      value={card.desc_en}
                      placeholder="Description EN"
                      onChange={(e) => {
                        const next = [...bentoCards];
                        next[idx] = { ...card, desc_en: e.target.value };
                        updateField('bento_cards_json', JSON.stringify(next));
                      }}
                      className="rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-stone-200"
                    />
                    <input
                      type="text"
                      value={(card.bullets_fr || []).join(' | ')}
                      placeholder="Points clés FR séparés par |"
                      onChange={(e) => {
                        const next = [...bentoCards];
                        next[idx] = {
                          ...card,
                          bullets_fr: e.target.value.split('|').map((s) => s.trim()).filter(Boolean),
                        };
                        updateField('bento_cards_json', JSON.stringify(next));
                      }}
                      className="rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-stone-300"
                    />
                    <input
                      type="text"
                      value={(card.bullets_en || []).join(' | ')}
                      placeholder="Bullets EN separated by |"
                      onChange={(e) => {
                        const next = [...bentoCards];
                        next[idx] = {
                          ...card,
                          bullets_en: e.target.value.split('|').map((s) => s.trim()).filter(Boolean),
                        };
                        updateField('bento_cards_json', JSON.stringify(next));
                      }}
                      className="rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-stone-300"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div className="zola-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white">Étapes « Comment ça marche » ({howItWorks.length})</h2>
              <button
                type="button"
                onClick={() =>
                  updateField(
                    'how_it_works_json',
                    JSON.stringify([...howItWorks, { step_fr: '04. Nouvelle étape', step_en: '04. New step', desc_fr: '', desc_en: '' }])
                  )
                }
                className="inline-flex items-center gap-1 rounded-full border border-orange-500/35 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-300"
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {howItWorks.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        updateField('how_it_works_json', JSON.stringify(howItWorks.filter((_, i) => i !== idx)))
                      }
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={item.step_fr}
                    placeholder="Titre étape FR"
                    onChange={(e) => {
                      const next = [...howItWorks];
                      next[idx] = { ...item, step_fr: e.target.value };
                      updateField('how_it_works_json', JSON.stringify(next));
                    }}
                    className="w-full rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={item.step_en}
                    placeholder="Step title EN"
                    onChange={(e) => {
                      const next = [...howItWorks];
                      next[idx] = { ...item, step_en: e.target.value };
                      updateField('how_it_works_json', JSON.stringify(next));
                    }}
                    className="w-full rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-white"
                  />
                  <textarea
                    rows={2}
                    value={item.desc_fr}
                    placeholder="Description FR"
                    onChange={(e) => {
                      const next = [...howItWorks];
                      next[idx] = { ...item, desc_fr: e.target.value };
                      updateField('how_it_works_json', JSON.stringify(next));
                    }}
                    className="w-full rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-stone-200"
                  />
                  <textarea
                    rows={2}
                    value={item.desc_en}
                    placeholder="Description EN"
                    onChange={(e) => {
                      const next = [...howItWorks];
                      next[idx] = { ...item, desc_en: e.target.value };
                      updateField('how_it_works_json', JSON.stringify(next));
                    }}
                    className="w-full rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-stone-200"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Testimonials */}
          <div className="zola-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white">Témoignages ({testimonials.length})</h2>
              <button
                type="button"
                onClick={() =>
                  updateField(
                    'testimonials_json',
                    JSON.stringify([
                      ...testimonials,
                      {
                        name: 'Nouveau membre',
                        location_fr: 'Abidjan, Côte d’Ivoire',
                        location_en: 'Abidjan, Ivory Coast',
                        photo: '/media/zola_portrait_woman_2_1794726546703.jpg',
                        quote_fr: '',
                        quote_en: '',
                      },
                    ])
                  )
                }
                className="inline-flex items-center gap-1 rounded-full border border-orange-500/35 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-300"
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter un témoignage
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {testimonials.map((tm, idx) => (
                <div key={idx} className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <img src={tm.photo} alt={tm.name} className="h-10 w-10 rounded-full object-cover border border-white/15" />
                      <button
                        type="button"
                        onClick={() =>
                          triggerUpload(`testimonial-${idx}`, (url) => {
                            const next = [...testimonials];
                            next[idx] = { ...tm, photo: url };
                            updateField('testimonials_json', JSON.stringify(next));
                          })
                        }
                        className="rounded-lg border border-white/12 bg-white/5 px-2.5 py-1 text-[11px] text-amber-300 hover:bg-white/10"
                      >
                        Changer photo
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateField('testimonials_json', JSON.stringify(testimonials.filter((_, i) => i !== idx)))
                      }
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={tm.name}
                    placeholder="Nom"
                    onChange={(e) => {
                      const next = [...testimonials];
                      next[idx] = { ...tm, name: e.target.value };
                      updateField('testimonials_json', JSON.stringify(next));
                    }}
                    className="w-full rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-white"
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={tm.location_fr}
                      placeholder="Lieu FR"
                      onChange={(e) => {
                        const next = [...testimonials];
                        next[idx] = { ...tm, location_fr: e.target.value };
                        updateField('testimonials_json', JSON.stringify(next));
                      }}
                      className="rounded-lg border border-white/12 bg-black/30 px-2 py-1 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={tm.location_en}
                      placeholder="Location EN"
                      onChange={(e) => {
                        const next = [...testimonials];
                        next[idx] = { ...tm, location_en: e.target.value };
                        updateField('testimonials_json', JSON.stringify(next));
                      }}
                      className="rounded-lg border border-white/12 bg-black/30 px-2 py-1 text-xs text-white"
                    />
                  </div>
                  <textarea
                    rows={3}
                    value={tm.quote_fr}
                    placeholder="Citation FR"
                    onChange={(e) => {
                      const next = [...testimonials];
                      next[idx] = { ...tm, quote_fr: e.target.value };
                      updateField('testimonials_json', JSON.stringify(next));
                    }}
                    className="w-full rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-stone-200"
                  />
                  <textarea
                    rows={3}
                    value={tm.quote_en}
                    placeholder="Quote EN"
                    onChange={(e) => {
                      const next = [...testimonials];
                      next[idx] = { ...tm, quote_en: e.target.value };
                      updateField('testimonials_json', JSON.stringify(next));
                    }}
                    className="w-full rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-stone-200"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="zola-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white">Questions fréquentes (FAQ) ({faqItems.length})</h2>
              <button
                type="button"
                onClick={() =>
                  updateField(
                    'faq_items_json',
                    JSON.stringify([...faqItems, { q_fr: 'Nouvelle question ?', q_en: 'New question?', a_fr: '', a_en: '' }])
                  )
                }
                className="inline-flex items-center gap-1 rounded-full border border-orange-500/35 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-300"
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter une question
              </button>
            </div>
            <div className="space-y-3">
              {faqItems.map((fq, idx) => (
                <div key={idx} className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        updateField('faq_items_json', JSON.stringify(faqItems.filter((_, i) => i !== idx)))
                      }
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      value={fq.q_fr}
                      placeholder="Question FR"
                      onChange={(e) => {
                        const next = [...faqItems];
                        next[idx] = { ...fq, q_fr: e.target.value };
                        updateField('faq_items_json', JSON.stringify(next));
                      }}
                      className="rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-white font-semibold"
                    />
                    <input
                      type="text"
                      value={fq.q_en}
                      placeholder="Question EN"
                      onChange={(e) => {
                        const next = [...faqItems];
                        next[idx] = { ...fq, q_en: e.target.value };
                        updateField('faq_items_json', JSON.stringify(next));
                      }}
                      className="rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-white font-semibold"
                    />
                    <textarea
                      rows={2}
                      value={fq.a_fr}
                      placeholder="Réponse FR"
                      onChange={(e) => {
                        const next = [...faqItems];
                        next[idx] = { ...fq, a_fr: e.target.value };
                        updateField('faq_items_json', JSON.stringify(next));
                      }}
                      className="rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-stone-200"
                    />
                    <textarea
                      rows={2}
                      value={fq.a_en}
                      placeholder="Answer EN"
                      onChange={(e) => {
                        const next = [...faqItems];
                        next[idx] = { ...fq, a_en: e.target.value };
                        updateField('faq_items_json', JSON.stringify(next));
                      }}
                      className="rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-stone-200"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Avantages Premium Section */}
          <div className="zola-card rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-400" />
                <h2 className="font-display text-lg font-bold text-white">
                  Section « Avantages Premium » ({premiumBenefits.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={() =>
                  updateField(
                    'premium_benefits_json',
                    JSON.stringify([...premiumBenefits, { fr: 'Nouvel avantage Premium', en: 'New Premium perk' }])
                  )
                }
                className="inline-flex items-center gap-1 rounded-full border border-amber-400/35 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300"
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter un avantage
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] text-stone-400 mb-1">Titre Premium (FR)</label>
                <input
                  type="text"
                  value={settings.premium_title_fr || ''}
                  onChange={(e) => updateField('premium_title_fr', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-400 mb-1">Premium Title (EN)</label>
                <input
                  type="text"
                  value={settings.premium_title_en || ''}
                  onChange={(e) => updateField('premium_title_en', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-400 mb-1">Sous-titre Premium (FR)</label>
                <input
                  type="text"
                  value={settings.premium_subtitle_fr || ''}
                  onChange={(e) => updateField('premium_subtitle_fr', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-stone-200"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-400 mb-1">Premium Subtitle (EN)</label>
                <input
                  type="text"
                  value={settings.premium_subtitle_en || ''}
                  onChange={(e) => updateField('premium_subtitle_en', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-stone-200"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-400 mb-1">Note sécurité paiement (FR)</label>
                <input
                  type="text"
                  value={settings.premium_note_fr || ''}
                  onChange={(e) => updateField('premium_note_fr', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-stone-200"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-400 mb-1">Payment security note (EN)</label>
                <input
                  type="text"
                  value={settings.premium_note_en || ''}
                  onChange={(e) => updateField('premium_note_en', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-stone-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              {premiumBenefits.map((b, idx) => (
                <div key={idx} className="grid grid-cols-11 gap-2 items-center rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
                  <input
                    type="text"
                    value={b.fr}
                    placeholder="Avantage FR"
                    onChange={(e) => {
                      const next = [...premiumBenefits];
                      next[idx] = { ...b, fr: e.target.value };
                      updateField('premium_benefits_json', JSON.stringify(next));
                    }}
                    className="col-span-5 rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={b.en}
                    placeholder="Perk EN"
                    onChange={(e) => {
                      const next = [...premiumBenefits];
                      next[idx] = { ...b, en: e.target.value };
                      updateField('premium_benefits_json', JSON.stringify(next));
                    }}
                    className="col-span-5 rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-stone-200"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        'premium_benefits_json',
                        JSON.stringify(premiumBenefits.filter((_, i) => i !== idx))
                      )
                    }
                    className="col-span-1 flex justify-center text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Finale Section */}
          <div className="zola-card rounded-2xl p-5 space-y-4">
            <h2 className="font-display text-lg font-bold text-white">Bloc Appel à l'action final (CTA)</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] text-stone-400 mb-1">Titre CTA (FR)</label>
                <input
                  type="text"
                  value={settings.cta_section_title_fr || ''}
                  onChange={(e) => updateField('cta_section_title_fr', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-400 mb-1">CTA Title (EN)</label>
                <input
                  type="text"
                  value={settings.cta_section_title_en || ''}
                  onChange={(e) => updateField('cta_section_title_en', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-400 mb-1">Mot mis en valeur (FR)</label>
                <input
                  type="text"
                  value={settings.cta_section_highlight_fr || ''}
                  onChange={(e) => updateField('cta_section_highlight_fr', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-orange-300"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-400 mb-1">Highlight word (EN)</label>
                <input
                  type="text"
                  value={settings.cta_section_highlight_en || ''}
                  onChange={(e) => updateField('cta_section_highlight_en', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-orange-300"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-400 mb-1">Sous-titre CTA (FR)</label>
                <input
                  type="text"
                  value={settings.cta_section_subtitle_fr || ''}
                  onChange={(e) => updateField('cta_section_subtitle_fr', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-stone-200"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-400 mb-1">CTA Subtitle (EN)</label>
                <input
                  type="text"
                  value={settings.cta_section_subtitle_en || ''}
                  onChange={(e) => updateField('cta_section_subtitle_en', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-stone-200"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-400 mb-1">Bouton CTA (FR)</label>
                <input
                  type="text"
                  value={settings.cta_section_btn_fr || ''}
                  onChange={(e) => updateField('cta_section_btn_fr', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-400 mb-1">CTA Button (EN)</label>
                <input
                  type="text"
                  value={settings.cta_section_btn_en || ''}
                  onChange={(e) => updateField('cta_section_btn_en', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION FOOTER & LIENS */}
      {section === 'footer' && (
        <div className="space-y-6">
          <div className="zola-card rounded-2xl p-5 space-y-4">
            <h2 className="font-display text-lg font-bold text-white">Textes & Colonnes du Pied de page (Footer)</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-stone-400 mb-1">Slogan Footer (FR)</label>
                <input
                  type="text"
                  value={settings.footer_slogan || ''}
                  onChange={(e) => updateField('footer_slogan', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Slogan Footer (EN)</label>
                <input
                  type="text"
                  value={settings.footer_slogan_en || ''}
                  onChange={(e) => updateField('footer_slogan_en', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Note paiement Footer (FR)</label>
                <input
                  type="text"
                  value={settings.footer_payment_note_fr || ''}
                  onChange={(e) => updateField('footer_payment_note_fr', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Note paiement Footer (EN)</label>
                <input
                  type="text"
                  value={settings.footer_payment_note_en || ''}
                  onChange={(e) => updateField('footer_payment_note_en', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Copyright (FR)</label>
                <input
                  type="text"
                  value={settings.footer_copyright_fr || ''}
                  onChange={(e) => updateField('footer_copyright_fr', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Copyright (EN)</label>
                <input
                  type="text"
                  value={settings.footer_copyright_en || ''}
                  onChange={(e) => updateField('footer_copyright_en', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Titre Colonne 1 Navigation (FR / EN)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={settings.footer_col_nav_fr || ''}
                    onChange={(e) => updateField('footer_col_nav_fr', e.target.value)}
                    className="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={settings.footer_col_nav_en || ''}
                    onChange={(e) => updateField('footer_col_nav_en', e.target.value)}
                    className="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Titre Colonne 2 Légal (FR / EN)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={settings.footer_col_legal_fr || ''}
                    onChange={(e) => updateField('footer_col_legal_fr', e.target.value)}
                    className="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={settings.footer_col_legal_en || ''}
                    onChange={(e) => updateField('footer_col_legal_en', e.target.value)}
                    className="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Titre Colonne 3 Accès (FR / EN)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={settings.footer_col_access_fr || ''}
                    onChange={(e) => updateField('footer_col_access_fr', e.target.value)}
                    className="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={settings.footer_col_access_en || ''}
                    onChange={(e) => updateField('footer_col_access_en', e.target.value)}
                    className="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Email de support du Footer</label>
                <input
                  type="email"
                  value={settings.support_email || ''}
                  onChange={(e) => updateField('support_email', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          </div>

          <div className="zola-card rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-bold text-white">Liens du Footer ({footerLinks.length})</h2>
                <p className="text-xs text-stone-400">
                  Ajoutez ou modifiez les liens vers des sections de la page, des pages de l'app ou des URL externes.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  updateField(
                    'footer_links_json',
                    JSON.stringify([
                      ...footerLinks,
                      { column: 'nav', label_fr: 'Nouveau lien', label_en: 'New link', action: 'url', target: 'https://' },
                    ])
                  )
                }
                className="inline-flex items-center gap-1 rounded-full border border-orange-500/35 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-300"
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter un lien
              </button>
            </div>

            <div className="space-y-2.5">
              {footerLinks.map((lk, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 md:grid-cols-12 md:items-center"
                >
                  <select
                    value={lk.column}
                    onChange={(e) => {
                      const next = [...footerLinks];
                      next[idx] = { ...lk, column: e.target.value as FooterLinkItem['column'] };
                      updateField('footer_links_json', JSON.stringify(next));
                    }}
                    className="md:col-span-2 rounded-lg border border-white/12 bg-[#1B1413] px-2 py-1.5 text-xs text-white"
                  >
                    <option value="nav">Navigation</option>
                    <option value="legal">Légal</option>
                    <option value="access">Accès rapide</option>
                  </select>

                  <input
                    type="text"
                    value={lk.label_fr}
                    placeholder="Libellé FR"
                    onChange={(e) => {
                      const next = [...footerLinks];
                      next[idx] = { ...lk, label_fr: e.target.value };
                      updateField('footer_links_json', JSON.stringify(next));
                    }}
                    className="md:col-span-3 rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-white"
                  />

                  <input
                    type="text"
                    value={lk.label_en}
                    placeholder="Label EN"
                    onChange={(e) => {
                      const next = [...footerLinks];
                      next[idx] = { ...lk, label_en: e.target.value };
                      updateField('footer_links_json', JSON.stringify(next));
                    }}
                    className="md:col-span-2 rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs text-stone-200"
                  />

                  <select
                    value={lk.action}
                    onChange={(e) => {
                      const next = [...footerLinks];
                      next[idx] = { ...lk, action: e.target.value as FooterLinkItem['action'] };
                      updateField('footer_links_json', JSON.stringify(next));
                    }}
                    className="md:col-span-2 rounded-lg border border-white/12 bg-[#1B1413] px-2 py-1.5 text-xs text-amber-300"
                  >
                    <option value="section">Section (#)</option>
                    <option value="route">Page interne</option>
                    <option value="url">URL externe</option>
                  </select>

                  <input
                    type="text"
                    value={lk.target}
                    placeholder="ex: tarifs, legal, https://..."
                    onChange={(e) => {
                      const next = [...footerLinks];
                      next[idx] = { ...lk, target: e.target.value };
                      updateField('footer_links_json', JSON.stringify(next));
                    }}
                    className="md:col-span-2 rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-xs font-mono text-stone-200"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        'footer_links_json',
                        JSON.stringify(footerLinks.filter((_, i) => i !== idx))
                      )
                    }
                    className="md:col-span-1 flex justify-end md:justify-center text-red-400 hover:text-red-300 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: APP DATA (INTERESTS CRUD, COUNTRIES, ZODIAC, STICKERS, ICEBREAKERS, REPORT REASONS) */}
      {section === 'appData' && (
        <div className="space-y-6">
          {/* Interests CRUD */}
          <div className="zola-card rounded-2xl p-5 space-y-4">
            <h2 className="font-display text-lg font-bold text-white">Centres d'intérêt ({interests.length})</h2>
            <form onSubmit={handleAddInterest} className="flex flex-wrap gap-2">
              <input
                type="text"
                value={newInterestName}
                onChange={(e) => setNewInterestName(e.target.value)}
                placeholder="Nom du centre d'intérêt"
                className="flex-1 min-w-[180px] rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-white"
              />
              <input
                type="text"
                value={newInterestCategory}
                onChange={(e) => setNewInterestCategory(e.target.value)}
                placeholder="Catégorie"
                className="w-40 rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-white"
              />
              <button type="submit" className="zola-gradient rounded-full px-4 py-2 text-xs font-semibold text-white">
                Ajouter
              </button>
            </form>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {interests.map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                  {editingInterestId === it.id ? (
                    <div className="flex flex-1 items-center gap-1.5">
                      <input
                        type="text"
                        value={editingInterestName}
                        onChange={(e) => setEditingInterestName(e.target.value)}
                        className="w-full rounded border border-white/15 bg-black/40 px-2 py-1 text-xs text-white"
                      />
                      <input
                        type="text"
                        value={editingInterestCat}
                        onChange={(e) => setEditingInterestCat(e.target.value)}
                        className="w-24 rounded border border-white/15 bg-black/40 px-2 py-1 text-xs text-stone-300"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveInterest(it.id)}
                        className="rounded bg-emerald-600 px-2 py-1 text-[11px] text-white"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingInterestId(it.id);
                          setEditingInterestName(it.name);
                          setEditingInterestCat(it.category);
                        }}
                        className="text-left min-w-0 flex-1"
                      >
                        <p className="text-xs font-semibold text-white truncate">{it.name}</p>
                        <p className="text-[11px] text-stone-400 truncate">{it.category}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteInterest(it.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Countries */}
          <div className="zola-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white">Pays & Villes par défaut ({countries.length})</h2>
              <button
                type="button"
                onClick={() =>
                  updateField(
                    'countries_json',
                    JSON.stringify([...countries, { name: 'Nouveau pays', en: 'New country', default_city: '', code: 'AF' }])
                  )
                }
                className="inline-flex items-center gap-1 rounded-full border border-orange-500/35 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-300"
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter un pays
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {countries.map((c, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-1.5 items-center rounded-xl border border-white/10 bg-white/[0.03] p-2">
                  <input
                    type="text"
                    value={c.name}
                    placeholder="Nom FR"
                    onChange={(e) => {
                      const next = [...countries];
                      next[idx] = { ...c, name: e.target.value };
                      updateField('countries_json', JSON.stringify(next));
                    }}
                    className="col-span-4 rounded border border-white/12 bg-black/30 px-2 py-1 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={c.en}
                    placeholder="Name EN"
                    onChange={(e) => {
                      const next = [...countries];
                      next[idx] = { ...c, en: e.target.value };
                      updateField('countries_json', JSON.stringify(next));
                    }}
                    className="col-span-3 rounded border border-white/12 bg-black/30 px-2 py-1 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={c.default_city}
                    placeholder="Ville"
                    onChange={(e) => {
                      const next = [...countries];
                      next[idx] = { ...c, default_city: e.target.value };
                      updateField('countries_json', JSON.stringify(next));
                    }}
                    className="col-span-3 rounded border border-white/12 bg-black/30 px-2 py-1 text-xs text-stone-300"
                  />
                  <input
                    type="text"
                    value={c.code}
                    placeholder="ISO"
                    maxLength={3}
                    onChange={(e) => {
                      const next = [...countries];
                      next[idx] = { ...c, code: e.target.value.toUpperCase() };
                      updateField('countries_json', JSON.stringify(next));
                    }}
                    className="col-span-1 rounded border border-white/12 bg-black/30 px-1.5 py-1 text-xs text-center text-amber-300"
                  />
                  <button
                    type="button"
                    onClick={() => updateField('countries_json', JSON.stringify(countries.filter((_, i) => i !== idx)))}
                    className="col-span-1 flex justify-center text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Cultural Stickers */}
          <div className="zola-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white">Stickers culturels du chat ({stickers.length})</h2>
              <button
                type="button"
                onClick={() =>
                  triggerUpload(`new-sticker-${Date.now()}`, (url) => {
                    updateField(
                      'cultural_stickers_json',
                      JSON.stringify([
                        ...stickers,
                        {
                          id: `custom-${Date.now()}`,
                          label: 'Nouveau sticker',
                          origin_fr: 'Culture africaine',
                          origin_en: 'African culture',
                          image_url: url,
                        },
                      ])
                    );
                  })
                }
                className="inline-flex items-center gap-1 rounded-full border border-orange-500/35 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-300"
              >
                <Upload className="h-3.5 w-3.5" /> Importer un sticker personnalisé
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {stickers.map((st, idx) => (
                <div key={st.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-stone-400">{st.id}</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateField('cultural_stickers_json', JSON.stringify(stickers.filter((_, i) => i !== idx)))
                      }
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {st.image_url && (
                    <img src={st.image_url} alt={st.label} className="h-14 w-14 rounded-lg object-contain bg-black/40 mx-auto" />
                  )}
                  <input
                    type="text"
                    value={st.label}
                    placeholder="Nom du sticker"
                    onChange={(e) => {
                      const next = [...stickers];
                      next[idx] = { ...st, label: e.target.value };
                      updateField('cultural_stickers_json', JSON.stringify(next));
                    }}
                    className="w-full rounded-lg border border-white/12 bg-black/30 px-2.5 py-1 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={st.origin_fr}
                    placeholder="Origine FR"
                    onChange={(e) => {
                      const next = [...stickers];
                      next[idx] = { ...st, origin_fr: e.target.value };
                      updateField('cultural_stickers_json', JSON.stringify(next));
                    }}
                    className="w-full rounded-lg border border-white/12 bg-black/30 px-2.5 py-1 text-xs text-stone-300"
                  />
                  <input
                    type="text"
                    value={st.origin_en}
                    placeholder="Origin EN"
                    onChange={(e) => {
                      const next = [...stickers];
                      next[idx] = { ...st, origin_en: e.target.value };
                      updateField('cultural_stickers_json', JSON.stringify(next));
                    }}
                    className="w-full rounded-lg border border-white/12 bg-black/30 px-2.5 py-1 text-xs text-stone-300"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Icebreakers, Report Reasons & Zodiac */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Icebreakers */}
            <div className="zola-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold text-white">Brise-glaces du chat</h3>
                <button
                  type="button"
                  onClick={() =>
                    updateField('chat_icebreakers_json', JSON.stringify([...icebreakers, { fr: '', en: '' }]))
                  }
                  className="text-xs text-orange-300 hover:underline"
                >
                  + Ajouter
                </button>
              </div>
              {icebreakers.map((ib, idx) => (
                <div key={idx} className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 space-y-1.5">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        updateField('chat_icebreakers_json', JSON.stringify(icebreakers.filter((_, i) => i !== idx)))
                      }
                      className="text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={ib.fr}
                    placeholder="Phrase FR"
                    onChange={(e) => {
                      const next = [...icebreakers];
                      next[idx] = { ...ib, fr: e.target.value };
                      updateField('chat_icebreakers_json', JSON.stringify(next));
                    }}
                    className="w-full rounded border border-white/12 bg-black/30 px-2 py-1 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={ib.en}
                    placeholder="Icebreaker EN"
                    onChange={(e) => {
                      const next = [...icebreakers];
                      next[idx] = { ...ib, en: e.target.value };
                      updateField('chat_icebreakers_json', JSON.stringify(next));
                    }}
                    className="w-full rounded border border-white/12 bg-black/30 px-2 py-1 text-xs text-stone-300"
                  />
                </div>
              ))}
            </div>

            {/* Report Reasons */}
            <div className="zola-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold text-white">Motifs de signalement</h3>
                <button
                  type="button"
                  onClick={() =>
                    updateField('report_reasons_json', JSON.stringify([...reportReasons, { fr: '', en: '' }]))
                  }
                  className="text-xs text-orange-300 hover:underline"
                >
                  + Ajouter
                </button>
              </div>
              {reportReasons.map((rr, idx) => (
                <div key={idx} className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 space-y-1.5">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        updateField('report_reasons_json', JSON.stringify(reportReasons.filter((_, i) => i !== idx)))
                      }
                      className="text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={rr.fr}
                    placeholder="Motif FR"
                    onChange={(e) => {
                      const next = [...reportReasons];
                      next[idx] = { ...rr, fr: e.target.value };
                      updateField('report_reasons_json', JSON.stringify(next));
                    }}
                    className="w-full rounded border border-white/12 bg-black/30 px-2 py-1 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={rr.en}
                    placeholder="Reason EN"
                    onChange={(e) => {
                      const next = [...reportReasons];
                      next[idx] = { ...rr, en: e.target.value };
                      updateField('report_reasons_json', JSON.stringify(next));
                    }}
                    className="w-full rounded border border-white/12 bg-black/30 px-2 py-1 text-xs text-stone-300"
                  />
                </div>
              ))}
            </div>

            {/* Zodiac Signs */}
            <div className="zola-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold text-white">Signes astrologiques</h3>
                <button
                  type="button"
                  onClick={() =>
                    updateField('zodiac_signs_json', JSON.stringify([...zodiacSigns, { fr: '', en: '' }]))
                  }
                  className="text-xs text-orange-300 hover:underline"
                >
                  + Ajouter
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                {zodiacSigns.map((z, idx) => (
                  <div key={idx} className="grid grid-cols-11 gap-1.5 items-center">
                    <input
                      type="text"
                      value={z.fr}
                      placeholder="FR"
                      onChange={(e) => {
                        const next = [...zodiacSigns];
                        next[idx] = { ...z, fr: e.target.value };
                        updateField('zodiac_signs_json', JSON.stringify(next));
                      }}
                      className="col-span-5 rounded border border-white/12 bg-black/30 px-2 py-1 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={z.en}
                      placeholder="EN"
                      onChange={(e) => {
                        const next = [...zodiacSigns];
                        next[idx] = { ...z, en: e.target.value };
                        updateField('zodiac_signs_json', JSON.stringify(next));
                      }}
                      className="col-span-5 rounded border border-white/12 bg-black/30 px-2 py-1 text-xs text-stone-300"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateField('zodiac_signs_json', JSON.stringify(zodiacSigns.filter((_, i) => i !== idx)))
                      }
                      className="col-span-1 text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: LEGAL, ABOUT & OAUTH */}
      {section === 'legal' && (
        <div className="space-y-6">
          <div className="zola-card rounded-2xl p-5 space-y-4">
            <h2 className="font-display text-lg font-bold text-white">Mentions légales & Confidentialité</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-stone-400 mb-1">Titre page légale (FR)</label>
                <input
                  type="text"
                  value={settings.legal_title_fr || ''}
                  onChange={(e) => updateField('legal_title_fr', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Legal page title (EN)</label>
                <input
                  type="text"
                  value={settings.legal_title_en || ''}
                  onChange={(e) => updateField('legal_title_en', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Paragraphe 1 (FR)</label>
                <textarea
                  rows={4}
                  value={settings.legal_p1_fr || ''}
                  onChange={(e) => updateField('legal_p1_fr', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-stone-200"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Paragraph 1 (EN)</label>
                <textarea
                  rows={4}
                  value={settings.legal_p1_en || ''}
                  onChange={(e) => updateField('legal_p1_en', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-stone-200"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Paragraphe 2 / Sécurité (FR)</label>
                <textarea
                  rows={4}
                  value={settings.legal_p2_fr || ''}
                  onChange={(e) => updateField('legal_p2_fr', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-stone-200"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Paragraph 2 / Safety (EN)</label>
                <textarea
                  rows={4}
                  value={settings.legal_p2_en || ''}
                  onChange={(e) => updateField('legal_p2_en', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-stone-200"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Texte « À propos » Paramètres (FR)</label>
                <textarea
                  rows={3}
                  value={settings.about_text_fr || ''}
                  onChange={(e) => updateField('about_text_fr', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-stone-200"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">About text in Settings (EN)</label>
                <textarea
                  rows={3}
                  value={settings.about_text_en || ''}
                  onChange={(e) => updateField('about_text_en', e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-stone-200"
                />
              </div>
            </div>
          </div>

          <div className="zola-card rounded-2xl p-5 space-y-4">
            <h2 className="font-display text-lg font-bold text-white">Fournisseur de paiement & Connexion OAuth</h2>
            <div>
              <label className="block text-xs text-stone-400 mb-1">Libellé du prestataire de paiement</label>
              <input
                type="text"
                value={settings.payment_provider_label || ''}
                onChange={(e) => updateField('payment_provider_label', e.target.value)}
                className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { key: 'oauth_google_enabled', label: 'Google OAuth' },
                { key: 'oauth_facebook_enabled', label: 'Facebook OAuth' },
                { key: 'oauth_apple_enabled', label: 'Apple OAuth' },
              ].map((o) => (
                <label
                  key={o.key}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-stone-200"
                >
                  <input
                    type="checkbox"
                    checked={settings[o.key] === '1'}
                    onChange={(e) => updateField(o.key, e.target.checked ? '1' : '0')}
                    className="accent-orange-500"
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: UNIVERSAL TEXT & TRANSLATION EDITOR */}
      {section === 'texts' && (
        <div className="zola-card rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                Éditeur universel de tous les textes du site ({allTextKeys.length} clés FR/EN)
              </h2>
              <p className="text-xs text-stone-400">
                Recherchez et modifiez n'importe quel titre, bouton, label, menu ou message de toute l'application.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                updateField('i18n_overrides_fr', '{}');
                updateField('i18n_overrides_en', '{}');
                setFeedback('Textes réinitialisés aux valeurs par défaut (enregistrez pour appliquer).');
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs text-stone-300 hover:bg-white/10"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Tout réinitialiser
            </button>
          </div>

          <div className="flex flex-wrap gap-2.5 items-center">
            <input
              type="text"
              value={textSearch}
              onChange={(e) => setTextSearch(e.target.value)}
              placeholder="Rechercher un texte, bouton ou clé (ex: S'abonner, Match, Favoris)..."
              className="flex-1 min-w-[220px] rounded-xl border border-white/12 bg-white/5 px-3.5 py-2 text-xs text-white"
            />
            <select
              value={textCategory}
              onChange={(e) => setTextCategory(e.target.value)}
              className="rounded-xl border border-white/12 bg-[#1B1413] px-3 py-2 text-xs text-white"
            >
              {TEXT_CATEGORIES.map((c) => (
                <option key={c.prefix} value={c.prefix}>
                  {c.label}
                </option>
              ))}
            </select>
            <label className="inline-flex items-center gap-1.5 text-xs text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyModified}
                onChange={(e) => setOnlyModified(e.target.checked)}
                className="accent-orange-500"
              />
              Modifiés uniquement
            </label>
          </div>

          <div className="max-h-[540px] overflow-y-auto space-y-2.5 pr-1">
            {filteredTextKeys.map((key) => {
              const currentFr = overridesFr[key] ?? translations.fr[key];
              const currentEn = overridesEn[key] ?? translations.en[key];
              const isModified = Boolean(overridesFr[key] || overridesEn[key]);
              return (
                <div
                  key={key}
                  className={`rounded-xl border p-3 space-y-2 ${
                    isModified
                      ? 'border-orange-500/40 bg-orange-500/[0.06]'
                      : 'border-white/8 bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-amber-300">{key}</span>
                    {isModified && (
                      <button
                        type="button"
                        onClick={() => {
                          setTextOverride('fr', key, translations.fr[key]);
                          setTextOverride('en', key, translations.en[key]);
                        }}
                        className="text-[11px] text-stone-400 hover:text-white"
                      >
                        Rétablir défaut
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <span className="text-[10px] uppercase text-stone-500">Français</span>
                      <input
                        type="text"
                        value={currentFr}
                        onChange={(e) => setTextOverride('fr', key, e.target.value)}
                        className="mt-0.5 w-full rounded-lg border border-white/12 bg-black/35 px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-stone-500">English</span>
                      <input
                        type="text"
                        value={currentEn}
                        onChange={(e) => setTextOverride('en', key, e.target.value)}
                        className="mt-0.5 w-full rounded-lg border border-white/12 bg-black/35 px-2.5 py-1.5 text-xs text-stone-200"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredTextKeys.length === 0 && (
              <p className="text-center py-6 text-xs text-stone-400">
                Aucun texte ne correspond à votre recherche.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
