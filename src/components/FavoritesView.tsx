import React, { useCallback, useEffect, useState } from 'react';
import {
  BadgeCheck,
  Bookmark,
  BookmarkX,
  Compass,
  Heart,
  MapPin,
  MessageCircle,
  Search,
  Sparkles,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useI18n } from '../lib/i18n';
import type { UserProfile } from '../types';

interface FavoritesViewProps {
  onViewProfile: (memberId: number) => void;
  onOpenChat: (conversationId: number) => void;
  onBrowseDiscover: () => void;
  onFavoritesChanged: (count: number) => void;
  onMatched: (partner: UserProfile, conversationId: number) => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  onViewProfile,
  onOpenChat,
  onBrowseDiscover,
  onFavoritesChanged,
  onMatched,
}) => {
  const { t } = useI18n();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState('');

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ profiles: UserProfile[]; count: number }>('/api/favorites');
      setProfiles(data.profiles);
      onFavoritesChanged(data.count);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Impossible de charger les favoris.');
    } finally {
      setLoading(false);
    }
  }, [onFavoritesChanged]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const handleRemoveFavorite = async (e: React.MouseEvent, target: UserProfile) => {
    e.stopPropagation();
    try {
      const res = await apiFetch<{ ok: boolean; count: number; message: string }>(
        `/api/favorites/${target.id}`,
        { method: 'DELETE' }
      );
      setProfiles((prev) => prev.filter((p) => p.id !== target.id));
      onFavoritesChanged(res.count);
      setFeedback(t('fav.removedMsg', { name: target.first_name }));
      setTimeout(() => setFeedback(''), 3000);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : t('common.back'));
    }
  };

  const handleLikeOrMessage = async (e: React.MouseEvent, target: UserProfile) => {
    e.stopPropagation();
    if (target.is_match) {
      try {
        const convs = await apiFetch<{ conversations: Array<{ id: number; partner: { id: number } }> }>(
          '/api/messages/conversations'
        );
        const found = convs.conversations.find((c) => c.partner.id === target.id);
        if (found) {
          onOpenChat(found.id);
          return;
        }
      } catch {
        // Fallback to profile view
      }
      onViewProfile(target.id);
      return;
    }

    try {
      const res = await apiFetch<{
        liked: boolean;
        matched: boolean;
        conversationId: number | null;
        partner: UserProfile;
      }>(`/api/likes/${target.id}`, {
        method: 'POST',
        body: JSON.stringify({ is_super: false }),
      });

      setProfiles((prev) =>
        prev.map((p) =>
          p.id === target.id ? { ...p, liked_by_me: true, is_match: res.matched } : p
        )
      );
      if (res.matched && res.conversationId) {
        onMatched(res.partner, res.conversationId);
      } else {
        setFeedback(t('fav.likedMsg', { name: target.first_name }));
        setTimeout(() => setFeedback(''), 3000);
      }
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : t('fav.sendLike'));
    }
  };

  const filtered = profiles.filter((p) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return `${p.full_name} ${p.city} ${p.country} ${p.profession}`.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Bookmark className="h-7 w-7 text-amber-400 fill-amber-400/25" />
            {t('fav.title')}
          </h1>
          <p className="text-sm text-stone-400 tabular-nums">
            {profiles.length > 1
              ? t('fav.savedPlural', { count: profiles.length })
              : t('fav.savedSingular', { count: profiles.length })}
          </p>
        </div>

        <button
          type="button"
          onClick={onBrowseDiscover}
          className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-xs sm:text-sm font-medium text-stone-200 hover:bg-white/10"
        >
          <Compass className="h-4 w-4 text-orange-400" />
          {t('fav.browseDiscover')}
        </button>
      </div>

      {feedback && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-200">
          {feedback}
        </div>
      )}

      {profiles.length > 0 && (
        <div className="zola-card rounded-2xl p-3 sm:p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('fav.searchPlaceholder')}
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-stone-500 focus:border-orange-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-[360px] sm:h-80 rounded-3xl bg-white/5 animate-pulse border border-white/8" />
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <div className="zola-card rounded-3xl p-8 sm:p-10 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300">
            <Bookmark className="h-7 w-7" />
          </div>
          <h2 className="font-display text-xl font-bold text-white">{t('fav.empty.title')}</h2>
          <p className="mx-auto max-w-md text-sm text-stone-400">
            {t('fav.empty.desc')}
          </p>
          <button
            type="button"
            onClick={onBrowseDiscover}
            className="min-h-[44px] zola-gradient zola-gradient-hover inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white active:scale-95 transition-transform"
          >
            <Sparkles className="h-4 w-4" />
            {t('fav.empty.cta')}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="zola-card rounded-3xl p-8 text-center text-sm text-stone-400">
          {t('fav.noMatch', { query: search })}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <article
              key={p.id}
              onClick={() => onViewProfile(p.id)}
              className="group relative h-[360px] sm:h-80 cursor-pointer select-none overflow-hidden rounded-3xl border border-white/10 bg-[#140F0E] transition-transform duration-200 active:scale-[0.985] sm:hover:-translate-y-1"
            >
              <img
                src={p.avatar_url}
                alt={p.full_name}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />

              <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {p.is_online && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-emerald-300 backdrop-blur-sm">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      {t('common.online')}
                    </span>
                  )}
                  {p.is_verified && (
                    <span
                      title={t('common.verified')}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-sky-400 backdrop-blur-sm"
                    >
                      <BadgeCheck className="h-4 w-4" />
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={(e) => handleRemoveFavorite(e, p)}
                  title={t('discover.favRemove')}
                  aria-label={t('discover.favRemove')}
                  className="flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-amber-400/90 text-stone-950 shadow hover:bg-red-500 hover:text-white active:scale-90 transition-all"
                >
                  <BookmarkX className="h-4 w-4" />
                </button>
              </div>

              <div className="absolute bottom-3.5 left-3.5 right-3.5 flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-display text-xl sm:text-lg font-bold text-white truncate">
                    {p.first_name}, <span className="tabular-nums">{p.age}</span>
                  </h2>
                  <p className="flex items-center gap-1 text-xs text-stone-300 truncate">
                    <MapPin className="h-3 w-3 shrink-0 text-orange-400" />
                    {p.city}, {p.country_code}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleLikeOrMessage(e, p)}
                  title={p.is_match ? t('fav.sendMessage') : p.liked_by_me ? t('fav.alreadyLiked') : t('fav.sendLike')}
                  aria-label={p.is_match ? t('fav.sendMessage') : t('fav.sendLike')}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all active:scale-90 shadow-lg ${
                    p.is_match || p.liked_by_me
                      ? 'zola-gradient text-white shadow-orange-600/40'
                      : 'bg-black/65 text-white border border-white/20 hover:border-orange-500 hover:bg-orange-600'
                  }`}
                >
                  {p.is_match ? (
                    <MessageCircle className="h-4 w-4" />
                  ) : (
                    <Heart className={`h-4 w-4 ${p.liked_by_me ? 'fill-white' : ''}`} />
                  )}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
