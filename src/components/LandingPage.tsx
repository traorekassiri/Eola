import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Crown,
  Heart,
  MessageCircle,
  Play,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import heroCoupleImg from '../assets/images/zola_hero_couple_1794726544399.jpg';
import savannaImg from '../assets/images/zola_savanna_sunset_1794726545758.jpg';
import womanPortraitImg from '../assets/images/zola_portrait_woman_2_1794726546703.jpg';
import manPortraitImg from '../assets/images/zola_login_man_1794726545582.jpg';
import type { AppRoute, SiteSettings, SubscriptionPlan } from '../types';
import { ZolaLogo } from './ZolaLogo';

interface LandingPageProps {
  activeMembers: number;
  verifiedMembers: number;
  settings: SiteSettings;
  plans: SubscriptionPlan[];
  onNavigate: (route: AppRoute, sectionId?: string) => void;
  isAuthenticated: boolean;
}

const FAQ_ITEMS = [
  {
    q: 'Comment fonctionne la vérification des profils sur ZOLA ?',
    a: "Chaque membre peut demander une vérification de profil auprès de notre équipe de modération afin d'attester l'authenticité de son identité et renforcer la confiance au sein de la communauté.",
  },
  {
    q: 'ZOLA est-il disponible dans tous les pays africains ?',
    a: "Oui. ZOLA connecte les célibataires d'Afrique de l'Ouest, Centrale, de l'Est, du Nord et d'Afrique Australe ainsi que de la diaspora, avec des filtres précis par pays et par ville.",
  },
  {
    q: 'Comment fonctionne le système de Match ?',
    a: "Lorsque vous aimez un profil et que cette personne vous aime en retour, un Match mutuel est immédiatement créé et une conversation privée s'ouvre entre vous deux.",
  },
  {
    q: 'Quels moyens de paiement sont acceptés pour ZOLA Premium ?',
    a: 'Les abonnements Premium (1 mois, 3 mois ou 6 mois en FCFA) prennent en charge Mobile Money (Orange Money, Wave, Moov) et carte bancaire avec vérification serveur sécurisée.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  activeMembers,
  verifiedMembers,
  settings,
  plans,
  onNavigate,
  isAuthenticated,
}) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0B0909] text-stone-100">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#0B0909]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3.5 sm:px-8">
          <button
            type="button"
            onClick={() => scrollToSection('accueil')}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-lg"
          >
            <ZolaLogo />
          </button>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-300">
            <button type="button" onClick={() => scrollToSection('accueil')} className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              Accueil
            </button>
            <button
              type="button"
              onClick={() => onNavigate(isAuthenticated ? 'discover' : 'register')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Découvrir
            </button>
            <button type="button" onClick={() => scrollToSection('fonctionnalites')} className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              Fonctionnalités
            </button>
            <button type="button" onClick={() => scrollToSection('tarifs')} className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              Tarifs
            </button>
            <button type="button" onClick={() => scrollToSection('faq')} className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              FAQ
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => onNavigate('discover')}
                className="zola-gradient zola-gradient-hover rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-600/25 transition-all whitespace-nowrap shrink-0"
              >
                Mon espace
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-stone-200 hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
                >
                  Se connecter
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('register')}
                  className="zola-gradient zola-gradient-hover rounded-full px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-600/25 transition-all whitespace-nowrap shrink-0"
                >
                  S'inscrire
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="accueil" className="relative overflow-hidden border-b border-white/8">
        <div className="absolute inset-0 zola-ambient-glow pointer-events-none" />
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-14 sm:px-8 lg:grid-cols-12 lg:py-20">
          <div className="relative z-10 lg:col-span-6 space-y-6">
            <h1
              className="font-display font-extrabold tracking-tight text-white leading-[1.08]"
              style={{ fontSize: 'clamp(2.35rem, 4.4vw, 3.85rem)', textWrap: 'balance' }}
            >
              {settings.hero_title.includes('Afrique') ? (
                <>
                  {settings.hero_title.replace('Afrique', '')}
                  <span className="bg-gradient-to-r from-amber-300 via-orange-500 to-red-500 bg-clip-text text-transparent">
                    Afrique
                  </span>
                  <Heart className="inline-block ml-3 mb-2 h-8 w-8 fill-red-500 text-red-500" aria-hidden="true" />
                </>
              ) : (
                settings.hero_title
              )}
            </h1>

            <p className="max-w-xl text-base sm:text-lg leading-relaxed text-stone-300">
              {settings.hero_subtitle}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                type="button"
                onClick={() => onNavigate(isAuthenticated ? 'discover' : 'register')}
                className="zola-gradient zola-gradient-hover inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm sm:text-base font-semibold text-white shadow-xl shadow-orange-600/30 transition-transform active:scale-[0.98]"
              >
                {settings.hero_cta_primary || 'Créer un compte'}
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('pourquoi')}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-sm sm:text-base font-medium text-stone-200 hover:bg-white/10 transition-colors"
              >
                {settings.hero_cta_secondary || 'En savoir plus'}
                <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              </button>
            </div>

            {/* Real Database Member Counter */}
            <div className="flex items-center gap-4 pt-3">
              <div className="flex -space-x-2.5">
                <img
                  src={womanPortraitImg}
                  alt="Membre ZOLA"
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-[#0B0909]"
                />
                <img
                  src={manPortraitImg}
                  alt="Membre ZOLA"
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-[#0B0909]"
                />
                <img
                  src={heroCoupleImg}
                  alt="Membres ZOLA"
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-[#0B0909]"
                />
              </div>
              <div className="text-sm">
                <span className="font-display font-bold text-white tabular-nums">
                  {activeMembers} {activeMembers > 1 ? 'membres actifs' : 'membre actif'}
                </span>
                <span className="block text-xs text-stone-400 tabular-nums">
                  {verifiedMembers} profil{verifiedMembers > 1 ? 's' : ''} vérifié{verifiedMembers > 1 ? 's' : ''} dans la base
                </span>
              </div>
            </div>
          </div>

          <div className="relative lg:col-span-6">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#140F0E] shadow-2xl shadow-orange-950/40">
              <img
                src={heroCoupleImg}
                alt="Couple africain souriant sur ZOLA"
                className="h-[340px] w-full object-cover sm:h-[440px]"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B0909] via-transparent to-transparent opacity-70" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0B0909]/60 via-transparent to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* Pourquoi choisir ZOLA ? */}
      <section id="pourquoi" className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
        <div className="mb-10 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
            Pourquoi choisir ZOLA ?
          </h2>
          <p className="mt-2 text-sm sm:text-base text-stone-400">
            Une plateforme pensée pour des rencontres sincères, sécurisées et authentiques à travers le continent.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="zola-card rounded-2xl p-6 text-center transition-transform hover:-translate-y-1">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
              <Heart className="h-6 w-6 fill-orange-500 text-orange-500" />
            </div>
            <h3 className="font-display text-base font-semibold text-white">Profils vérifiés et sécurisés</h3>
            <p className="mt-2 text-sm text-stone-400">
              Contrôle rigoureux des membres et outils de signalement pour des échanges en toute confiance.
            </p>
          </div>

          <div className="zola-card rounded-2xl p-6 text-center transition-transform hover:-translate-y-1">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
              <ShieldCheck className="h-6 w-6 text-orange-500" />
            </div>
            <h3 className="font-display text-base font-semibold text-white">Rencontres en Afrique</h3>
            <p className="mt-2 text-sm text-stone-400">
              Explorez des profils à Ouagadougou, Abidjan, Dakar, Bamako, Douala ou partout sur le continent.
            </p>
          </div>

          <div className="zola-card rounded-2xl p-6 text-center transition-transform hover:-translate-y-1">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
              <Zap className="h-6 w-6 fill-amber-400 text-amber-400" />
            </div>
            <h3 className="font-display text-base font-semibold text-white">Connexion rapide</h3>
            <p className="mt-2 text-sm text-stone-400">
              Matchs instantanés et messagerie privée en temps réel avec partage de photos et accusés de lecture.
            </p>
          </div>

          <div className="zola-card rounded-2xl p-6 text-center transition-transform hover:-translate-y-1">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
              <Crown className="h-6 w-6 fill-amber-400 text-amber-400" />
            </div>
            <h3 className="font-display text-base font-semibold text-white">Fonctionnalités Premium</h3>
            <p className="mt-2 text-sm text-stone-400">
              Découvrez qui vous a liké, remontez votre profil et accédez aux filtres avancés en FCFA.
            </p>
          </div>
        </div>
      </section>

      {/* Fonctionnalités */}
      <section id="fonctionnalites" className="border-y border-white/8 bg-[#100C0B]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="zola-card rounded-2xl p-7">
              <Users className="h-7 w-7 text-orange-500 mb-4" />
              <h3 className="font-display text-lg font-bold text-white">Découverte ciblée</h3>
              <p className="mt-2 text-sm text-stone-400 leading-relaxed">
                Filtrez par pays, ville, tranche d'âge, genre et centres d'intérêt (voyage, musique, cuisine, entrepreneuriat) pour trouver des affinités réelles.
              </p>
            </div>
            <div className="zola-card rounded-2xl p-7">
              <Sparkles className="h-7 w-7 text-amber-400 mb-4" />
              <h3 className="font-display text-lg font-bold text-white">Match mutuel sans doublon</h3>
              <p className="mt-2 text-sm text-stone-400 leading-relaxed">
                Lorsque l'intérêt est réciproque, ZOLA déclenche instantanément un Match mutuel et ouvre votre espace de discussion privé.
              </p>
            </div>
            <div className="zola-card rounded-2xl p-7">
              <MessageCircle className="h-7 w-7 text-red-400 mb-4" />
              <h3 className="font-display text-lg font-bold text-white">Messagerie confidentielle</h3>
              <p className="mt-2 text-sm text-stone-400 leading-relaxed">
                Seuls les participants du Match accèdent à la conversation. Échangez des messages, émoticônes et photos en toute sérénité.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tarifs Premium */}
      <section id="tarifs" className="relative overflow-hidden py-16">
        <img
          src={savannaImg}
          alt="Paysage africain au coucher du soleil"
          className="absolute inset-0 h-full w-full object-cover opacity-20 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0909] via-[#0B0909]/75 to-[#0B0909] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-8">
          <div className="text-center mb-10">
            <Crown className="mx-auto h-10 w-10 text-amber-400 fill-amber-400 mb-3" />
            <h2 className="font-display text-3xl font-extrabold text-amber-300">Devenez Premium</h2>
            <p className="mt-2 text-stone-300">Profitez d'avantages exclusifs pour multiplier vos rencontres.</p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-6 transition-all ${
                  plan.is_popular
                    ? 'zola-card border-2 border-amber-400/80 shadow-xl shadow-orange-600/20'
                    : 'zola-card border border-white/10'
                }`}
              >
                {plan.is_popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-0.5 text-xs font-bold text-stone-950">
                    Populaire
                  </span>
                )}
                <div className="text-center">
                  <h3 className="font-display text-lg font-bold text-white">{plan.name}</h3>
                  <p className="mt-2 font-display text-2xl font-extrabold text-amber-300 tabular-nums">
                    {plan.price_fcfa.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
                <ul className="mt-6 space-y-2.5 text-sm text-stone-300">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-orange-400 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => onNavigate(isAuthenticated ? 'premium' : 'register')}
                  className={`mt-6 w-full rounded-full py-2.5 text-sm font-semibold transition-all ${
                    plan.is_popular
                      ? 'zola-gradient zola-gradient-hover text-white shadow-lg shadow-orange-600/30'
                      : 'border border-white/15 bg-white/5 text-white hover:bg-white/10'
                  }`}
                >
                  Souscrire maintenant
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-4xl px-4 py-16 sm:px-8">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-center text-white mb-8">
          Questions fréquentes
        </h2>
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, idx) => (
            <div key={item.q} className="zola-card rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="flex w-full items-center justify-between px-6 py-4 text-left font-medium text-white hover:bg-white/5 transition-colors"
              >
                <span>{item.q}</span>
                <ChevronDown
                  className={`h-5 w-5 text-orange-400 transition-transform ${openFaq === idx ? 'rotate-180' : ''}`}
                />
              </button>
              {openFaq === idx && (
                <div className="border-t border-white/8 px-6 py-4 text-sm text-stone-300 leading-relaxed">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA Section (matching bottom-right of mockup) */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#160F0E] via-[#26120D] to-[#4A170D]">
          <div className="grid grid-cols-1 items-center lg:grid-cols-12">
            <div className="p-8 sm:p-12 lg:col-span-7 space-y-6">
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-white leading-tight" style={{ textWrap: 'balance' }}>
                Rejoignez dès maintenant la plus grande communauté de{' '}
                <span className="text-orange-400">rencontres africaines</span>
              </h2>
              <button
                type="button"
                onClick={() => onNavigate(isAuthenticated ? 'discover' : 'register')}
                className="zola-gradient zola-gradient-hover inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm sm:text-base font-semibold text-white shadow-xl shadow-orange-600/30"
              >
                Créer mon compte
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="lg:col-span-5 h-64 lg:h-80 relative">
              <img
                src={heroCoupleImg}
                alt="Rejoignez ZOLA"
                className="h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#26120D] via-transparent to-transparent lg:block hidden" />
            </div>
          </div>
        </div>
      </section>

      {/* Footer (matching bottom-center of mockup) */}
      <footer className="relative overflow-hidden border-t border-white/8 bg-[#090707]">
        <img
          src={savannaImg}
          alt=""
          aria-hidden="true"
          className="absolute right-0 bottom-0 h-full w-1/2 object-cover opacity-20 pointer-events-none"
        />
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div className="space-y-3">
              <ZolaLogo />
              <p className="text-sm text-stone-300 flex items-center gap-1.5">
                {settings.footer_slogan || "Ensemble, trouvons l'amour"}
                <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" />
              </p>
            </div>

            <div>
              <h4 className="font-display text-sm font-semibold text-white mb-3">Liens utiles</h4>
              <ul className="space-y-2 text-sm text-stone-400">
                <li><button type="button" onClick={() => scrollToSection('accueil')} className="hover:text-white">Accueil</button></li>
                <li><button type="button" onClick={() => scrollToSection('pourquoi')} className="hover:text-white">À propos</button></li>
                <li><button type="button" onClick={() => scrollToSection('faq')} className="hover:text-white">FAQ</button></li>
                <li><button type="button" onClick={() => onNavigate('login')} className="hover:text-white">Connexion</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-display text-sm font-semibold text-white mb-3">Légal</h4>
              <ul className="space-y-2 text-sm text-stone-400">
                <li><button type="button" onClick={() => onNavigate('legal')} className="hover:text-white">Conditions d'utilisation</button></li>
                <li><button type="button" onClick={() => onNavigate('legal')} className="hover:text-white">Politique de confidentialité</button></li>
                <li><button type="button" onClick={() => onNavigate('legal')} className="hover:text-white">Sécurité & Modération</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-display text-sm font-semibold text-white mb-3">Suivez-nous</h4>
              <div className="flex items-center gap-3 text-sm text-stone-300">
                <a href="#accueil" className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10">Facebook</a>
                <a href="#accueil" className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10">Instagram</a>
                <a href="#accueil" className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10">X</a>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-white/8 pt-6 text-center text-xs text-stone-500">
            © 2026 ZOLA. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
};
