import React, { useState } from 'react';
import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronDown,
  Crown,
  Heart,
  Lock,
  Menu,
  MessageCircle,
  PhoneCall,
  Play,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { Lock as LockIcon } from 'lucide-react';
import {
  DEFAULT_BENTO_CARDS,
  DEFAULT_FAQ_ITEMS,
  DEFAULT_FOOTER_LINKS,
  DEFAULT_HOW_IT_WORKS,
  DEFAULT_PREMIUM_BENEFITS,
  DEFAULT_TESTIMONIALS,
  DEFAULT_WHY_CARDS,
  parseCmsJson,
  type BentoCardItem,
  type BilingualItem,
  type CmsIconName,
  type FaqItem as CmsFaqItem,
  type FooterLinkItem,
  type StepItem,
  type TestimonialItem,
  type WhyCardItem,
} from '../lib/cms';
import { useI18n } from '../lib/i18n';
import type {
  AppRoute,
  PublicProfilePreview,
  RegisterPrefill,
  SiteSettings,
  SubscriptionPlan,
} from '../types';
import { LanguageToggle } from './LanguageToggle';
import { PWAInstallButton } from './PWAControls';
import { ZolaLogo } from './ZolaLogo';

interface LandingPageProps {
  activeMembers: number;
  verifiedMembers: number;
  totalMatches: number;
  countriesCount: number;
  previewProfiles: PublicProfilePreview[];
  settings: SiteSettings;
  plans: SubscriptionPlan[];
  onNavigate: (route: AppRoute, sectionId?: string) => void;
  onStartRegister: (prefill: RegisterPrefill) => void;
  isAuthenticated: boolean;
  isAdmin?: boolean;
}

function renderCmsIcon(icon: CmsIconName, className = 'h-6 w-6') {
  switch (icon) {
    case 'heart':
      return <Heart className={`${className} fill-orange-500 text-orange-500`} />;
    case 'shield':
      return <ShieldCheck className={`${className} text-orange-500`} />;
    case 'zap':
      return <Zap className={`${className} fill-amber-400 text-amber-400`} />;
    case 'crown':
      return <Crown className={`${className} fill-amber-400 text-amber-400`} />;
    case 'bookmark':
      return <Bookmark className={`${className} text-orange-400`} />;
    case 'phone':
      return <PhoneCall className={`${className} text-amber-400`} />;
    case 'sparkles':
      return <Sparkles className={`${className} text-red-400`} />;
    case 'message':
      return <MessageCircle className={`${className} text-orange-400`} />;
    case 'lock':
      return <LockIcon className={`${className} text-emerald-400`} />;
    default:
      return <Sparkles className={`${className} text-orange-400`} />;
  }
}

export const LandingPage: React.FC<LandingPageProps> = ({
  activeMembers,
  verifiedMembers,
  totalMatches,
  countriesCount,
  previewProfiles,
  settings,
  plans,
  onNavigate,
  onStartRegister,
  isAuthenticated,
  isAdmin = false,
}) => {
  const { lang, locale, t, tCountry, tPlanName, tPlanFeature, countries, brandName } = useI18n();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [quickGender, setQuickGender] = useState<'Femme' | 'Homme'>('Femme');
  const [quickSeeking, setQuickSeeking] = useState<'Homme' | 'Femme' | 'Tous'>('Homme');
  const [quickCountry, setQuickCountry] = useState<string>(countries[1]?.name || countries[0]?.name || "Côte d'Ivoire");

  const resolvedHeroTitle =
    lang === 'en'
      ? settings.hero_title_en || t('landing.hero.defaultTitle')
      : settings.hero_title || t('landing.hero.defaultTitle');

  const resolvedHeroHighlight =
    lang === 'en'
      ? settings.hero_highlight_en || t('landing.hero.highlight')
      : settings.hero_highlight_fr || t('landing.hero.highlight');

  const resolvedHeroSubtitle =
    lang === 'en'
      ? settings.hero_subtitle_en || t('landing.hero.defaultSubtitle')
      : settings.hero_subtitle || t('landing.hero.defaultSubtitle');

  const resolvedCtaPrimary =
    lang === 'en'
      ? settings.hero_cta_primary_en || t('landing.hero.ctaPrimary')
      : settings.hero_cta_primary || t('landing.hero.ctaPrimary');

  const resolvedCtaSecondary =
    lang === 'en'
      ? settings.hero_cta_secondary_en || t('landing.hero.ctaSecondary')
      : settings.hero_cta_secondary || t('landing.hero.ctaSecondary');

  const resolvedFooterSlogan =
    lang === 'en'
      ? settings.footer_slogan_en || t('landing.footer.slogan')
      : settings.footer_slogan || t('landing.footer.slogan');

  const resolvedFooterCopyright =
    lang === 'en'
      ? settings.footer_copyright_en || t('landing.footer.rights')
      : settings.footer_copyright_fr || t('landing.footer.rights');

  const resolvedFooterPayNote =
    lang === 'en'
      ? settings.footer_payment_note_en || t('landing.footer.saspay')
      : settings.footer_payment_note_fr || t('landing.footer.saspay');

  const supportEmail = settings.support_email || 'support@zola.africa';
  const heroImageUrl = settings.hero_image_url || '/media/zola_hero_couple_1794726544399.jpg';
  const heroAvatar1 = settings.hero_avatar_1_url || '/media/zola_portrait_woman_2_1794726546703.jpg';
  const heroAvatar2 = settings.hero_avatar_2_url || '/media/zola_login_man_1794726545582.jpg';
  const heroAvatar3 = settings.hero_avatar_3_url || '/media/zola_hero_couple_1794726544399.jpg';
  const savannaBgUrl = settings.savanna_bg_url || '/media/zola_savanna_sunset_1794726545758.jpg';
  const ctaImg1 = settings.cta_image_1_url || '/media/zola_portrait_woman_2_1794726546703.jpg';
  const ctaImg2 = settings.cta_image_2_url || '/media/zola_login_man_1794726545582.jpg';

  const whyCards = parseCmsJson<WhyCardItem[]>(settings.why_cards_json, DEFAULT_WHY_CARDS);
  const bentoCards = parseCmsJson<BentoCardItem[]>(settings.bento_cards_json, DEFAULT_BENTO_CARDS);
  const howItWorks = parseCmsJson<StepItem[]>(settings.how_it_works_json, DEFAULT_HOW_IT_WORKS);
  const testimonials = parseCmsJson<TestimonialItem[]>(settings.testimonials_json, DEFAULT_TESTIMONIALS);
  const faqItems = parseCmsJson<CmsFaqItem[]>(settings.faq_items_json, DEFAULT_FAQ_ITEMS);
  const footerLinks = parseCmsJson<FooterLinkItem[]>(settings.footer_links_json, DEFAULT_FOOTER_LINKS);
  const premiumBenefits = parseCmsJson<BilingualItem[]>(settings.premium_benefits_json, DEFAULT_PREMIUM_BENEFITS);

  const whySectionTitle =
    lang === 'en'
      ? settings.why_section_title_en || t('landing.why.title')
      : settings.why_section_title_fr || t('landing.why.title');
  const whySectionSubtitle =
    lang === 'en'
      ? settings.why_section_subtitle_en || t('landing.why.subtitle')
      : settings.why_section_subtitle_fr || t('landing.why.subtitle');

  const premiumTitle =
    lang === 'en'
      ? settings.premium_title_en || t('landing.pricing.title')
      : settings.premium_title_fr || t('landing.pricing.title');
  const premiumSubtitle =
    lang === 'en'
      ? settings.premium_subtitle_en || t('landing.pricing.subtitle')
      : settings.premium_subtitle_fr || t('landing.pricing.subtitle');
  const premiumNote =
    lang === 'en'
      ? settings.premium_note_en || t('landing.pricing.saspayNote')
      : settings.premium_note_fr || t('landing.pricing.saspayNote');

  const announcementText =
    settings.announcement_enabled === '1'
      ? (lang === 'en' ? settings.announcement_text_en : settings.announcement_text_fr)
      : '';

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedCountry = countries.find((c) => c.name === quickCountry);
    onStartRegister({
      gender: quickGender,
      seeking_gender: quickSeeking,
      country: quickCountry,
      city: matchedCountry?.default_city || '',
    });
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-[#0B0909] text-stone-100">
      {announcementText && (
        <div className="zola-gradient px-4 py-2 text-center text-xs sm:text-sm font-medium text-white">
          {announcementText}
        </div>
      )}
      {/* Top Navigation Bar (3-zone contract + mobile drawer) */}
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#0B0909]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 sm:gap-6 px-3 py-3 sm:px-8 sm:py-3.5">
          <button
            type="button"
            onClick={() => scrollToSection('accueil')}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-lg whitespace-nowrap shrink-0"
          >
            <ZolaLogo />
          </button>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-300">
            <button type="button" onClick={() => scrollToSection('accueil')} className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              {t('landing.nav.home')}
            </button>
            <button
              type="button"
              onClick={() => onNavigate(isAuthenticated ? (isAdmin ? 'admin' : 'discover') : 'register')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              {t('landing.nav.discover')}
            </button>
            <button type="button" onClick={() => scrollToSection('fonctionnalites')} className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              {t('landing.nav.features')}
            </button>
            <button type="button" onClick={() => scrollToSection('tarifs')} className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              {t('landing.nav.pricing')}
            </button>
            <button type="button" onClick={() => scrollToSection('faq')} className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              {t('landing.nav.faq')}
            </button>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <div className="hidden sm:inline-flex">
              <PWAInstallButton compact />
            </div>
            <LanguageToggle compact />
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => onNavigate(isAdmin ? 'admin' : 'discover')}
                className="zola-gradient zola-gradient-hover rounded-full px-3.5 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-orange-600/25 transition-all whitespace-nowrap shrink-0"
              >
                {isAdmin ? t('nav.admin') : t('landing.nav.mySpace')}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="hidden sm:inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-stone-200 hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
                >
                  {t('landing.nav.login')}
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('register')}
                  className="zola-gradient zola-gradient-hover rounded-full px-3.5 py-2 sm:px-5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-orange-600/25 transition-all whitespace-nowrap shrink-0"
                >
                  {t('landing.nav.signup')}
                </button>
              </>
            )}

            <button
              type="button"
              aria-label={mobileMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="inline-flex md:hidden h-11 w-11 items-center justify-center rounded-xl border border-white/12 bg-white/5 text-stone-200 hover:bg-white/10 active:scale-95 transition-all"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            mobileMenuOpen ? 'max-h-[460px] opacity-100 border-t border-white/10' : 'max-h-0 opacity-0'
          } bg-[#0F0B0A]`}
        >
          <div className="px-4 py-4 space-y-1.5">
            {[
              { label: t('landing.nav.home'), id: 'accueil' },
              { label: t('landing.nav.why'), id: 'pourquoi' },
              { label: t('landing.nav.features'), id: 'fonctionnalites' },
              { label: t('landing.nav.steps'), id: 'etapes' },
              { label: t('landing.nav.pricing'), id: 'tarifs' },
              { label: t('landing.nav.faq'), id: 'faq' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className="flex min-h-[44px] w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium text-stone-200 hover:bg-white/5 active:scale-[0.98] transition-all"
              >
                <span>{item.label}</span>
                <ArrowRight className="h-4 w-4 text-stone-500" />
              </button>
            ))}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <LanguageToggle />
              <PWAInstallButton compact />
            </div>
            {!isAuthenticated && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('login');
                }}
                className="min-h-[44px] w-full rounded-full border border-white/15 bg-white/5 py-2.5 text-sm font-medium text-white active:scale-[0.98] transition-transform mt-2"
              >
                {t('landing.nav.login')}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Original Hero Section Style */}
      <section id="accueil" className="relative overflow-hidden border-b border-white/8">
        <div className="absolute inset-0 zola-ambient-glow pointer-events-none" />
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-14 sm:px-8 lg:grid-cols-12 lg:py-20">
          <div className="relative z-10 lg:col-span-6 space-y-6">
            <h1
              className="font-display font-extrabold tracking-tight text-white leading-[1.08]"
              style={{ fontSize: 'clamp(2.35rem, 4.4vw, 3.85rem)', textWrap: 'balance' }}
            >
              {resolvedHeroHighlight && resolvedHeroTitle.includes(resolvedHeroHighlight) ? (
                <>
                  {resolvedHeroTitle.replace(resolvedHeroHighlight, '')}
                  <span className="bg-gradient-to-r from-amber-300 via-orange-500 to-red-500 bg-clip-text text-transparent">
                    {resolvedHeroHighlight}
                  </span>
                  <Heart className="inline-block ml-3 mb-2 h-8 w-8 fill-red-500 text-red-500" aria-hidden="true" />
                </>
              ) : (
                resolvedHeroTitle
              )}
            </h1>

            <p className="max-w-xl text-base sm:text-lg leading-relaxed text-stone-300">
              {resolvedHeroSubtitle}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                type="button"
                onClick={() => onNavigate(isAuthenticated ? 'discover' : 'register')}
                className="zola-gradient zola-gradient-hover inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm sm:text-base font-semibold text-white shadow-xl shadow-orange-600/30 transition-transform active:scale-[0.98]"
              >
                {resolvedCtaPrimary}
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('pourquoi')}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-sm sm:text-base font-medium text-stone-200 hover:bg-white/10 transition-colors"
              >
                {resolvedCtaSecondary}
                <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              </button>
            </div>

            {/* Real Database Member Counter */}
            <div className="flex items-center gap-4 pt-3">
              <div className="flex -space-x-2.5">
                <img
                  src={heroAvatar1}
                  alt={brandName}
                  referrerPolicy="no-referrer"
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-[#0B0909]"
                />
                <img
                  src={heroAvatar2}
                  alt={brandName}
                  referrerPolicy="no-referrer"
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-[#0B0909]"
                />
                <img
                  src={heroAvatar3}
                  alt={brandName}
                  referrerPolicy="no-referrer"
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-[#0B0909]"
                />
              </div>
              <div className="text-sm">
                <span className="font-display font-bold text-white tabular-nums">
                  {activeMembers} {activeMembers > 1 ? t('landing.hero.activeMembers') : t('landing.hero.activeMember')}
                </span>
                <span className="block text-xs text-stone-400 tabular-nums">
                  {t('landing.hero.verifiedBase', { count: verifiedMembers })}
                </span>
              </div>
            </div>
          </div>

          <div className="relative lg:col-span-6">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#140F0E] shadow-2xl shadow-orange-950/40">
              <img
                src={heroImageUrl}
                alt={t('landing.hero.imgAlt')}
                referrerPolicy="no-referrer"
                className="h-[340px] w-full object-cover sm:h-[440px]"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B0909] via-transparent to-transparent opacity-70" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0B0909]/60 via-transparent to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* Why ZOLA */}
      <section id="pourquoi" className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
        <div className="mb-10 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
            {whySectionTitle}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-stone-400">
            {whySectionSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {whyCards.map((card, idx) => (
            <div key={`${card.title_fr}-${idx}`} className="zola-card rounded-2xl p-6 text-center transition-transform hover:-translate-y-1">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/15">
                {renderCmsIcon(card.icon, 'h-6 w-6')}
              </div>
              <h3 className="font-display text-base font-semibold text-white">
                {lang === 'en' ? card.title_en || card.title_fr : card.title_fr}
              </h3>
              <p className="mt-2 text-sm text-stone-400">
                {lang === 'en' ? card.desc_en || card.desc_fr : card.desc_fr}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Asymmetric Bento-Grid Features */}
      <section id="fonctionnalites" className="border-y border-white/8 bg-[#100C0B]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
          <div className="max-w-2xl mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white" style={{ textWrap: 'balance' }}>
              {t('landing.bento.title')}
            </h2>
            <p className="mt-2 text-sm sm:text-base text-stone-400">
              {t('landing.bento.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {bentoCards.map((card, idx) => {
              const bullets = lang === 'en' ? card.bullets_en : card.bullets_fr;
              return (
                <div
                  key={`${card.title_fr}-${idx}`}
                  className={`zola-card rounded-2xl p-7 flex flex-col justify-between gap-5 ${
                    card.span2 ? 'lg:col-span-2' : ''
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      {renderCmsIcon(card.icon, 'h-5 w-5')}
                      <span className="text-xs font-medium text-stone-400">
                        {lang === 'en' ? card.tag_en || card.tag_fr : card.tag_fr}
                      </span>
                    </div>
                    <h3 className="font-display text-xl font-bold text-white">
                      {lang === 'en' ? card.title_en || card.title_fr : card.title_fr}
                    </h3>
                    <p className="text-sm leading-relaxed text-stone-300 max-w-2xl">
                      {lang === 'en' ? card.desc_en || card.desc_fr : card.desc_fr}
                    </p>
                  </div>
                  {bullets && bullets.length > 0 && (
                    <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-white/8 pt-4 text-xs text-stone-400">
                      {bullets.map((b, bi) => (
                        <React.Fragment key={`${b}-${bi}`}>
                          {bi > 0 && <span aria-hidden="true">·</span>}
                          <span>{b}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works + Live stats + Quick-Start */}
      <section id="etapes" className="mx-auto max-w-7xl px-4 py-16 sm:px-8 space-y-12">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white" style={{ textWrap: 'balance' }}>
            {t('landing.steps.title')}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-stone-400">
            {t('landing.steps.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 border-t border-white/10 pt-8">
          {howItWorks.map((item, idx) => (
            <div key={`${item.step_fr}-${idx}`} className="space-y-2.5">
              <h3 className="font-display text-lg font-bold text-amber-300">
                {lang === 'en' ? item.step_en || item.step_fr : item.step_fr}
              </h3>
              <p className="text-sm leading-relaxed text-stone-300">
                {lang === 'en' ? item.desc_en || item.desc_fr : item.desc_fr}
              </p>
            </div>
          ))}
        </div>

        {/* Live DB Stats Strip */}
        <div className="grid grid-cols-2 divide-x divide-white/8 rounded-2xl border border-white/10 bg-[#100C0B] sm:grid-cols-4">
          <div className="px-5 py-5">
            <p className="font-display text-2xl sm:text-3xl font-extrabold text-white tabular-nums">
              {activeMembers.toLocaleString(locale)}
            </p>
            <p className="mt-1 text-xs sm:text-sm text-stone-400">{t('landing.stats.activeMembers')}</p>
          </div>
          <div className="px-5 py-5">
            <p className="font-display text-2xl sm:text-3xl font-extrabold text-amber-300 tabular-nums">
              {verifiedMembers.toLocaleString(locale)}
            </p>
            <p className="mt-1 text-xs sm:text-sm text-stone-400">{t('landing.stats.verifiedProfiles')}</p>
          </div>
          <div className="px-5 py-5 border-t border-white/8 sm:border-t-0">
            <p className="font-display text-2xl sm:text-3xl font-extrabold text-white tabular-nums">
              {totalMatches.toLocaleString(locale)}
            </p>
            <p className="mt-1 text-xs sm:text-sm text-stone-400">{t('landing.stats.mutualMatches')}</p>
          </div>
          <div className="px-5 py-5 border-t border-white/8 sm:border-t-0">
            <p className="font-display text-2xl sm:text-3xl font-extrabold text-orange-400 tabular-nums">
              {Math.max(countriesCount, 1).toLocaleString(locale)}
            </p>
            <p className="mt-1 text-xs sm:text-sm text-stone-400">{t('landing.stats.countries')}</p>
          </div>
        </div>

        {/* Profile Previews & Quick-Start Form */}
        {(!isAuthenticated || previewProfiles.length > 0) && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
            {!isAuthenticated && (
              <form
                onSubmit={handleQuickSubmit}
                className="zola-card rounded-2xl p-6 lg:col-span-7 flex flex-col justify-between gap-4"
              >
                <div>
                  <h3 className="font-display text-lg font-bold text-white">
                    {t('landing.quick.title')}
                  </h3>
                  <p className="mt-1 text-sm text-stone-400">
                    {t('landing.quick.subtitle')}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
                  <div>
                    <label htmlFor="quick-gender" className="block text-xs text-stone-400 mb-1">
                      {t('landing.quick.iAm')}
                    </label>
                    <select
                      id="quick-gender"
                      value={quickGender}
                      onChange={(e) => setQuickGender(e.target.value as 'Femme' | 'Homme')}
                      className="w-full rounded-xl border border-white/12 bg-[#1C1413] px-3 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                    >
                      <option value="Femme">{lang === 'en' ? 'Woman' : 'Femme'}</option>
                      <option value="Homme">{lang === 'en' ? 'Man' : 'Homme'}</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="quick-seeking" className="block text-xs text-stone-400 mb-1">
                      {t('landing.quick.seeking')}
                    </label>
                    <select
                      id="quick-seeking"
                      value={quickSeeking}
                      onChange={(e) => setQuickSeeking(e.target.value as 'Homme' | 'Femme' | 'Tous')}
                      className="w-full rounded-xl border border-white/12 bg-[#1C1413] px-3 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                    >
                      <option value="Homme">{lang === 'en' ? 'Man' : 'Homme'}</option>
                      <option value="Femme">{lang === 'en' ? 'Woman' : 'Femme'}</option>
                      <option value="Tous">{lang === 'en' ? 'Everyone' : 'Tous'}</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="quick-country" className="block text-xs text-stone-400 mb-1">
                      {t('landing.quick.country')}
                    </label>
                    <select
                      id="quick-country"
                      value={quickCountry}
                      onChange={(e) => setQuickCountry(e.target.value)}
                      className="w-full rounded-xl border border-white/12 bg-[#1C1413] px-3 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                    >
                      {countries.map((c) => (
                        <option key={c.name} value={c.name}>
                          {tCountry(c.name)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="zola-gradient zola-gradient-hover rounded-xl px-4 py-2.5 text-sm font-semibold text-white whitespace-nowrap shrink-0"
                  >
                    {t('landing.quick.start')}
                  </button>
                </div>
              </form>
            )}

            {previewProfiles.length > 0 && (
              <div
                className={`zola-card rounded-2xl p-6 space-y-4 ${
                  isAuthenticated ? 'lg:col-span-12' : 'lg:col-span-5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold text-white">{t('landing.recent.title')}</h3>
                  <button
                    type="button"
                    onClick={() => onNavigate(isAuthenticated ? 'discover' : 'register')}
                    className="text-xs font-medium text-amber-300 hover:underline"
                  >
                    {t('landing.recent.seeMore')}
                  </button>
                </div>
                <div className="space-y-3">
                  {previewProfiles.map((member) => (
                    <div
                      key={`${member.first_name}-${member.city}`}
                      className="flex items-center justify-between gap-3 border-t border-white/8 pt-3 first:border-t-0 first:pt-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={member.avatar_url}
                          alt={member.first_name}
                          referrerPolicy="no-referrer"
                          className="h-10 w-10 rounded-full object-cover shrink-0 border border-white/15"
                        />
                        <div className="min-w-0">
                          <p className="font-display text-sm font-semibold text-white truncate">
                            {member.first_name}, <span className="tabular-nums">{member.age}</span> {t('common.years')}
                          </p>
                          <p className="text-xs text-stone-400 truncate">
                            {member.city} · {tCountry(member.country)}
                            {member.is_verified ? ` · ${t('landing.recent.verified')}` : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigate(isAuthenticated ? 'discover' : 'register')}
                        aria-label={`${t('nav.discover')} ${member.first_name}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/5 text-orange-400 hover:bg-white/10 shrink-0"
                      >
                        <Heart className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Testimonials */}
      <section id="temoignages" className="border-t border-white/8 mx-auto max-w-7xl px-4 py-16 sm:px-8">
        <div className="max-w-2xl mb-10">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white" style={{ textWrap: 'balance' }}>
            {t('landing.testimonials.title')}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-stone-400">
            {t('landing.testimonials.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {testimonials.map((item, idx) => (
            <figure key={`${item.name}-${idx}`} className="zola-card rounded-2xl p-6 flex flex-col justify-between gap-5">
              <blockquote className="text-sm leading-relaxed text-stone-200">
                « {lang === 'en' ? item.quote_en || item.quote_fr : item.quote_fr} »
              </blockquote>
              <figcaption className="flex items-center gap-3 border-t border-white/8 pt-4">
                <img
                  src={item.photo}
                  alt={item.name}
                  referrerPolicy="no-referrer"
                  className="h-11 w-11 rounded-full object-cover shrink-0 border border-white/15"
                />
                <div className="min-w-0">
                  <p className="font-display text-sm font-bold text-white truncate">{item.name}</p>
                  <p className="text-xs text-stone-400 truncate">
                    {lang === 'en' ? item.location_en || item.location_fr : item.location_fr}
                  </p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Premium Pricing & SasPay */}
      <section id="tarifs" className="relative overflow-hidden border-y border-white/8 py-16">
        <img
          src={savannaBgUrl}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover opacity-20 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0909] via-[#0B0909]/80 to-[#0B0909] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-8">
          <div className="text-center mb-10 space-y-3">
            <Crown className="mx-auto h-10 w-10 text-amber-400 fill-amber-400 mb-2" aria-hidden="true" />
            <h2 className="font-display text-3xl font-extrabold text-amber-300">{premiumTitle}</h2>
            <p className="text-stone-300">{premiumSubtitle}</p>
            <p className="inline-flex flex-wrap items-center justify-center gap-1.5 text-xs text-stone-400 pt-1 text-center">
              <Lock className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
              <span>{premiumNote}</span>
            </p>
            {premiumBenefits.length > 0 && (
              <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-3 text-xs sm:text-sm text-stone-200">
                {premiumBenefits.map((b, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-amber-400 shrink-0" aria-hidden="true" />
                    <span>{lang === 'en' ? b.en || b.fr : b.fr}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-6 transition-transform ${
                  plan.is_popular
                    ? 'zola-card border-2 border-amber-400/80 shadow-xl shadow-orange-600/20'
                    : 'zola-card border border-white/10'
                }`}
              >
                <div className="text-center">
                  <p className="text-xs font-medium text-amber-300 min-h-[1rem]">
                    {plan.is_popular ? t('landing.pricing.popular') : ''}
                  </p>
                  <h3 className="mt-1 font-display text-lg font-bold text-white">{tPlanName(plan.name)}</h3>
                  <p className="mt-2 font-display text-2xl font-extrabold text-amber-300 tabular-nums">
                    {plan.price_fcfa.toLocaleString(locale)} FCFA
                  </p>
                </div>
                <ul className="mt-6 space-y-2.5 text-sm text-stone-300">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-orange-400 shrink-0" aria-hidden="true" />
                      <span>{tPlanFeature(f)}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => onNavigate(isAuthenticated ? 'premium' : 'register')}
                  className={`mt-6 w-full rounded-full py-2.5 text-sm font-semibold transition-colors whitespace-nowrap ${
                    plan.is_popular
                      ? 'zola-gradient zola-gradient-hover text-white shadow-lg shadow-orange-600/30'
                      : 'border border-white/15 bg-white/5 text-white hover:bg-white/10'
                  }`}
                >
                  {t('landing.pricing.payWithSaspay')}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-4xl px-4 py-16 sm:px-8">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-center text-white mb-8">
          {t('landing.faq.title')}
        </h2>
        <div className="space-y-3">
          {faqItems.map((item, idx) => (
            <div key={`${item.q_fr}-${idx}`} className="zola-card rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="flex w-full items-center justify-between px-6 py-4 text-left font-medium text-white hover:bg-white/5 transition-colors"
              >
                <span>{lang === 'en' ? item.q_en || item.q_fr : item.q_fr}</span>
                <ChevronDown
                  className={`h-5 w-5 text-orange-400 transition-transform shrink-0 ${
                    openFaq === idx ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaq === idx && (
                <div className="border-t border-white/8 px-6 py-4 text-sm text-stone-300 leading-relaxed">
                  {lang === 'en' ? item.a_en || item.a_fr : item.a_fr}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#160F0E] via-[#26120D] to-[#4A170D]">
          <div className="grid grid-cols-1 items-stretch lg:grid-cols-12">
            <div className="p-8 sm:p-12 lg:col-span-7 flex flex-col justify-center space-y-6">
              <h2
                className="font-display text-2xl sm:text-4xl font-extrabold text-white leading-tight"
                style={{ textWrap: 'balance' }}
              >
                {lang === 'en'
                  ? settings.cta_section_title_en || t('landing.cta.titlePrefix')
                  : settings.cta_section_title_fr || t('landing.cta.titlePrefix')}{' '}
                <span className="text-orange-400">
                  {lang === 'en'
                    ? settings.cta_section_highlight_en || t('landing.cta.titleHighlight')
                    : settings.cta_section_highlight_fr || t('landing.cta.titleHighlight')}
                </span>
              </h2>
              <p className="text-sm sm:text-base text-stone-300 max-w-xl">
                {lang === 'en'
                  ? settings.cta_section_subtitle_en || t('landing.cta.subtitle')
                  : settings.cta_section_subtitle_fr || t('landing.cta.subtitle')}
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => onNavigate(isAuthenticated ? 'discover' : 'register')}
                  className="zola-gradient zola-gradient-hover inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm sm:text-base font-semibold text-white shadow-xl shadow-orange-600/30 whitespace-nowrap"
                >
                  {isAuthenticated
                    ? t('landing.cta.btnAuth')
                    : lang === 'en'
                      ? settings.cta_section_btn_en || t('landing.cta.btnGuest')
                      : settings.cta_section_btn_fr || t('landing.cta.btnGuest')}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-2 min-h-[260px] lg:min-h-[320px] relative">
              <img
                src={ctaImg1}
                alt={brandName}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover object-top"
              />
              <img
                src={ctaImg2}
                alt={brandName}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover object-top"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#26120D] via-transparent to-transparent hidden lg:block" />
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="relative overflow-hidden border-t border-white/8 bg-[#090707]">
        <img
          src={savannaBgUrl}
          alt=""
          aria-hidden="true"
          className="absolute right-0 bottom-0 h-full w-1/2 object-cover opacity-15 pointer-events-none"
        />
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div className="space-y-3">
              <ZolaLogo />
              <p className="text-sm text-stone-300">
                {resolvedFooterSlogan}
              </p>
              <p className="text-xs text-stone-500">{resolvedFooterPayNote}</p>
            </div>

            {(
              [
                {
                  col: 'nav' as const,
                  title:
                    lang === 'en'
                      ? settings.footer_col_nav_en || t('landing.footer.nav')
                      : settings.footer_col_nav_fr || t('landing.footer.nav'),
                },
                {
                  col: 'legal' as const,
                  title:
                    lang === 'en'
                      ? settings.footer_col_legal_en || t('landing.footer.legal')
                      : settings.footer_col_legal_fr || t('landing.footer.legal'),
                },
                {
                  col: 'access' as const,
                  title:
                    lang === 'en'
                      ? settings.footer_col_access_en || t('landing.footer.access')
                      : settings.footer_col_access_fr || t('landing.footer.access'),
                },
              ]
            ).map(({ col, title }) => {
              const colLinks = footerLinks.filter((l) => l.column === col);
              return (
                <div key={col}>
                  <h4 className="font-display text-sm font-semibold text-white mb-3">{title}</h4>
                  <ul className="space-y-2 text-sm text-stone-400">
                    {colLinks.map((lk, idx) => {
                      const label = lang === 'en' ? lk.label_en || lk.label_fr : lk.label_fr;
                      if (lk.action === 'url') {
                        return (
                          <li key={`${lk.target}-${idx}`}>
                            <a
                              href={lk.target}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-white"
                            >
                              {label}
                            </a>
                          </li>
                        );
                      }
                      if (lk.action === 'route') {
                        const resolvedRoute =
                          isAuthenticated && lk.target === 'login'
                            ? 'discover'
                            : isAuthenticated && lk.target === 'register'
                              ? 'premium'
                              : (lk.target as AppRoute);
                        const resolvedLabel =
                          isAuthenticated && lk.target === 'login'
                            ? t('landing.footer.mySpace')
                            : isAuthenticated && lk.target === 'register'
                              ? t('landing.footer.manageSub')
                              : label;
                        return (
                          <li key={`${lk.target}-${idx}`}>
                            <button
                              type="button"
                              onClick={() => onNavigate(resolvedRoute)}
                              className="hover:text-white text-left"
                            >
                              {resolvedLabel}
                            </button>
                          </li>
                        );
                      }
                      return (
                        <li key={`${lk.target}-${idx}`}>
                          <button
                            type="button"
                            onClick={() => scrollToSection(lk.target)}
                            className="hover:text-white text-left"
                          >
                            {label}
                          </button>
                        </li>
                      );
                    })}
                    {col === 'access' && supportEmail && (
                      <li>
                        <a href={`mailto:${supportEmail}`} className="hover:text-white inline-flex items-center gap-1.5">
                          <MessageCircle className="h-3.5 w-3.5 text-orange-400" aria-hidden="true" />
                          {supportEmail}
                        </a>
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="mt-10 border-t border-white/8 pt-6 text-center text-xs text-stone-500">
            {resolvedFooterCopyright}
          </div>
        </div>
      </footer>
    </div>
  );
};
