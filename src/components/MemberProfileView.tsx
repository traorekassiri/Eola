import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  Bookmark,
  Briefcase,
  Flag,
  Heart,
  MapPin,
  MessageCircle,
  Ruler,
  ShieldAlert,
  Sparkles,
  Star,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useI18n } from '../lib/i18n';
import type { ConversationSummary, UserProfile } from '../types';

interface MemberProfileViewProps {
  memberId: number;
  isOwnProfile?: boolean;
  onBack: () => void;
  onEditOwn?: () => void;
  onOpenChat: (conversationId: number) => void;
  onMatched: (partner: UserProfile, conversationId: number) => void;
  onBlocked?: (blockedUserId: number, conversations?: ConversationSummary[]) => void;
  onFavoritesChanged?: (count: number) => void;
}

export const MemberProfileView: React.FC<MemberProfileViewProps> = ({
  memberId,
  isOwnProfile = false,
  onBack,
  onEditOwn,
  onOpenChat,
  onMatched,
  onBlocked,
  onFavoritesChanged,
}) => {
  const { t, tCountry, tZodiac, tInterest, tReportReason, reportReasons } = useI18n();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activePhoto, setActivePhoto] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState(reportReasons[0]?.fr || 'Profil suspect ou faux');
  const [reportDetails, setReportDetails] = useState('');
  const [blockOpen, setBlockOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [photoSwipeX, setPhotoSwipeX] = useState(0);
  const photoTouchRef = useRef<{ x: number; y: number; locked: boolean; cancelled: boolean } | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch<{ profile: UserProfile }>(`/api/users/${memberId}`)
      .then((d) => {
        setProfile(d.profile);
        setActivePhoto(d.profile.avatar_url);
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [memberId]);

  const photoUrls = profile
    ? profile.photos.length > 0
      ? profile.photos.map((ph) => ph.photo_url)
      : [profile.avatar_url]
    : [];
  const activeIdx = Math.max(0, photoUrls.indexOf(activePhoto || profile?.avatar_url || ''));

  const handlePhotoTouchStart = (e: React.TouchEvent) => {
    if (photoUrls.length <= 1 || e.touches.length !== 1) return;
    const t = e.touches[0];
    photoTouchRef.current = { x: t.clientX, y: t.clientY, locked: false, cancelled: false };
  };

  const handlePhotoTouchMove = (e: React.TouchEvent) => {
    const g = photoTouchRef.current;
    const t = e.touches[0];
    if (!g || g.cancelled || !t) return;
    const dx = t.clientX - g.x;
    const dy = t.clientY - g.y;
    if (!g.locked) {
      if (Math.abs(dy) > 12 && Math.abs(dy) >= Math.abs(dx)) {
        g.cancelled = true;
        return;
      }
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) {
        g.locked = true;
      } else {
        return;
      }
    }
    setPhotoSwipeX(Math.max(-90, Math.min(90, dx)));
  };

  const handlePhotoTouchEnd = () => {
    const g = photoTouchRef.current;
    photoTouchRef.current = null;
    if (g?.locked && photoUrls.length > 1) {
      if (photoSwipeX <= -45 && activeIdx < photoUrls.length - 1) {
        setActivePhoto(photoUrls[activeIdx + 1]);
      } else if (photoSwipeX >= 45 && activeIdx > 0) {
        setActivePhoto(photoUrls[activeIdx - 1]);
      }
    }
    setPhotoSwipeX(0);
  };

  const handleLike = async (isSuper = false) => {
    if (!profile) return;
    try {
      const res = await apiFetch<{
        liked: boolean;
        is_super?: boolean;
        matched: boolean;
        conversationId: number | null;
        partner: UserProfile;
      }>(`/api/likes/${profile.id}`, {
        method: 'POST',
        body: JSON.stringify({ is_super: isSuper }),
      });

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              liked_by_me: true,
              is_super_liked: Boolean(res.is_super || prev.is_super_liked),
              is_match: res.matched,
            }
          : prev
      );
      if (res.matched && res.conversationId) {
        onMatched(res.partner, res.conversationId);
      } else {
        setFeedback(
          isSuper
            ? t('member.superLikeSent', { name: profile.first_name })
            : t('member.likeSent', { name: profile.first_name })
        );
      }
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : t('common.loading'));
    }
  };

  const handleStartMessage = async () => {
    if (!profile) return;
    if (profile.is_match) {
      try {
        const convs = await apiFetch<{ conversations: Array<{ id: number; partner: { id: number } }> }>(
          '/api/messages/conversations'
        );
        const found = convs.conversations.find((c) => c.partner.id === profile.id);
        if (found) {
          onOpenChat(found.id);
          return;
        }
      } catch (err) {
        setFeedback(err instanceof Error ? err.message : 'Impossible d’ouvrir la conversation.');
        return;
      }
    }
    setFeedback(t('member.matchFirstHint'));
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      const res = await apiFetch<{ message: string }>(`/api/users/${profile.id}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason: reportReason, details: reportDetails }),
      });
      setReportOpen(false);
      setFeedback(res.message);
    } catch (err) {
      setReportOpen(false);
      setFeedback(err instanceof Error ? err.message : 'Impossible d’envoyer le signalement.');
    }
  };

  const handleBlock = async () => {
    if (!profile || blocking) return;
    setBlocking(true);
    try {
      const res = await apiFetch<{
        ok: boolean;
        message: string;
        blocked_user_id: number;
        conversations?: ConversationSummary[];
      }>(`/api/users/${profile.id}/block`, { method: 'POST' });
      setBlockOpen(false);
      onBlocked?.(profile.id, res.conversations);
      onBack();
    } catch (err) {
      setBlockOpen(false);
      setFeedback(err instanceof Error ? err.message : 'Impossible de bloquer ce profil.');
    } finally {
      setBlocking(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!profile) return;
    try {
      const res = await apiFetch<{ ok: boolean; is_favorite: boolean; count: number; message: string }>(
        `/api/favorites/${profile.id}`,
        { method: 'POST' }
      );
      setProfile((prev) => (prev ? { ...prev, is_favorite: res.is_favorite } : prev));
      onFavoritesChanged?.(res.count);
      setFeedback(res.message);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Impossible de mettre à jour les favoris.');
    }
  };

  if (loading) {
    return <div className="h-96 rounded-3xl bg-white/5 animate-pulse" />;
  }

  if (!profile) {
    return (
      <div className="zola-card rounded-3xl p-8 text-center space-y-3">
        <p className="text-stone-300">{t('member.notFound')}</p>
        <button type="button" onClick={onBack} className="text-orange-400 underline text-sm">
          {t('common.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {feedback && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-200">
          {feedback}
        </div>
      )}

      <div className="zola-card overflow-hidden rounded-3xl grid grid-cols-1 md:grid-cols-12">
        {/* Photo & Gallery Column with Touch Swipe */}
        <div
          onTouchStart={handlePhotoTouchStart}
          onTouchMove={handlePhotoTouchMove}
          onTouchEnd={handlePhotoTouchEnd}
          style={{ touchAction: 'pan-y' }}
          className="md:col-span-6 relative bg-[#140F0E] overflow-hidden select-none"
        >
          <img
            src={activePhoto || profile.avatar_url}
            alt={profile.full_name}
            referrerPolicy="no-referrer"
            style={{
              transform: `translate3d(${photoSwipeX * 0.35}px, 0, 0)`,
              transition: photoSwipeX === 0 ? 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
            }}
            className="h-[420px] md:h-full w-full object-cover min-h-[380px] will-change-transform"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/35" />

          {photoUrls.length > 1 && (
            <div className="absolute top-2.5 left-4 right-4 flex gap-1.5 z-10">
              {photoUrls.map((url, idx) => (
                <button
                  key={url}
                  type="button"
                  aria-label={`Photo ${idx + 1}`}
                  onClick={() => setActivePhoto(url)}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    idx === activeIdx ? 'bg-amber-400' : 'bg-white/30'
                  }`}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={onBack}
            aria-label={t('common.back')}
            className="absolute top-6 left-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/80 active:scale-90 transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          {!isOwnProfile && (
            <div className="absolute top-6 right-4 flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleFavorite}
                title={profile.is_favorite ? t('discover.favRemove') : t('discover.favAdd')}
                aria-label={profile.is_favorite ? t('discover.favRemove') : t('discover.favAdd')}
                className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-md active:scale-90 transition-all ${
                  profile.is_favorite
                    ? 'bg-amber-400 text-stone-950 shadow-lg'
                    : 'bg-black/60 text-stone-200 hover:bg-amber-400/90 hover:text-stone-950'
                }`}
              >
                <Bookmark className={`h-4 w-4 ${profile.is_favorite ? 'fill-current' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                title={t('member.report')}
                aria-label={t('member.report')}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-stone-200 backdrop-blur-md hover:bg-black/80 active:scale-90 transition-all"
              >
                <Flag className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setBlockOpen(true)}
                title={t('member.block')}
                aria-label={t('member.block')}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-red-300 backdrop-blur-md hover:bg-red-900/70 active:scale-90 transition-all"
              >
                <ShieldAlert className="h-4 w-4" />
              </button>
            </div>
          )}

          {profile.photos.length > 1 && (
            <div className="absolute bottom-4 left-4 right-4 flex gap-2 overflow-x-auto pb-1">
              {profile.photos.map((ph) => (
                <button
                  key={ph.id}
                  type="button"
                  onClick={() => setActivePhoto(ph.photo_url)}
                  className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 active:scale-95 transition-all ${
                    activePhoto === ph.photo_url ? 'border-orange-500 scale-105' : 'border-white/25 opacity-75'
                  }`}
                >
                  <img src={ph.photo_url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details Column matching middle-right of mockup */}
        <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-display text-3xl font-extrabold text-white">
                  {profile.first_name}, <span className="tabular-nums">{profile.age}</span>
                </h1>
                {profile.is_verified && <BadgeCheck className="h-6 w-6 text-sky-400" />}
                {profile.is_online && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    {t('common.online')}
                  </span>
                )}
              </div>

              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-stone-300">
                <MapPin className="h-4 w-4 text-orange-400" />
                {profile.city}, {tCountry(profile.country)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-stone-300 border-y border-white/8 py-3">
              {profile.profession && (
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-orange-400" />
                  {profile.profession}
                </span>
              )}
              {profile.height_cm && (
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <Ruler className="h-4 w-4 text-amber-400" />
                  {(profile.height_cm / 100).toFixed(2).replace('.', 'm')}
                </span>
              )}
              {profile.zodiac_sign && (
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-red-400" />
                  {t('member.sign', { sign: tZodiac(profile.zodiac_sign) })}
                </span>
              )}
            </div>

            <div>
              <h2 className="font-display text-sm font-bold text-white mb-2">{t('member.aboutMe')}</h2>
              <p className="text-sm leading-relaxed text-stone-300">
                {profile.bio || t('member.noBio')}
              </p>
            </div>

            {profile.interests.length > 0 && (
              <div>
                <h2 className="font-display text-sm font-bold text-white mb-2.5">{t('member.interests')}</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((i) => (
                    <span
                      key={i.id}
                      className="rounded-full border border-white/12 bg-white/5 px-3.5 py-1 text-xs font-medium text-stone-200"
                    >
                      {tInterest(i.name)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {isOwnProfile ? (
            <button
              type="button"
              onClick={onEditOwn}
              className="min-h-[48px] zola-gradient zola-gradient-hover w-full rounded-full py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-600/25 active:scale-[0.98] transition-transform"
            >
              {t('member.editOwn')}
            </button>
          ) : (
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleStartMessage}
                  className="min-h-[48px] zola-gradient zola-gradient-hover flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 rounded-full py-3 px-4 text-sm font-semibold text-white shadow-lg shadow-orange-600/25 active:scale-[0.98] transition-transform"
                >
                  <MessageCircle className="h-4 w-4" />
                  {t('member.sendMessage')}
                </button>
                <button
                  type="button"
                  onClick={() => handleLike(false)}
                  className={`min-h-[48px] inline-flex items-center justify-center gap-2 rounded-full border py-3 px-5 text-sm font-semibold active:scale-95 transition-all ${
                    profile.liked_by_me
                      ? 'border-red-500/40 bg-red-500/15 text-red-300'
                      : 'border-white/15 bg-white/5 text-white hover:bg-white/10'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${profile.liked_by_me ? 'fill-red-500 text-red-500' : 'text-red-400'}`} />
                  {profile.liked_by_me ? t('member.liked') : t('member.like')}
                </button>
                {!profile.liked_by_me && (
                  <button
                    type="button"
                    onClick={() => handleLike(true)}
                    title={t('member.superLikeTitle')}
                    className="min-h-[48px] inline-flex items-center justify-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/15 py-3 px-4 text-sm font-semibold text-amber-300 hover:bg-amber-400 hover:text-stone-950 active:scale-95 transition-all"
                  >
                    <Star className="h-4 w-4 fill-current" />
                    {t('member.superLike')}
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-3 text-xs">
                <button
                  type="button"
                  onClick={handleToggleFavorite}
                  className={`min-h-[40px] inline-flex items-center gap-1.5 font-medium transition-colors ${
                    profile.is_favorite ? 'text-amber-300' : 'text-stone-300 hover:text-amber-300'
                  }`}
                >
                  <Bookmark className={`h-3.5 w-3.5 ${profile.is_favorite ? 'fill-current' : ''}`} />
                  {profile.is_favorite ? t('member.inFavorites') : t('member.saveFavorite')}
                </button>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setReportOpen(true)}
                    className="min-h-[40px] inline-flex items-center gap-1.5 text-stone-400 hover:text-stone-200 transition-colors"
                  >
                    <Flag className="h-3.5 w-3.5" />
                    {t('member.report')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBlockOpen(true)}
                    className="min-h-[40px] inline-flex items-center gap-1.5 text-red-400 hover:text-red-300 font-medium transition-colors"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    {t('member.block')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <form onSubmit={handleReport} className="zola-card w-full max-w-md rounded-2xl p-6 space-y-4">
            <h3 className="font-display text-lg font-bold text-white">
              {t('member.reportModalTitle', { name: profile.first_name })}
            </h3>
            <div>
              <label className="block text-xs text-stone-400 mb-1">{t('member.reportReason')}</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full rounded-xl border border-white/12 bg-[#1B1413] px-3 py-2 text-sm text-white"
              >
                {reportReasons.map((r) => (
                  <option key={r.fr} value={r.fr}>
                    {tReportReason(r.fr)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-stone-400 mb-1">{t('member.reportDetails')}</label>
              <textarea
                rows={3}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder={t('member.reportPlaceholder')}
                className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="rounded-full border border-white/15 px-4 py-2 text-sm text-stone-300"
              >
                {t('common.cancel')}
              </button>
              <button type="submit" className="zola-gradient rounded-full px-5 py-2 text-sm font-semibold text-white">
                {t('member.reportSubmit')}
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Block Confirmation Modal */}
      {blockOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="zola-card w-full max-w-md rounded-2xl p-6 space-y-4 border border-red-500/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-white">
                  {t('member.blockModalTitle', { name: profile.first_name })}
                </h3>
                <p className="text-xs text-stone-400">{t('member.blockModalSub')}</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-stone-300">
              {t('member.blockModalDesc', { name: profile.first_name })}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={blocking}
                onClick={() => setBlockOpen(false)}
                className="rounded-full border border-white/15 px-4 py-2 text-sm text-stone-300 hover:bg-white/5 disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={blocking}
                onClick={handleBlock}
                className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {blocking ? t('member.blocking') : t('member.blockConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
