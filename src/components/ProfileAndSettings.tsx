import React, { useRef, useState } from 'react';
import {
  Bell,
  Camera,
  Check,
  HelpCircle,
  Info,
  Lock,
  LogOut,
  Plus,
  Shield,
  Sliders,
  Trash2,
  User,
} from 'lucide-react';
import { AFRICAN_COUNTRIES, ZODIAC_SIGNS, apiFetch } from '../lib/api';
import type { Interest, NotificationItem, UserProfile } from '../types';

interface EditProfileViewProps {
  user: UserProfile;
  interests: Interest[];
  onUpdated: (user: UserProfile) => void;
  onBack: () => void;
}

export const EditProfileView: React.FC<EditProfileViewProps> = ({
  user,
  interests,
  onUpdated,
  onBack,
}) => {
  const [fullName, setFullName] = useState(user.full_name);
  const [birthDate, setBirthDate] = useState(user.birth_date);
  const [gender, setGender] = useState<'Femme' | 'Homme'>(user.gender);
  const [seekingGender, setSeekingGender] = useState<'Homme' | 'Femme' | 'Tous'>(user.seeking_gender);
  const [country, setCountry] = useState(user.country);
  const [city, setCity] = useState(user.city);
  const [profession, setProfession] = useState(user.profession);
  const [heightCm, setHeightCm] = useState(user.height_cm ? String(user.height_cm) : '');
  const [zodiacSign, setZodiacSign] = useState(user.zodiac_sign);
  const [bio, setBio] = useState(user.bio);
  const [selectedInterests, setSelectedInterests] = useState<number[]>(user.interests.map((i) => i.id));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [verifStatus, setVerifStatus] = useState<{ status: string; admin_note: string } | null>(null);
  const [challengeCode] = useState(() => `ZOLA-${Math.floor(1000 + Math.random() * 9000)}`);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const verifInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    apiFetch<{ request: { status: string; admin_note: string } | null }>('/api/verification/status')
      .then((d) => setVerifStatus(d.request))
      .catch(() => {});
  }, []);

  const handleSubmitVerification = async (file: File) => {
    setErr('');
    const form = new FormData();
    form.append('selfie', file);
    form.append('challenge_code', challengeCode);
    try {
      const res = await apiFetch<{ message: string }>('/api/verification/request', {
        method: 'POST',
        body: form,
      });
      setMsg(res.message);
      setVerifStatus({ status: 'pending', admin_note: '' });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur lors de la demande de vérification.');
    }
  };

  const toggleInterest = (id: number) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handlePhotoUpload = async (file: File, isPrimary: boolean) => {
    setErr('');
    const form = new FormData();
    form.append('photo', file);
    form.append('is_primary', isPrimary ? '1' : '0');
    try {
      const data = await apiFetch<{ user: UserProfile }>('/api/profile/photo', {
        method: 'POST',
        body: form,
      });
      onUpdated(data.user);
      setMsg(isPrimary ? 'Photo de profil mise à jour.' : 'Photo ajoutée à votre galerie.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur lors de l'envoi de la photo.");
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    try {
      const data = await apiFetch<{ user: UserProfile }>(`/api/profile/photo/${photoId}`, {
        method: 'DELETE',
      });
      onUpdated(data.user);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Impossible de supprimer cette photo.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setErr('');
    try {
      const data = await apiFetch<{ user: UserProfile }>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({
          full_name: fullName,
          birth_date: birthDate,
          gender,
          seeking_gender: seekingGender,
          country,
          city,
          profession,
          height_cm: heightCm ? Number(heightCm) : null,
          zodiac_sign: zodiacSign,
          bio,
          interest_ids: selectedInterests,
        }),
      });
      onUpdated(data.user);
      setMsg('Profil enregistré avec succès.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur de sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-white">Modifier mon profil</h1>
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-stone-200 hover:bg-white/10"
        >
          Voir mon profil
        </button>
      </div>

      {msg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {msg}
        </div>
      )}
      {err && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      <form onSubmit={handleSave} className="zola-card rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          {/* Left Avatar + Gallery */}
          <div className="md:col-span-4 space-y-5">
            <div className="text-center space-y-3">
              <div className="relative mx-auto h-36 w-36">
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  className="h-36 w-36 rounded-full object-cover border-2 border-orange-500"
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="zola-gradient absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePhotoUpload(f, true);
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="text-xs font-medium text-orange-400 hover:text-orange-300"
              >
                Changer la photo principale
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-300">Galerie photos</span>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="inline-flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter
                </button>
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePhotoUpload(f, false);
                  }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {user.photos.map((ph) => (
                  <div key={ph.id} className="relative aspect-square overflow-hidden rounded-xl border border-white/10">
                    <img src={ph.photo_url} alt="" className="h-full w-full object-cover" />
                    {!ph.is_primary && (
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(ph.id)}
                        className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/75 text-red-400 hover:bg-red-600 hover:text-white"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Vérification d'identité</span>
                {user.is_verified ? (
                  <span className="text-[11px] font-semibold text-sky-400">Vérifié</span>
                ) : verifStatus?.status === 'pending' ? (
                  <span className="text-[11px] font-semibold text-amber-400">En attente</span>
                ) : null}
              </div>
              {user.is_verified ? (
                <p className="text-xs text-stone-400">Votre badge de profil vérifié est actif.</p>
              ) : (
                <>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    Envoyez un selfie tenant le code <strong className="font-mono text-amber-300">{challengeCode}</strong> pour obtenir le badge vérifié.
                  </p>
                  {verifStatus?.status === 'rejected' && verifStatus.admin_note && (
                    <p className="text-xs text-red-300">Refus précédent : {verifStatus.admin_note}</p>
                  )}
                  <input
                    ref={verifInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleSubmitVerification(f);
                    }}
                  />
                  <button
                    type="button"
                    disabled={verifStatus?.status === 'pending'}
                    onClick={() => verifInputRef.current?.click()}
                    className="w-full rounded-full border border-sky-400/35 bg-sky-400/10 py-2 text-xs font-semibold text-sky-300 hover:bg-sky-400/20 disabled:opacity-50"
                  >
                    {verifStatus?.status === 'pending' ? 'Demande en cours...' : 'Envoyer mon selfie'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Form Fields */}
          <div className="md:col-span-8 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-stone-400 mb-1">Nom complet</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3.5 py-2.5 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Date de naissance</label>
                <input
                  type="date"
                  required
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-[#1B1413] px-3.5 py-2.5 text-sm text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-stone-400 mb-1">Genre</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as 'Femme' | 'Homme')}
                  className="w-full rounded-xl border border-white/12 bg-[#1B1413] px-3.5 py-2.5 text-sm text-white"
                >
                  <option value="Femme">Femme</option>
                  <option value="Homme">Homme</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Genre recherché</label>
                <select
                  value={seekingGender}
                  onChange={(e) => setSeekingGender(e.target.value as 'Homme' | 'Femme' | 'Tous')}
                  className="w-full rounded-xl border border-white/12 bg-[#1B1413] px-3.5 py-2.5 text-sm text-white"
                >
                  <option value="Homme">Homme</option>
                  <option value="Femme">Femme</option>
                  <option value="Tous">Tous</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-stone-400 mb-1">Pays</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-[#1B1413] px-3.5 py-2.5 text-sm text-white"
                >
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
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3.5 py-2.5 text-sm text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs text-stone-400 mb-1">Profession</label>
                <input
                  type="text"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  placeholder="Ex: Architecte"
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3.5 py-2.5 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Taille (cm)</label>
                <input
                  type="number"
                  min={120}
                  max={230}
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="170"
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-3.5 py-2.5 text-sm text-white tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Signe astrologique</label>
                <select
                  value={zodiacSign}
                  onChange={(e) => setZodiacSign(e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-[#1B1413] px-3.5 py-2.5 text-sm text-white"
                >
                  <option value="">Non précisé</option>
                  {ZODIAC_SIGNS.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Interests */}
            <div>
              <label className="block text-xs text-stone-400 mb-2">Centres d'intérêt</label>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => {
                  const active = selectedInterests.includes(interest.id);
                  return (
                    <button
                      key={interest.id}
                      type="button"
                      onClick={() => toggleInterest(interest.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? 'zola-gradient text-white'
                          : 'border border-white/12 bg-white/5 text-stone-300 hover:bg-white/10'
                      }`}
                    >
                      {active && <Check className="h-3 w-3" />}
                      {interest.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs text-stone-400 mb-1">À propos de moi</label>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Parlez de vous, de vos passions et de ce que vous recherchez..."
                className="w-full rounded-xl border border-white/12 bg-white/5 px-3.5 py-2.5 text-sm text-white"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="zola-gradient zola-gradient-hover rounded-full px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-600/25 disabled:opacity-60"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

interface SettingsViewProps {
  user: UserProfile;
  onUpdated: (user: UserProfile) => void;
  onEditProfile: () => void;
  onLogout: () => void;
  onDeleted: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  onUpdated,
  onEditProfile,
  onLogout,
  onDeleted,
}) => {
  const [section, setSection] = useState<
    'notifications' | 'confidentialite' | 'preferences' | 'aide' | 'apropos'
  >('notifications');

  const [notifyMessages, setNotifyMessages] = useState(user.notify_messages);
  const [notifyMatches, setNotifyMatches] = useState(user.notify_matches);
  const [profileVisible, setProfileVisible] = useState(user.profile_visible);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const saveToggles = async (nextMsg: boolean, nextMatch: boolean, nextVisible: boolean) => {
    setFeedback('');
    setError('');
    const data = await apiFetch<{ user: UserProfile }>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({
        notify_messages: nextMsg,
        notify_matches: nextMatch,
        profile_visible: nextVisible,
      }),
    });
    onUpdated(data.user);
    setFeedback('Paramètres enregistrés.');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback('');
    setError('');
    try {
      const res = await apiFetch<{ message: string }>('/api/settings/password', {
        method: 'PUT',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setFeedback(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du changement de mot de passe.');
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/api/settings/account', {
        method: 'DELETE',
        body: JSON.stringify({ password: deletePassword }),
      });
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mot de passe incorrect.');
    }
  };

  return (
    <div className="zola-card overflow-hidden rounded-3xl grid grid-cols-1 md:grid-cols-12 min-h-[520px]">
      {/* Settings Sidebar matching bottom-left of mockup */}
      <div className="md:col-span-4 border-r border-white/8 p-5 space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-white/8">
          <img src={user.avatar_url} alt={user.full_name} className="h-12 w-12 rounded-full object-cover" />
          <div className="min-w-0">
            <p className="font-display text-sm font-bold text-white truncate">{user.full_name}</p>
            <p className="text-xs text-stone-400 truncate">{user.email}</p>
          </div>
        </div>

        <nav className="space-y-1">
          <button
            type="button"
            onClick={onEditProfile}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-stone-300 hover:bg-white/5 hover:text-white"
          >
            <User className="h-4 w-4 text-orange-400" />
            Mon profil
          </button>
          <button
            type="button"
            onClick={() => setSection('notifications')}
            className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm ${
              section === 'notifications' ? 'bg-white/10 text-white font-semibold' : 'text-stone-300 hover:bg-white/5'
            }`}
          >
            <Bell className="h-4 w-4 text-orange-400" />
            Notifications
          </button>
          <button
            type="button"
            onClick={() => setSection('confidentialite')}
            className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm ${
              section === 'confidentialite' ? 'bg-white/10 text-white font-semibold' : 'text-stone-300 hover:bg-white/5'
            }`}
          >
            <Shield className="h-4 w-4 text-orange-400" />
            Confidentialité
          </button>
          <button
            type="button"
            onClick={() => setSection('preferences')}
            className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm ${
              section === 'preferences' ? 'bg-white/10 text-white font-semibold' : 'text-stone-300 hover:bg-white/5'
            }`}
          >
            <Sliders className="h-4 w-4 text-orange-400" />
            Préférences & Sécurité
          </button>
          <button
            type="button"
            onClick={() => setSection('aide')}
            className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm ${
              section === 'aide' ? 'bg-white/10 text-white font-semibold' : 'text-stone-300 hover:bg-white/5'
            }`}
          >
            <HelpCircle className="h-4 w-4 text-orange-400" />
            Aide & Support
          </button>
          <button
            type="button"
            onClick={() => setSection('apropos')}
            className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm ${
              section === 'apropos' ? 'bg-white/10 text-white font-semibold' : 'text-stone-300 hover:bg-white/5'
            }`}
          >
            <Info className="h-4 w-4 text-orange-400" />
            À propos
          </button>
        </nav>

        <div className="pt-4 border-t border-white/8">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </button>
        </div>
      </div>

      {/* Settings Content */}
      <div className="md:col-span-8 p-6 sm:p-8 space-y-6">
        <h1 className="font-display text-2xl font-extrabold text-white">Paramètres</h1>

        {feedback && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {feedback}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {section === 'notifications' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
              <div>
                <p className="font-medium text-white">Notifications de Match</p>
                <p className="text-xs text-stone-400">Recevoir une alerte lors d'un nouveau Match ou J'aime.</p>
              </div>
              <input
                type="checkbox"
                checked={notifyMatches}
                onChange={(e) => {
                  setNotifyMatches(e.target.checked);
                  saveToggles(notifyMessages, e.target.checked, profileVisible);
                }}
                className="h-5 w-5 accent-orange-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
              <div>
                <p className="font-medium text-white">Notifications de nouveaux messages</p>
                <p className="text-xs text-stone-400">Être notifié lorsqu'un correspondant vous écrit.</p>
              </div>
              <input
                type="checkbox"
                checked={notifyMessages}
                onChange={(e) => {
                  setNotifyMessages(e.target.checked);
                  saveToggles(e.target.checked, notifyMatches, profileVisible);
                }}
                className="h-5 w-5 accent-orange-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {section === 'confidentialite' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
              <div>
                <p className="font-medium text-white">Mon profil est visible par tous</p>
                <p className="text-xs text-stone-400">
                  Désactivez cette option pour masquer temporairement votre profil dans l'espace Découverte.
                </p>
              </div>
              <input
                type="checkbox"
                checked={profileVisible}
                onChange={(e) => {
                  setProfileVisible(e.target.checked);
                  saveToggles(notifyMessages, notifyMatches, e.target.checked);
                }}
                className="h-5 w-5 accent-orange-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {section === 'preferences' && (
          <div className="space-y-6">
            <form onSubmit={handlePasswordChange} className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Lock className="h-4 w-4 text-orange-400" />
                Modifier le mot de passe
              </div>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Mot de passe actuel"
                className="w-full rounded-xl border border-white/12 bg-black/30 px-3.5 py-2.5 text-sm text-white"
              />
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nouveau mot de passe (8 caractères min.)"
                className="w-full rounded-xl border border-white/12 bg-black/30 px-3.5 py-2.5 text-sm text-white"
              />
              <button type="submit" className="zola-gradient rounded-full px-5 py-2 text-sm font-semibold text-white">
                Mettre à jour
              </button>
            </form>

            <form onSubmit={handleDeleteAccount} className="rounded-2xl border border-red-500/25 bg-red-500/5 p-5 space-y-3">
              <p className="font-semibold text-red-300">Supprimer mon compte définitivement</p>
              <p className="text-xs text-stone-400">
                Cette action supprime votre profil, vos matchs et vos conversations de la base de données.
              </p>
              <input
                type="password"
                required
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Confirmez avec votre mot de passe"
                className="w-full rounded-xl border border-red-500/25 bg-black/30 px-3.5 py-2.5 text-sm text-white"
              />
              <button
                type="submit"
                className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-500"
              >
                Supprimer le compte
              </button>
            </form>
          </div>
        )}

        {section === 'aide' && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3 text-sm text-stone-300">
            <h2 className="font-display font-bold text-white">Aide et Support ZOLA</h2>
            <p>
              Pour toute question concernant la sécurité, un paiement Mobile Money ou une demande de vérification de profil, contactez notre équipe via support@zola.africa.
            </p>
            <p className="text-xs text-stone-400">
              Astuce : vous pouvez signaler ou bloquer un comportement inapproprié directement depuis le profil du membre ou la messagerie.
            </p>
          </div>
        )}

        {section === 'apropos' && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-2 text-sm text-stone-300">
            <h2 className="font-display font-bold text-white">À propos de ZOLA</h2>
            <p>
              ZOLA (« Ensemble, trouvons l'amour ») est une plateforme dédiée aux rencontres africaines authentiques, conçue pour relier les cœurs entre les grandes villes d'Afrique et sa diaspora.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

interface NotificationsViewProps {
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  onViewProfile: (userId: number) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  onMarkAllRead,
  onViewProfile,
}) => {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-white">Notifications</h1>
        {notifications.some((n) => !n.is_read) && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="text-xs font-medium text-orange-400 hover:text-orange-300"
          >
            Tout marquer comme lu
          </button>
        )}
      </div>

      <div className="zola-card rounded-3xl divide-y divide-white/8 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-10 text-center text-sm text-stone-400">
            Aucune notification pour le moment.
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                if (n.related_user_id) onViewProfile(n.related_user_id);
              }}
              className={`flex items-center gap-4 p-4 transition-colors ${
                n.related_user_id ? 'cursor-pointer hover:bg-white/5' : ''
              } ${!n.is_read ? 'bg-orange-500/5' : ''}`}
            >
              {n.related_user_avatar ? (
                <img
                  src={n.related_user_avatar}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/15 text-orange-400 shrink-0">
                  <Bell className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold text-white">{n.title}</p>
                <p className="text-xs text-stone-300 mt-0.5">{n.body}</p>
              </div>
              {!n.is_read && <span className="h-2.5 w-2.5 rounded-full bg-orange-500 shrink-0" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
