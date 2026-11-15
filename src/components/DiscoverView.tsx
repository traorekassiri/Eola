import React, { useCallback, useEffect, useState } from 'react';
import {
  BadgeCheck,
  Crown,
  Heart,
  Lock,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { AFRICAN_COUNTRIES, apiFetch } from '../lib/api';
import type { Interest, UserProfile } from '../types';

interface DiscoverViewProps {
  currentUser: UserProfile;
  interests: Interest[];
  onViewProfile: (memberId: number) => void;
  onOpenChat: (conversationId: number) => void;
  onGoPremium: () => void;
}

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  currentUser,
  interests,
  onViewProfile,
  onOpenChat,
  onGoPremium,
}) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [passedCount, setPassedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [gender, setGender] = useState('Tous');
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(60);
  const [interestId, setInterestId] = useState(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortMode, setSortMode] = useState<'compatibility' | 'recent'>('compatibility');

  const [tab, setTab] = useState<'discover' | 'likes-me'>('discover');
  const [likesMe, setLikesMe] = useState<{ locked: boolean; count: number; profiles: UserProfile[] }>({
    locked: true,
    count: 0,
    profiles: [],
  });
  const [boostMsg, setBoostMsg] = useState('');

  const [matchModal, setMatchModal] = useState<{
    partner: UserProfile;
    conversationId: number;
  } | null>(null);

  const loadProfiles = useCallback(
    async (pageToLoad = 1, append = false) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (country) params.set('country', country);
        if (city) params.set('city', city);
        if (gender && gender !== 'Tous') params.set('gender', gender);
        params.set('minAge', String(minAge));
        params.set('maxAge', String(maxAge));
        if (interestId > 0) params.set('interestId', String(interestId));
        if (verifiedOnly) params.set('verifiedOnly', '1');
        params.set('sort', sortMode);
        params.set('page', String(pageToLoad));
        params.set('limit', '12');

        const data = await apiFetch<{
          profiles: UserProfile[];
          total: number;
          page: number;
          hasMore: boolean;
          passed_count: number;
        }>(`/api/discover?${params.toString()}`);

        setProfiles((prev) => (append ? [...prev, ...data.profiles] : data.profiles));
        setTotal(data.total);
        setPage(data.page);
        setHasMore(data.hasMore);
        setPassedCount(data.passed_count);
      } finally {
        setLoading(false);
      }
    },
    [search, country, city, gender, minAge, maxAge, interestId, verifiedOnly, sortMode]
  );

  const loadLikesMe = useCallback(async () => {
    const data = await apiFetch<{ locked: boolean; count: number; profiles: UserProfile[] }>('/api/likes/received');
    setLikesMe(data);
  }, []);

  useEffect(() => {
    loadProfiles(1, false);
    loadLikesMe();
  }, [loadProfiles, loadLikesMe]);

  const handleLike = async (e: React.MouseEvent, target: UserProfile) => {
    e.stopPropagation();
    const res = await apiFetch<{
      liked: boolean;
      matched: boolean;
      conversationId: number | null;
      partner: UserProfile;
    }>(`/api/likes/${target.id}`, { method: 'POST' });

    setProfiles((prev) =>
      prev.map((p) => (p.id === target.id ? { ...p, liked_by_me: true, is_match: res.matched } : p))
    );

    if (res.matched && res.conversationId) {
      setMatchModal({ partner: res.partner, conversationId: res.conversationId });
    }
  };

  const handlePass = async (e: React.MouseEvent, targetId: number) => {
    e.stopPropagation();
    await apiFetch(`/api/passes/${targetId}`, { method: 'POST' });
    setProfiles((prev) => prev.filter((p) => p.id !== targetId));
    setPassedCount((c) => c + 1);
    setTotal((t) => Math.max(0, t - 1));
  };

  const handleResetPasses = async () => {
    await apiFetch('/api/passes', { method: 'DELETE' });
    loadProfiles(1, false);
  };

  const handleBoost = async () => {
    try {
      const res = await apiFetch<{ message: string }>('/api/boost', { method: 'POST' });
      setBoostMsg(res.message);
      setTimeout(() => setBoostMsg(''), 3500);
    } catch {
      onGoPremium();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">Découvrir</h1>
          <p className="text-sm text-stone-400 tabular-nums">
            {total} profil{total > 1 ? 's' : ''} correspondant{total > 1 ? 's' : ''} à vos critères.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setTab('discover')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                tab === 'discover' ? 'zola-gradient text-white' : 'text-stone-300 hover:text-white'
              }`}
            >
              Profils
            </button>
            <button
              type="button"
              onClick={() => setTab('likes-me')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                tab === 'likes-me' ? 'zola-gradient text-white' : 'text-stone-300 hover:text-white'
              }`}
            >
              Vous aiment ({likesMe.count})
            </button>
          </div>

          {passedCount > 0 && tab === 'discover' && (
            <button
              type="button"
              onClick={handleResetPasses}
              title="Revoir les profils passés"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 py-2 text-xs text-stone-300 hover:bg-white/10"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Revoir ({passedCount})
            </button>
          )}

          <button
            type="button"
            onClick={handleBoost}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-amber-400/10 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-400/20"
          >
            <Zap className="h-3.5 w-3.5" />
            Remonter mon profil
          </button>
        </div>
      </div>

      {boostMsg && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          {boostMsg}
        </div>
      )}

      {tab === 'discover' && (
        <div className="zola-card rounded-2xl p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par prénom, ville, profession..."
                className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-stone-500 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as 'compatibility' | 'recent')}
              className="rounded-xl border border-white/10 bg-[#1B1413] px-4 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
            >
              <option value="compatibility">Tri : Affinité</option>
              <option value="recent">Tri : Activité récente</option>
            </select>

            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="rounded-xl border border-white/10 bg-[#1B1413] px-4 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
            >
              <option value="Tous">Tous les genres</option>
              <option value="Femme">Femmes</option>
              <option value="Homme">Hommes</option>
            </select>

            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-medium text-stone-200 hover:bg-white/10"
            >
              <SlidersHorizontal className="h-4 w-4 text-orange-400" />
              Filtres
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 gap-3 border-t border-white/8 pt-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="block text-xs text-stone-400 mb-1">Pays</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#1B1413] px-3 py-2 text-sm text-white"
                >
                  <option value="">Tous les pays</option>
                  {AFRICAN_COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Ville</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex: Dakar, Abidjan..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Âge ({minAge} - {maxAge} ans)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={18}
                    max={99}
                    value={minAge}
                    onChange={(e) => setMinAge(Number(e.target.value) || 18)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-sm text-white tabular-nums"
                  />
                  <span className="text-stone-500">-</span>
                  <input
                    type="number"
                    min={18}
                    max={99}
                    value={maxAge}
                    onChange={(e) => setMaxAge(Number(e.target.value) || 60)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-sm text-white tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Centre d'intérêt</label>
                <select
                  value={interestId}
                  onChange={(e) => setInterestId(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-[#1B1413] px-3 py-2 text-sm text-white"
                >
                  <option value={0}>Tous</option>
                  {interests.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="inline-flex items-center gap-2 text-sm text-stone-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="h-4 w-4 accent-orange-500"
                  />
                  Profils vérifiés
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'discover' ? (
        loading && profiles.length === 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-80 rounded-3xl bg-white/5 animate-pulse border border-white/8" />
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div className="zola-card rounded-3xl p-10 text-center space-y-3">
            <Sparkles className="mx-auto h-8 w-8 text-orange-400" />
            <h3 className="font-display text-lg font-bold text-white">Aucun profil trouvé</h3>
            <p className="text-sm text-stone-400">
              Ajustez vos filtres ou réinitialisez les profils passés pour découvrir d'autres membres.
            </p>
            <div className="flex justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setCountry('');
                  setCity('');
                  setGender('Tous');
                  setMinAge(18);
                  setMaxAge(60);
                  setInterestId(0);
                  setVerifiedOnly(false);
                }}
                className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-medium text-white hover:bg-white/10"
              >
                Réinitialiser les filtres
              </button>
              {passedCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetPasses}
                  className="zola-gradient rounded-full px-5 py-2 text-sm font-medium text-white"
                >
                  Revoir les profils passés
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {profiles.map((p) => (
                <article
                  key={p.id}
                  onClick={() => onViewProfile(p.id)}
                  className="group relative h-76 sm:h-84 cursor-pointer overflow-hidden rounded-3xl border border-white/10 bg-[#140F0E] transition-transform hover:-translate-y-1"
                >
                  <img
                    src={p.avatar_url}
                    alt={p.full_name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />

                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    {p.is_online ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-emerald-300 backdrop-blur-sm">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        En ligne
                      </span>
                    ) : (
                      <span />
                    )}
                    {p.is_verified && (
                      <span
                        title="Profil vérifié"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-sky-400 backdrop-blur-sm"
                      >
                        <BadgeCheck className="h-4 w-4" />
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="font-display text-lg font-bold text-white truncate">
                        {p.first_name}, <span className="tabular-nums">{p.age}</span>
                      </h2>
                      <p className="text-xs text-stone-300 truncate">
                        {p.city}, {p.country_code}
                        {p.compatibility_score ? ` · ${p.compatibility_score}% affinité` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!p.liked_by_me && (
                        <button
                          type="button"
                          onClick={(e) => handlePass(e, p.id)}
                          aria-label={`Passer ${p.first_name}`}
                          title="Passer"
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/65 text-stone-300 border border-white/15 hover:border-white/40 hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleLike(e, p)}
                        aria-label={`Aimer ${p.first_name}`}
                        className={`flex h-11 w-11 items-center justify-center rounded-full transition-all shadow-lg ${
                          p.liked_by_me
                            ? 'zola-gradient text-white shadow-orange-600/40'
                            : 'bg-black/65 text-white border border-white/20 hover:border-orange-500 hover:bg-orange-600'
                        }`}
                      >
                        <Heart className={`h-5 w-5 ${p.liked_by_me ? 'fill-white' : ''}`} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {hasMore && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => loadProfiles(page + 1, true)}
                  className="rounded-full border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-medium text-white hover:bg-white/10"
                >
                  Charger plus de profils
                </button>
              </div>
            )}
          </div>
        )
      ) : likesMe.locked ? (
        <div className="zola-card rounded-3xl p-10 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300">
            <Lock className="h-7 w-7" />
          </div>
          <h3 className="font-display text-xl font-bold text-white">
            {likesMe.count} personne{likesMe.count > 1 ? 's' : ''} vous {likesMe.count > 1 ? 'ont' : 'a'} liké
          </h3>
          <p className="mx-auto max-w-md text-sm text-stone-400">
            Passez à ZOLA Premium pour découvrir immédiatement qui s'intéresse à votre profil et créer un Match sans attendre.
          </p>
          <button
            type="button"
            onClick={onGoPremium}
            className="zola-gradient zola-gradient-hover inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white"
          >
            <Crown className="h-4 w-4 fill-white" />
            Voir avec ZOLA Premium
          </button>
        </div>
      ) : likesMe.profiles.length === 0 ? (
        <div className="zola-card rounded-3xl p-10 text-center text-sm text-stone-400">
          Personne n'a encore liké votre profil pour le moment.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {likesMe.profiles.map((p) => (
            <article
              key={p.id}
              onClick={() => onViewProfile(p.id)}
              className="group relative h-72 cursor-pointer overflow-hidden rounded-3xl border border-white/10 bg-[#140F0E]"
            >
              <img src={p.avatar_url} alt={p.full_name} className="h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                <div>
                  <h2 className="font-display text-lg font-bold text-white">
                    {p.first_name}, {p.age}
                  </h2>
                  <p className="text-xs text-stone-300">
                    {p.city}, {p.country_code}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleLike(e, p)}
                  className="zola-gradient flex h-11 w-11 items-center justify-center rounded-full text-white"
                >
                  <Heart className="h-5 w-5 fill-white" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {matchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-orange-500/30 bg-[#140E0D] p-8 text-center shadow-2xl shadow-orange-600/30">
            <div className="pointer-events-none absolute inset-0 zola-ambient-glow" />
            <div className="relative z-10 space-y-6">
              <div>
                <p className="font-display text-3xl sm:text-4xl font-extrabold text-white">
                  C'est un <span className="text-orange-400">Match !</span>{' '}
                  <Heart className="inline-block h-7 w-7 fill-red-500 text-red-500 mb-1" />
                </p>
              </div>

              <div className="relative flex items-center justify-center py-2">
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.first_name}
                  className="h-28 w-28 rounded-full object-cover border-4 border-orange-500 shadow-lg -mr-3"
                />
                <div className="z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-xl animate-pulse">
                  <Heart className="h-6 w-6 fill-red-500 text-red-500" />
                </div>
                <img
                  src={matchModal.partner.avatar_url}
                  alt={matchModal.partner.first_name}
                  className="h-28 w-28 rounded-full object-cover border-4 border-orange-500 shadow-lg -ml-3"
                />
              </div>

              <p className="text-sm text-stone-200">
                Vous vous plaisez mutuellement !
                <br />
                Envoyez-lui un message pour briser la glace.
              </p>

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const convId = matchModal.conversationId;
                    setMatchModal(null);
                    onOpenChat(convId);
                  }}
                  className="zola-gradient zola-gradient-hover w-full rounded-full py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-600/30"
                >
                  Envoyer un message
                </button>
                <button
                  type="button"
                  onClick={() => setMatchModal(null)}
                  className="w-full py-2 text-sm font-medium text-stone-300 hover:text-white"
                >
                  Continuer à découvrir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
