import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  Flag,
  Heart,
  MapPin,
  MessageCircle,
  Ruler,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { UserProfile } from '../types';

interface MemberProfileViewProps {
  memberId: number;
  isOwnProfile?: boolean;
  onBack: () => void;
  onEditOwn?: () => void;
  onOpenChat: (conversationId: number) => void;
  onMatched: (partner: UserProfile, conversationId: number) => void;
}

export const MemberProfileView: React.FC<MemberProfileViewProps> = ({
  memberId,
  isOwnProfile = false,
  onBack,
  onEditOwn,
  onOpenChat,
  onMatched,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activePhoto, setActivePhoto] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Profil suspect ou faux');
  const [reportDetails, setReportDetails] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    setLoading(true);
    apiFetch<{ profile: UserProfile }>(`/api/users/${memberId}`)
      .then((d) => {
        setProfile(d.profile);
        setActivePhoto(d.profile.avatar_url);
      })
      .finally(() => setLoading(false));
  }, [memberId]);

  const handleLike = async () => {
    if (!profile) return;
    const res = await apiFetch<{
      liked: boolean;
      matched: boolean;
      conversationId: number | null;
      partner: UserProfile;
    }>(`/api/likes/${profile.id}`, { method: 'POST' });

    setProfile((prev) => (prev ? { ...prev, liked_by_me: true, is_match: res.matched } : prev));
    if (res.matched && res.conversationId) {
      onMatched(res.partner, res.conversationId);
    } else {
      setFeedback(`Vous avez envoyé un J'aime à ${profile.first_name}.`);
    }
  };

  const handleStartMessage = async () => {
    if (!profile) return;
    if (profile.is_match) {
      const convs = await apiFetch<{ conversations: Array<{ id: number; partner: { id: number } }> }>(
        '/api/messages/conversations'
      );
      const found = convs.conversations.find((c) => c.partner.id === profile.id);
      if (found) {
        onOpenChat(found.id);
        return;
      }
    }
    setFeedback("Aimez ce profil : dès qu'il vous aime en retour, la discussion privée s'ouvre !");
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const res = await apiFetch<{ message: string }>(`/api/users/${profile.id}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason: reportReason, details: reportDetails }),
    });
    setReportOpen(false);
    setFeedback(res.message);
  };

  const handleBlock = async () => {
    if (!profile) return;
    await apiFetch(`/api/users/${profile.id}/block`, { method: 'POST' });
    onBack();
  };

  if (loading) {
    return <div className="h-96 rounded-3xl bg-white/5 animate-pulse" />;
  }

  if (!profile) {
    return (
      <div className="zola-card rounded-3xl p-8 text-center space-y-3">
        <p className="text-stone-300">Ce profil est introuvable ou inaccessible.</p>
        <button type="button" onClick={onBack} className="text-orange-400 underline text-sm">
          Retour
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
        {/* Photo & Gallery Column */}
        <div className="md:col-span-6 relative bg-[#140F0E]">
          <img
            src={activePhoto || profile.avatar_url}
            alt={profile.full_name}
            className="h-96 md:h-full w-full object-cover min-h-[380px]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30" />

          <button
            type="button"
            onClick={onBack}
            className="absolute top-4 left-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/80"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          {!isOwnProfile && (
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                title="Signaler"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-stone-200 backdrop-blur-md hover:bg-black/80"
              >
                <Flag className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleBlock}
                title="Bloquer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-red-300 backdrop-blur-md hover:bg-red-900/70"
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
                  className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
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
                    En ligne
                  </span>
                )}
              </div>

              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-stone-300">
                <MapPin className="h-4 w-4 text-orange-400" />
                {profile.city}, {profile.country}
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
                  Signe : {profile.zodiac_sign}
                </span>
              )}
            </div>

            <div>
              <h2 className="font-display text-sm font-bold text-white mb-2">À propos de moi</h2>
              <p className="text-sm leading-relaxed text-stone-300">
                {profile.bio || "Ce membre n'a pas encore rédigé de description personnelle."}
              </p>
            </div>

            {profile.interests.length > 0 && (
              <div>
                <h2 className="font-display text-sm font-bold text-white mb-2.5">Centres d'intérêt</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((i) => (
                    <span
                      key={i.id}
                      className="rounded-full border border-white/12 bg-white/5 px-3.5 py-1 text-xs font-medium text-stone-200"
                    >
                      {i.name}
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
              className="zola-gradient zola-gradient-hover w-full rounded-full py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-600/25"
            >
              Modifier mon profil
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleStartMessage}
                className="zola-gradient zola-gradient-hover inline-flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white shadow-lg shadow-orange-600/25"
              >
                <MessageCircle className="h-4 w-4" />
                Envoyer un message
              </button>
              <button
                type="button"
                onClick={handleLike}
                className={`inline-flex items-center justify-center gap-2 rounded-full border py-3 text-sm font-semibold transition-colors ${
                  profile.liked_by_me
                    ? 'border-red-500/40 bg-red-500/15 text-red-300'
                    : 'border-white/15 bg-white/5 text-white hover:bg-white/10'
                }`}
              >
                <Heart className={`h-4 w-4 ${profile.liked_by_me ? 'fill-red-500 text-red-500' : 'text-red-400'}`} />
                {profile.liked_by_me ? 'Aimé' : "J'aime"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <form onSubmit={handleReport} className="zola-card w-full max-w-md rounded-2xl p-6 space-y-4">
            <h3 className="font-display text-lg font-bold text-white">Signaler {profile.first_name}</h3>
            <div>
              <label className="block text-xs text-stone-400 mb-1">Motif</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full rounded-xl border border-white/12 bg-[#1B1413] px-3 py-2 text-sm text-white"
              >
                <option value="Profil suspect ou faux">Profil suspect ou faux</option>
                <option value="Comportement inapproprié">Comportement inapproprié</option>
                <option value="Contenu offensant">Contenu offensant</option>
                <option value="Harcèlement ou arnaque">Harcèlement ou arnaque</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-stone-400 mb-1">Précisions</label>
              <textarea
                rows={3}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Décrivez brièvement la situation..."
                className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="rounded-full border border-white/15 px-4 py-2 text-sm text-stone-300"
              >
                Annuler
              </button>
              <button type="submit" className="zola-gradient rounded-full px-5 py-2 text-sm font-semibold text-white">
                Envoyer le signalement
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
