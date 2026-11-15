import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BadgeCheck,
  Bookmark,
  Crown,
  Heart,
  Lock,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
  Zap,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useI18n } from '../lib/i18n';
import type { Interest, UserProfile } from '../types';

interface DiscoverViewProps {
  currentUser: UserProfile;
  interests: Interest[];
  onViewProfile: (memberId: number) => void;
  onOpenChat: (conversationId: number) => void;
  onGoPremium: () => void;
  onFavoritesChanged?: (count: number) => void;
}

interface DiscoverCardProps {
  profile: UserProfile;
  onOpenProfile: (id: number) => void;
  onLike: (e: React.SyntheticEvent, target: UserProfile, isSuper?: boolean) => void;
  onPass: (e: React.SyntheticEvent, targetId: number) => void;
  onToggleFavorite: (e: React.SyntheticEvent, target: UserProfile) => void;
}

const DiscoverProfileCard: React.FC<DiscoverCardProps> = ({
  profile: p,
  onOpenProfile,
  onLike,
  onPass,
  onToggleFavorite,
}) => {
  const { t } = useI18n();
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState<'left' | 'right' | null>(null);
  const gestureRef = useRef<{ x: number; y: number; locked: boolean; cancelled: boolean } | null>(null);
  const justSwipedRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1 || exiting) return;
    const t = e.touches[0];
    gestureRef.current = { x: t.clientX, y: t.clientY, locked: false, cancelled: false };
    justSwipedRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const g = gestureRef.current;
    const t = e.touches[0];
    if (!g || g.cancelled || !t) return;
    const dx = t.clientX - g.x;
    const dy = t.clientY - g.y;

    if (!g.locked) {
      if (Math.abs(dy) > 12 && Math.abs(dy) >= Math.abs(dx)) {
        g.cancelled = true;
        return;
      }
      if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy)) {
        g.locked = true;
        setDragging(true);
      } else {
        return;
      }
    }

    const clamped = Math.max(-160, Math.min(160, dx));
    setDragX(clamped);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const g = gestureRef.current;
    gestureRef.current = null;
    if (!g || !g.locked) {
      setDragging(false);
      setDragX(0);
      return;
    }

    justSwipedRef.current = true;
    setDragging(false);

    if (dragX >= 85) {
      setExiting('right');
      setTimeout(() => {
        onLike(e, p, false);
        setExiting(null);
        setDragX(0);
      }, 180);
    } else if (dragX <= -85 && !p.liked_by_me) {
      setExiting('left');
      setTimeout(() => {
        onPass(e, p.id);
      }, 180);
    } else {
      setDragX(0);
    }
  };

  const swipeRatio = Math.min(1, Math.abs(dragX) / 90);
  const translateVal = exiting === 'right' ? 240 : exiting === 'left' ? -240 : dragX;
  const rotateVal = translateVal * 0.045;

  return (
    <article
      onClick={() => {
        if (justSwipedRef.current) {
          justSwipedRef.current = false;
          return;
        }
        onOpenProfile(p.id);
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translate3d(${translateVal}px, 0, 0) rotate(${rotateVal}deg)`,
        opacity: exiting ? 0 : 1,
        transition: dragging
          ? 'none'
          : 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease',
        touchAction: 'pan-y',
      }}
      className="group relative h-[410px] sm:h-84 cursor-pointer select-none overflow-hidden rounded-3xl border border-white/10 bg-[#140F0E] active:scale-[0.99] sm:hover:-translate-y-1 will-change-transform"
    >
      <img
        src={p.avatar_url}
        alt={p.full_name}
        referrerPolicy="no-referrer"
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 pointer-events-none"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />

      {/* Swipe Direction Stamp Feedback */}
      {dragX > 24 && (
        <div
          style={{ opacity: swipeRatio }}
          className="pointer-events-none absolute top-14 left-4 rounded-xl border-2 border-orange-400 bg-black/70 px-3 py-1 text-sm font-extrabold tracking-wider text-orange-300 -rotate-6"
        >
          {t('discover.stamp.like')}
        </div>
      )}
      {dragX < -24 && !p.liked_by_me && (
        <div
          style={{ opacity: swipeRatio }}
          className="pointer-events-none absolute top-14 right-4 rounded-xl border-2 border-stone-300 bg-black/70 px-3 py-1 text-sm font-extrabold tracking-wider text-stone-200 rotate-6"
        >
          {t('discover.stamp.pass')}
        </div>
      )}

      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {p.is_online && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-emerald-300 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {t('common.online')}
            </span>
          )}
          {p.is_boosted && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-bold text-stone-950 shadow">
              <Zap className="h-3 w-3 fill-stone-950" />
              {t('discover.boosted')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {p.is_verified && (
            <span
              title={t('common.verified')}
              className="flex h-10 w-10 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-black/55 text-sky-400 backdrop-blur-sm"
            >
              <BadgeCheck className="h-4 w-4" />
            </span>
          )}
          <button
            type="button"
            onClick={(e) => onToggleFavorite(e, p)}
            title={p.is_favorite ? t('discover.favRemove') : t('discover.favAdd')}
            aria-label={p.is_favorite ? `${t('discover.favRemove')} — ${p.first_name}` : `${t('discover.favAdd')} — ${p.first_name}`}
            className={`flex h-11 w-11 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full backdrop-blur-sm transition-all active:scale-90 ${
              p.is_favorite
                ? 'bg-amber-400 text-stone-950 shadow'
                : 'bg-black/55 text-stone-200 hover:bg-amber-400/90 hover:text-stone-950'
            }`}
          >
            <Bookmark className={`h-4 w-4 sm:h-3.5 sm:w-3.5 ${p.is_favorite ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      <div className="absolute bottom-3.5 left-3.5 right-3.5 flex items-end justify-between gap-2.5">
        <div className="min-w-0">
          <h2 className="font-display text-xl sm:text-lg font-bold text-white truncate">
            {p.first_name}, <span className="tabular-nums">{p.age}</span>
          </h2>
          <p className="text-xs text-stone-300 truncate">
            {p.city}, {p.country_code}
            {p.compatibility_score ? ` · ${t('discover.affinity', { score: p.compatibility_score })}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-1.5 shrink-0">
          {!p.liked_by_me && (
            <>
              <button
                type="button"
                onClick={(e) => onPass(e, p.id)}
                aria-label={`${t('discover.pass')} ${p.first_name}`}
                title={t('discover.pass')}
                className="flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-black/65 text-stone-200 border border-white/15 hover:border-white/40 hover:text-white active:scale-90 transition-all"
              >
                <X className="h-5 w-5 sm:h-4 sm:w-4" />
              </button>
              <button
                type="button"
                onClick={(e) => onLike(e, p, true)}
                aria-label={`${t('discover.superLike')} ${p.first_name}`}
                title={t('discover.superLike')}
                className="flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-black/65 text-amber-300 border border-amber-400/40 hover:bg-amber-400 hover:text-stone-950 active:scale-90 transition-all"
              >
                <Star className="h-5 w-5 sm:h-4 sm:w-4 fill-current" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={(e) => onLike(e, p, false)}
            aria-label={`${t('member.like')} ${p.first_name}`}
            className={`flex h-12 w-12 sm:h-11 sm:w-11 items-center justify-center rounded-full transition-all active:scale-90 shadow-lg ${
              p.is_super_liked
                ? 'bg-gradient-to-br from-amber-300 to-orange-500 text-stone-950 shadow-amber-500/40'
                : p.liked_by_me
                  ? 'zola-gradient text-white shadow-orange-600/40'
                  : 'bg-black/65 text-white border border-white/20 hover:border-orange-500 hover:bg-orange-600'
            }`}
          >
            {p.is_super_liked ? (
              <Star className="h-5 w-5 fill-current" />
            ) : (
              <Heart className={`h-5 w-5 ${p.liked_by_me ? 'fill-white' : ''}`} />
            )}
          </button>
        </div>
      </div>
    </article>
  );
};

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  currentUser,
  interests,
  onViewProfile,
  onOpenChat,
  onGoPremium,
  onFavoritesChanged,
}) => {
  const { t, tCountry, tInterest, countries } = useI18n();
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
  const [likeError, setLikeError] = useState('');

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
      } catch (err) {
        setLikeError(err instanceof Error ? err.message : 'Impossible de charger les profils.');
      } finally {
        setLoading(false);
      }
    },
    [search, country, city, gender, minAge, maxAge, interestId, verifiedOnly, sortMode]
  );

  const loadLikesMe = useCallback(async () => {
    try {
      const data = await apiFetch<{ locked: boolean; count: number; profiles: UserProfile[] }>('/api/likes/received');
      setLikesMe(data);
    } catch {
      // Ignore transient likes load error
    }
  }, []);

  useEffect(() => {
    loadProfiles(1, false);
    loadLikesMe();
  }, [loadProfiles, loadLikesMe]);

  const handleLike = async (e: React.SyntheticEvent, target: UserProfile, isSuper = false) => {
    e.stopPropagation();
    setLikeError('');
    try {
      const res = await apiFetch<{
        liked: boolean;
        is_super?: boolean;
        matched: boolean;
        conversationId: number | null;
        partner: UserProfile;
      }>(`/api/likes/${target.id}`, {
        method: 'POST',
        body: JSON.stringify({ is_super: isSuper }),
      });

      setProfiles((prev) =>
        prev.map((p) =>
          p.id === target.id
            ? {
                ...p,
                liked_by_me: true,
                is_super_liked: Boolean(res.is_super || p.is_super_liked),
                is_match: res.matched,
              }
            : p
        )
      );

      if (res.matched && res.conversationId) {
        setMatchModal({ partner: res.partner, conversationId: res.conversationId });
      }
    } catch (err) {
      setLikeError(err instanceof Error ? err.message : "Impossible d'envoyer cette réaction.");
    }
  };

  const handlePass = async (e: React.SyntheticEvent, targetId: number) => {
    e.stopPropagation();
    try {
      await apiFetch(`/api/passes/${targetId}`, { method: 'POST' });
      setProfiles((prev) => prev.filter((p) => p.id !== targetId));
      setPassedCount((c) => c + 1);
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      setLikeError(err instanceof Error ? err.message : 'Impossible de passer ce profil.');
    }
  };

  const handleResetPasses = async () => {
    try {
      await apiFetch('/api/passes', { method: 'DELETE' });
      loadProfiles(1, false);
    } catch (err) {
      setLikeError(err instanceof Error ? err.message : 'Impossible de réinitialiser les profils passés.');
    }
  };

  const handleBoost = async () => {
    try {
      const res = await apiFetch<{ message: string }>('/api/boost', { method: 'POST' });
      setBoostMsg(res.message);
      loadProfiles(1, false);
      setTimeout(() => setBoostMsg(''), 3500);
    } catch {
      onGoPremium();
    }
  };

  const handleToggleFavorite = async (e: React.SyntheticEvent, target: UserProfile) => {
    e.stopPropagation();
    try {
      const res = await apiFetch<{ ok: boolean; is_favorite: boolean; count: number; message: string }>(
        `/api/favorites/${target.id}`,
        { method: 'POST' }
      );
      setProfiles((prev) =>
        prev.map((p) => (p.id === target.id ? { ...p, is_favorite: res.is_favorite } : p))
      );
      onFavoritesChanged?.(res.count);
      setBoostMsg(res.message);
      setTimeout(() => setBoostMsg(''), 2500);
    } catch (err) {
      setLikeError(err instanceof Error ? err.message : 'Impossible de mettre à jour les favoris.');
    }
  };

  return (
    <div className="space-y-6 overflow-x-clip">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">{t('discover.title')}</h1>
          <p className="text-sm text-stone-400 tabular-nums">
            {total === 1
              ? t('discover.countSingular', { count: total })
              : t('discover.countPlural', { count: total })}
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
              {t('discover.tab.profiles')}
            </button>
            <button
              type="button"
              onClick={() => setTab('likes-me')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                tab === 'likes-me' ? 'zola-gradient text-white' : 'text-stone-300 hover:text-white'
              }`}
            >
              {t('discover.tab.likesMe', { count: likesMe.count })}
            </button>
          </div>

          {passedCount > 0 && tab === 'discover' && (
            <button
              type="button"
              onClick={handleResetPasses}
              title={t('discover.reviewPassedTitle')}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 py-2 text-xs text-stone-300 hover:bg-white/10"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t('discover.reviewPassed', { count: passedCount })}
            </button>
          )}

          <button
            type="button"
            onClick={handleBoost}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-amber-400/10 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-400/20"
          >
            <Zap className="h-3.5 w-3.5" />
            {t('discover.boost')}
          </button>
        </div>
      </div>

      {boostMsg && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          {boostMsg}
        </div>
      )}

      {likeError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-xs sm:text-sm text-amber-200">
          <span>{likeError}</span>
          {!currentUser.is_premium && (
            <button
              type="button"
              onClick={onGoPremium}
              className="shrink-0 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-stone-950"
            >
              {t('discover.goPremium')}
            </button>
          )}
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
                placeholder={t('discover.searchPlaceholder')}
                className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-stone-500 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as 'compatibility' | 'recent')}
              className="rounded-xl border border-white/10 bg-[#1B1413] px-4 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
            >
              <option value="compatibility">{t('discover.sort.compatibility')}</option>
              <option value="recent">{t('discover.sort.recent')}</option>
            </select>

            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="rounded-xl border border-white/10 bg-[#1B1413] px-4 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
            >
              <option value="Tous">{t('discover.gender.all')}</option>
              <option value="Femme">{t('discover.gender.women')}</option>
              <option value="Homme">{t('discover.gender.men')}</option>
            </select>

            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-medium text-stone-200 hover:bg-white/10"
            >
              <SlidersHorizontal className="h-4 w-4 text-orange-400" />
              {t('discover.filters')}
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 gap-3 border-t border-white/8 pt-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="block text-xs text-stone-400 mb-1">{t('discover.filter.country')}</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#1B1413] px-3 py-2 text-sm text-white"
                >
                  <option value="">{t('discover.filter.allCountries')}</option>
                  {countries.map((c) => (
                    <option key={c.name} value={c.name}>
                      {tCountry(c.name)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">{t('discover.filter.city')}</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t('discover.filter.cityPlaceholder')}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">
                  {t('discover.filter.age', { min: minAge, max: maxAge })}
                </label>
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
                <label className="block text-xs text-stone-400 mb-1">{t('discover.filter.interest')}</label>
                <select
                  value={interestId}
                  onChange={(e) => setInterestId(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-[#1B1413] px-3 py-2 text-sm text-white"
                >
                  <option value={0}>{t('discover.filter.allInterests')}</option>
                  {interests.map((i) => (
                    <option key={i.id} value={i.id}>
                      {tInterest(i.name)}
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
                  {t('discover.filter.verifiedOnly')}
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'discover' ? (
        loading && profiles.length === 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-[410px] sm:h-84 rounded-3xl bg-white/5 animate-pulse border border-white/8" />
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div className="zola-card rounded-3xl p-8 sm:p-10 text-center space-y-3">
            <Sparkles className="mx-auto h-8 w-8 text-orange-400" />
            <h3 className="font-display text-lg font-bold text-white">{t('discover.empty.title')}</h3>
            <p className="text-sm text-stone-400">{t('discover.empty.desc')}</p>
            <div className="flex flex-wrap justify-center gap-3 pt-1">
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
                className="min-h-[44px] rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-medium text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                {t('discover.empty.resetFilters')}
              </button>
              {passedCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetPasses}
                  className="min-h-[44px] zola-gradient rounded-full px-5 py-2 text-sm font-medium text-white active:scale-95 transition-transform"
                >
                  {t('discover.empty.reviewPassed')}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="sm:hidden text-xs text-stone-400 text-center">{t('discover.swipeHint')}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {profiles.map((p) => (
                <DiscoverProfileCard
                  key={p.id}
                  profile={p}
                  onOpenProfile={onViewProfile}
                  onLike={handleLike}
                  onPass={handlePass}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>

            {hasMore && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => loadProfiles(page + 1, true)}
                  className="min-h-[44px] rounded-full border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-medium text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  {t('discover.loadMore')}
                </button>
              </div>
            )}
          </div>
        )
      ) : likesMe.locked ? (
        <div className="zola-card rounded-3xl p-8 sm:p-10 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300">
            <Lock className="h-7 w-7" />
          </div>
          <h3 className="font-display text-xl font-bold text-white">
            {likesMe.count === 1
              ? t('discover.likesMe.lockedTitleOne')
              : t('discover.likesMe.lockedTitle', { count: likesMe.count })}
          </h3>
          <p className="mx-auto max-w-md text-sm text-stone-400">{t('discover.likesMe.lockedDesc')}</p>
          <button
            type="button"
            onClick={onGoPremium}
            className="min-h-[44px] zola-gradient zola-gradient-hover inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white active:scale-95 transition-transform"
          >
            <Crown className="h-4 w-4 fill-white" />
            {t('discover.likesMe.unlockBtn')}
          </button>
        </div>
      ) : likesMe.profiles.length === 0 ? (
        <div className="zola-card rounded-3xl p-10 text-center text-sm text-stone-400">
          {t('discover.likesMe.empty')}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {likesMe.profiles.map((p) => (
            <article
              key={p.id}
              onClick={() => onViewProfile(p.id)}
              className="group relative h-[360px] sm:h-72 cursor-pointer overflow-hidden rounded-3xl border border-white/10 bg-[#140F0E] active:scale-[0.985] transition-transform duration-150"
            >
              <img src={p.avatar_url} alt={p.full_name} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <div className="absolute bottom-3.5 left-3.5 right-3.5 flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-bold text-white truncate">
                    {p.first_name}, {p.age}
                  </h2>
                  <p className="text-xs text-stone-300 truncate">
                    {p.city}, {p.country_code}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleLike(e, p)}
                  aria-label={`${t('member.like')} ${p.first_name}`}
                  className="zola-gradient flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white active:scale-90 transition-transform"
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
                  {t('match.itsAMatch')} <span className="text-orange-400">{t('match.matchWord')}</span>{' '}
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
                {t('match.mutualWith', { name: matchModal.partner.first_name })}
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
                  {t('match.sendMessage')}
                </button>
                <button
                  type="button"
                  onClick={() => setMatchModal(null)}
                  className="w-full py-2 text-sm font-medium text-stone-300 hover:text-white"
                >
                  {t('match.keepDiscovering')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
