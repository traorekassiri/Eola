import React, { useEffect, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, KeyRound, Lock, Mail, MapPin, User } from 'lucide-react';
import { apiFetch, setCsrfToken, setSessionToken } from '../lib/api';
import { useI18n } from '../lib/i18n';
import type { AppRoute, RegisterPrefill, SiteSettings, UserProfile } from '../types';
import { LanguageToggle } from './LanguageToggle';
import { ZolaLogo } from './ZolaLogo';

interface AuthViewsProps {
  mode: 'register' | 'login' | 'forgot-password';
  settings: SiteSettings;
  registerPrefill?: RegisterPrefill | null;
  onNavigate: (route: AppRoute) => void;
  onAuthSuccess: (user: UserProfile) => void;
}

export const AuthViews: React.FC<AuthViewsProps> = ({
  mode,
  settings,
  registerPrefill,
  onNavigate,
  onAuthSuccess,
}) => {
  const { lang, t, tCountry, countries, brandName } = useI18n();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [totpCode, setTotpCode] = useState('');

  // Register state
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [birthDate, setBirthDate] = useState('1999-05-15');
  const [gender, setGender] = useState<'Femme' | 'Homme'>(registerPrefill?.gender || 'Femme');
  const [seekingGender, setSeekingGender] = useState<'Homme' | 'Femme' | 'Tous'>(
    registerPrefill?.seeking_gender || 'Homme'
  );
  const [country, setCountry] = useState(registerPrefill?.country || 'Burkina Faso');
  const [city, setCity] = useState(registerPrefill?.city || 'Ouagadougou');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    if (!registerPrefill) return;
    if (registerPrefill.gender) setGender(registerPrefill.gender);
    if (registerPrefill.seeking_gender) setSeekingGender(registerPrefill.seeking_gender);
    if (registerPrefill.country) setCountry(registerPrefill.country);
    if (registerPrefill.city !== undefined) setCity(registerPrefill.city);
  }, [registerPrefill]);

  // Forgot password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');

  const hasOAuth =
    settings.oauth_google_enabled === '1' ||
    settings.oauth_facebook_enabled === '1' ||
    settings.oauth_apple_enabled === '1';

  const performLogin = async (email: string, password: string, totp?: string) => {
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch<{
        user?: UserProfile;
        csrfToken?: string;
        sessionToken?: string;
        two_factor_required?: boolean;
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          remember_me: rememberMe,
          totp_code: totp,
        }),
      });
      if (data.two_factor_required) {
        setTwoFactorRequired(true);
        setInfoMsg(t('auth.login.2faPrompt'));
        return;
      }
      if (data.user && data.csrfToken) {
        if (data.sessionToken) setSessionToken(data.sessionToken);
        setCsrfToken(data.csrfToken);
        onAuthSuccess(data.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(loginEmail, loginPassword, twoFactorRequired ? totpCode.trim() : undefined);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (regPassword !== regConfirm) {
      setError(t('auth.register.mismatch'));
      return;
    }
    if (!acceptedTerms) {
      setError(t('auth.register.mustAccept'));
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<{ user: UserProfile; csrfToken: string; sessionToken?: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          full_name: fullName,
          email: regEmail,
          password: regPassword,
          password_confirm: regConfirm,
          birth_date: birthDate,
          gender,
          seeking_gender: seekingGender,
          country,
          city,
          accepted_terms: acceptedTerms,
        }),
      });
      if (data.sessionToken) setSessionToken(data.sessionToken);
      setCsrfToken(data.csrfToken);
      onAuthSuccess(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');
    setLoading(true);
    try {
      const res = await apiFetch<{ message: string; dev_reset_token?: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: resetEmail }),
      });
      setInfoMsg(res.message);
      if (res.dev_reset_token) {
        setResetToken(res.dev_reset_token);
      }
      setResetStep('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la demande.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: resetToken, new_password: newPassword }),
      });
      setInfoMsg(res.message);
      setTimeout(() => onNavigate('login'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de réinitialisation.');
    } finally {
      setLoading(false);
    }
  };

  const sidePhoto =
    mode === 'register'
      ? settings.auth_register_image_url || '/media/zola_register_woman_1794726545235.jpg'
      : settings.auth_login_image_url || '/media/zola_login_man_1794726545582.jpg';

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-[#0B0909] text-stone-100 flex flex-col">
      <div className="flex items-center justify-between gap-2 sm:gap-3 px-3 py-3.5 sm:px-8 border-b border-white/8">
        <button type="button" onClick={() => onNavigate('landing')} className="focus-visible:outline-none">
          <ZolaLogo />
        </button>
        <div className="flex items-center gap-2.5">
          <LanguageToggle compact />
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-xs sm:text-sm text-stone-300 hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('auth.backHome')}
          </button>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-stretch gap-0 lg:grid-cols-12 lg:py-8 lg:px-6">
        {/* Left Photographic Panel */}
        <div className="relative hidden lg:block lg:col-span-5 overflow-hidden rounded-l-3xl border border-r-0 border-white/10 bg-[#140F0E]">
          <img
            src={sidePhoto}
            alt={brandName}
            className="h-full w-full object-cover object-top"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B0909] via-transparent to-transparent opacity-80" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#120D0C]/90" />
          <div className="absolute bottom-8 left-8 right-8">
            <p className="font-display text-2xl font-bold text-white leading-snug">
              {mode === 'register'
                ? t('auth.side.register')
                : t('auth.side.login')}
            </p>
            <p className="mt-2 text-sm text-stone-300">
              {t('auth.side.sub')}
            </p>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="lg:col-span-7 flex items-center justify-center bg-[#120D0C] border border-white/10 lg:rounded-r-3xl rounded-none p-6 sm:p-10">
          <div className="w-full max-w-md space-y-6">
            {mode === 'login' && (
              <>
                <div className="text-center lg:text-left">
                  <h1 className="font-display text-3xl font-extrabold text-white">{t('auth.login.title')}</h1>
                  <p className="mt-1.5 text-sm text-stone-400">{t('auth.login.sub')}</p>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                )}

                {infoMsg && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    {infoMsg}
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  {!twoFactorRequired ? (
                    <>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                        <input
                          type="email"
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder={t('auth.login.emailPlaceholder')}
                          className="w-full rounded-xl border border-white/12 bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder:text-stone-500 focus:border-orange-500 focus:outline-none"
                        />
                      </div>

                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                        <input
                          type={showPass ? 'text' : 'password'}
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder={t('auth.login.passwordPlaceholder')}
                          className="w-full rounded-xl border border-white/12 bg-white/5 pl-10 pr-11 py-3 text-sm text-white placeholder:text-stone-500 focus:border-orange-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass((v) => !v)}
                          aria-label="Toggle password"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
                        >
                          {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <label className="inline-flex items-center gap-2 text-stone-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="h-4 w-4 rounded border-white/20 bg-white/5 accent-orange-500"
                          />
                          {t('auth.login.rememberMe')}
                        </label>
                        <button
                          type="button"
                          onClick={() => onNavigate('forgot-password')}
                          className="font-medium text-amber-400 hover:text-amber-300"
                        >
                          {t('auth.login.forgot')}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative">
                        <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-400" />
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]{6}"
                          maxLength={6}
                          required
                          autoFocus
                          value={totpCode}
                          onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder={t('auth.login.2faPlaceholder')}
                          className="w-full rounded-xl border border-amber-400/40 bg-white/5 pl-10 pr-4 py-3 text-sm tracking-widest font-mono text-white placeholder:text-stone-500 focus:border-orange-500 focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTwoFactorRequired(false);
                          setTotpCode('');
                          setInfoMsg('');
                        }}
                        className="text-xs text-stone-400 hover:text-white underline"
                      >
                        {t('auth.login.backToCreds')}
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="zola-gradient zola-gradient-hover w-full rounded-full py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-600/25 disabled:opacity-60"
                  >
                    {loading
                      ? t('auth.login.submitting')
                      : twoFactorRequired
                        ? t('auth.login.verify2fa')
                        : t('auth.login.submit')}
                  </button>
                </form>

                {hasOAuth && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-3 text-xs text-stone-500">
                      <div className="h-px flex-1 bg-white/10" />
                      <span>{t('auth.login.oauthSep')}</span>
                      <div className="h-px flex-1 bg-white/10" />
                    </div>
                    <div className="flex justify-center gap-3">
                      {settings.oauth_google_enabled === '1' && (
                        <button type="button" className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-xs font-medium text-white hover:bg-white/10">
                          Google
                        </button>
                      )}
                      {settings.oauth_facebook_enabled === '1' && (
                        <button type="button" className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-xs font-medium text-white hover:bg-white/10">
                          Facebook
                        </button>
                      )}
                      {settings.oauth_apple_enabled === '1' && (
                        <button type="button" className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-xs font-medium text-white hover:bg-white/10">
                          Apple
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <p className="text-center text-sm text-stone-400">
                  {t('auth.login.noAccount')}{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate('register')}
                    className="font-semibold text-orange-400 hover:text-orange-300"
                  >
                    {t('auth.login.createOne')}
                  </button>
                </p>

                <div className="border-t border-white/8 pt-3 text-center text-xs text-stone-500">
                  {t('auth.login.quickTest')}{' '}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setTwoFactorRequired(false);
                      setTotpCode('');
                      setInfoMsg('');
                      setLoginEmail('awa@zola.africa');
                      setLoginPassword('Zola2026!');
                      void performLogin('awa@zola.africa', 'Zola2026!');
                    }}
                    className="text-stone-300 underline hover:text-white disabled:opacity-50"
                  >
                    {t('auth.login.memberDemo')}
                  </button>
                  {' · '}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setTwoFactorRequired(false);
                      setTotpCode('');
                      setInfoMsg('');
                      setLoginEmail('admin@zola.africa');
                      setLoginPassword('Zola2026!');
                      void performLogin('admin@zola.africa', 'Zola2026!');
                    }}
                    className="text-orange-400 font-medium underline hover:text-orange-300 disabled:opacity-50"
                  >
                    {t('auth.login.adminDemo')}
                  </button>
                </div>
              </>
            )}

            {mode === 'register' && (
              <>
                <div className="text-center lg:text-left">
                  <h1 className="font-display text-3xl font-extrabold text-white">{t('auth.register.title')}</h1>
                  <p className="mt-1.5 text-sm text-stone-400">
                    {t('auth.register.sub')}
                  </p>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                )}

                {hasOAuth && (
                  <div className="space-y-2">
                    {settings.oauth_google_enabled === '1' && (
                      <button type="button" className="w-full rounded-full border border-white/15 bg-white py-2.5 text-sm font-semibold text-stone-900">
                        {t('auth.register.continueWith', { provider: 'Google' })}
                      </button>
                    )}
                    {settings.oauth_facebook_enabled === '1' && (
                      <button type="button" className="w-full rounded-full bg-[#1877F2] py-2.5 text-sm font-semibold text-white">
                        {t('auth.register.continueWith', { provider: 'Facebook' })}
                      </button>
                    )}
                    {settings.oauth_apple_enabled === '1' && (
                      <button type="button" className="w-full rounded-full bg-black border border-white/20 py-2.5 text-sm font-semibold text-white">
                        {t('auth.register.continueWith', { provider: 'Apple' })}
                      </button>
                    )}
                  </div>
                )}

                <form onSubmit={handleRegister} className="space-y-3.5">
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={t('auth.register.fullName')}
                      className="w-full rounded-xl border border-white/12 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-stone-500 focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder={t('auth.login.emailPlaceholder')}
                      className="w-full rounded-xl border border-white/12 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-stone-500 focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                      <input
                        type={showPass ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder={t('auth.login.passwordPlaceholder')}
                        className="w-full rounded-xl border border-white/12 bg-white/5 pl-10 pr-9 py-2.5 text-sm text-white placeholder:text-stone-500 focus:border-orange-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
                      >
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={regConfirm}
                      onChange={(e) => setRegConfirm(e.target.value)}
                      placeholder={t('auth.register.passwordConfirm')}
                      className="w-full rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-stone-500 focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs text-stone-400 mb-1">{t('auth.register.birthDate')}</label>
                      <input
                        type="date"
                        required
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="w-full rounded-xl border border-white/12 bg-[#1B1413] px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-stone-400 mb-1">{t('auth.register.gender')}</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value as 'Femme' | 'Homme')}
                        className="w-full rounded-xl border border-white/12 bg-[#1B1413] px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                      >
                        <option value="Femme">{lang === 'en' ? 'Woman' : 'Femme'}</option>
                        <option value="Homme">{lang === 'en' ? 'Man' : 'Homme'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-stone-400 mb-1">{t('auth.register.seeking')}</label>
                      <select
                        value={seekingGender}
                        onChange={(e) => setSeekingGender(e.target.value as 'Homme' | 'Femme' | 'Tous')}
                        className="w-full rounded-xl border border-white/12 bg-[#1B1413] px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                      >
                        <option value="Homme">{lang === 'en' ? 'Man' : 'Homme'}</option>
                        <option value="Femme">{lang === 'en' ? 'Woman' : 'Femme'}</option>
                        <option value="Tous">{lang === 'en' ? 'Everyone' : 'Tous'}</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs text-stone-400 mb-1">{t('auth.register.country')}</label>
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full rounded-xl border border-white/12 bg-[#1B1413] px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                      >
                        {countries.map((c) => (
                          <option key={c.name} value={c.name}>
                            {tCountry(c.name)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-stone-400 mb-1">{t('auth.register.city')}</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                        <input
                          type="text"
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder={t('auth.register.city')}
                          className="w-full rounded-xl border border-white/12 bg-white/5 pl-9 pr-3 py-2 text-sm text-white placeholder:text-stone-500 focus:border-orange-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <label className="flex items-start gap-2.5 text-xs text-stone-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 accent-orange-500"
                    />
                    <span>
                      {t('auth.register.termsPrefix')}{' '}
                      <button type="button" onClick={() => onNavigate('legal')} className="text-orange-400 underline">
                        {t('auth.register.termsLink')}
                      </button>{' '}
                      {t('auth.register.termsSuffix')}
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="zola-gradient zola-gradient-hover w-full rounded-full py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-600/25 disabled:opacity-60"
                  >
                    {loading ? t('auth.register.submitting') : t('auth.register.submit')}
                  </button>
                </form>

                <p className="text-center text-sm text-stone-400">
                  {t('auth.register.hasAccount')}{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate('login')}
                    className="font-semibold text-orange-400 hover:text-orange-300"
                  >
                    {t('auth.login.submit')}
                  </button>
                </p>
              </>
            )}

            {mode === 'forgot-password' && (
              <>
                <div>
                  <h1 className="font-display text-2xl font-extrabold text-white">{t('auth.forgot.title')}</h1>
                  <p className="mt-1.5 text-sm text-stone-400">
                    {t('auth.forgot.sub')}
                  </p>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                )}
                {infoMsg && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                    {infoMsg}
                  </div>
                )}

                {resetStep === 'request' ? (
                  <form onSubmit={handleRequestReset} className="space-y-4">
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder={t('auth.forgot.emailPlaceholder')}
                      className="w-full rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-stone-500 focus:border-orange-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="zola-gradient zola-gradient-hover w-full rounded-full py-3 text-sm font-semibold text-white"
                    >
                      {loading ? t('auth.forgot.sending') : t('auth.forgot.sendBtn')}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleConfirmReset} className="space-y-4">
                    <input
                      type="text"
                      required
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder={t('auth.forgot.tokenPlaceholder')}
                      className="w-full rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white font-mono placeholder:text-stone-500 focus:border-orange-500 focus:outline-none"
                    />
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t('auth.forgot.newPassPlaceholder')}
                      className="w-full rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-stone-500 focus:border-orange-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="zola-gradient zola-gradient-hover w-full rounded-full py-3 text-sm font-semibold text-white"
                    >
                      {loading ? t('auth.forgot.updating') : t('auth.forgot.confirmBtn')}
                    </button>
                  </form>
                )}

                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="text-sm text-orange-400 hover:text-orange-300"
                >
                  {t('auth.forgot.backToLogin')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
