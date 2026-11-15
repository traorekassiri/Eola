import React, { useCallback, useEffect, useState } from 'react';
import {
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  Flag,
  Heart,
  MessageSquare,
  Settings,
  ShieldAlert,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import type {
  AdminStats,
  PaymentRecord,
  ReportRecord,
  SiteSettings,
  SubscriptionPlan,
  VerificationRequestRecord,
} from '../types';

interface AdminUserRow {
  id: number;
  email: string;
  role: string;
  status: string;
  is_verified: number;
  is_online: number;
  created_at: string;
  full_name: string;
  city: string;
  country: string;
  avatar_url: string;
}

interface AdminDashboardProps {
  currentUserRole: string;
  onSettingsUpdated: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUserRole,
  onSettingsUpdated,
}) => {
  const [tab, setTab] = useState<'overview' | 'users' | 'verifications' | 'reports' | 'payments' | 'settings'>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [verifications, setVerifications] = useState<VerificationRequestRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState('');

  const loadData = useCallback(async () => {
    const data = await apiFetch<{
      stats: AdminStats;
      users: AdminUserRow[];
      reports: ReportRecord[];
      verifications: VerificationRequestRecord[];
      payments: PaymentRecord[];
      plans: SubscriptionPlan[];
      settings: SiteSettings;
    }>(`/api/admin/overview?page=${page}`);
    setStats(data.stats);
    setUsers(data.users);
    setReports(data.reports);
    setVerifications(data.verifications);
    setPayments(data.payments);
    setPlans(data.plans);
    setSettings(data.settings);
  }, [page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateUser = async (id: number, body: Record<string, unknown>) => {
    await apiFetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    setFeedback('Compte utilisateur mis à jour.');
    loadData();
  };

  const deleteUser = async (id: number) => {
    await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    setFeedback('Compte supprimé.');
    loadData();
  };

  const handleVerification = async (id: number, status: 'approved' | 'rejected') => {
    await apiFetch(`/api/admin/verifications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status,
        admin_note: status === 'rejected' ? 'Selfie ou code non lisible' : '',
      }),
    });
    setFeedback(status === 'approved' ? 'Profil vérifié avec succès.' : 'Demande refusée.');
    loadData();
  };

  const handleReport = async (id: number, status: 'resolved' | 'dismissed', suspendReported = false) => {
    await apiFetch(`/api/admin/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, suspend_reported: suspendReported }),
    });
    setFeedback('Signalement traité.');
    loadData();
  };

  const handleSavePlan = async (plan: SubscriptionPlan) => {
    await apiFetch(`/api/admin/plans/${plan.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        price_fcfa: plan.price_fcfa,
        is_popular: plan.is_popular,
        active: plan.active,
      }),
    });
    setFeedback(`Tarif "${plan.name}" mis à jour.`);
    loadData();
    onSettingsUpdated();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    await apiFetch('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    });
    setFeedback("Contenu de la page d'accueil et paramètres enregistrés.");
    onSettingsUpdated();
  };

  const filteredUsers = users.filter((u) =>
    `${u.full_name} ${u.email} ${u.city} ${u.country}`.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
            Administration ZOLA
          </h1>
          <p className="text-xs text-stone-400">
            Rôle actif : <span className="font-semibold text-orange-400">{currentUserRole}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-1">
          {[
            { id: 'overview', label: "Vue d'ensemble" },
            { id: 'users', label: `Utilisateurs (${stats?.total_users || users.length})` },
            { id: 'verifications', label: `Vérifications (${stats?.pending_verifications || 0})` },
            { id: 'reports', label: `Signalements (${stats?.pending_reports || 0})` },
            { id: 'payments', label: 'Paiements & Tarifs' },
            { id: 'settings', label: 'Contenu & Paramètres' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as typeof tab)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                tab === t.id ? 'zola-gradient text-white' : 'text-stone-300 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-200">
          {feedback}
        </div>
      )}

      {tab === 'overview' && stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="zola-card rounded-2xl p-5">
            <div className="flex items-center justify-between text-stone-400 text-xs">
              <span>Membres inscrits</span>
              <Users className="h-4 w-4 text-orange-400" />
            </div>
            <p className="mt-2 font-display text-3xl font-extrabold text-white tabular-nums">{stats.total_users}</p>
            <p className="mt-1 text-xs text-stone-400 tabular-nums">
              {stats.verified_users} vérifié(s) · {stats.online_users} en ligne
            </p>
          </div>

          <div className="zola-card rounded-2xl p-5">
            <div className="flex items-center justify-between text-stone-400 text-xs">
              <span>Matchs & Messages</span>
              <Heart className="h-4 w-4 text-red-400" />
            </div>
            <p className="mt-2 font-display text-3xl font-extrabold text-white tabular-nums">{stats.total_matches}</p>
            <p className="mt-1 text-xs text-stone-400 tabular-nums flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> {stats.total_messages} messages échangés
            </p>
          </div>

          <div className="zola-card rounded-2xl p-5">
            <div className="flex items-center justify-between text-stone-400 text-xs">
              <span>Revenus Premium</span>
              <CreditCard className="h-4 w-4 text-amber-400" />
            </div>
            <p className="mt-2 font-display text-3xl font-extrabold text-amber-300 tabular-nums">
              {stats.total_revenue_fcfa.toLocaleString('fr-FR')} FCFA
            </p>
            <p className="mt-1 text-xs text-stone-400 tabular-nums">
              {stats.active_subscriptions} abonnement(s) actif(s)
            </p>
          </div>

          <div className="zola-card rounded-2xl p-5">
            <div className="flex items-center justify-between text-stone-400 text-xs">
              <span>Modération en attente</span>
              <Flag className="h-4 w-4 text-red-400" />
            </div>
            <p className="mt-2 font-display text-3xl font-extrabold text-white tabular-nums">
              {stats.pending_reports + stats.pending_verifications}
            </p>
            <p className="mt-1 text-xs text-stone-400 tabular-nums">
              {stats.pending_reports} signalement(s) · {stats.pending_verifications} vérif(s)
            </p>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="zola-card rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Filtrer par nom, email, ville..."
              className="w-full max-w-sm rounded-xl border border-white/12 bg-white/5 px-3.5 py-2 text-sm text-white"
            />
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-white/12 px-3 py-1.5 text-stone-300 disabled:opacity-40"
              >
                Précédent
              </button>
              <span className="text-stone-400 tabular-nums">Page {page}</span>
              <button
                type="button"
                disabled={users.length < 25}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-white/12 px-3 py-1.5 text-stone-300 disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/10 text-stone-400">
                  <th className="py-2.5 pr-4">Membre</th>
                  <th className="py-2.5 pr-4">Localisation</th>
                  <th className="py-2.5 pr-4">Rôle</th>
                  <th className="py-2.5 pr-4">Statut</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <img src={u.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                        <div>
                          <p className="font-medium text-white flex items-center gap-1">
                            {u.full_name}
                            {Boolean(u.is_verified) && <BadgeCheck className="h-4 w-4 text-sky-400" />}
                          </p>
                          <p className="text-xs text-stone-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-stone-300">
                      {u.city}, {u.country}
                    </td>
                    <td className="py-3 pr-4">
                      {currentUserRole === 'super_admin' ? (
                        <select
                          value={u.role}
                          onChange={(e) => updateUser(u.id, { role: e.target.value })}
                          className="rounded-lg border border-white/12 bg-[#1B1413] px-2 py-1 text-xs text-white"
                        >
                          <option value="user">user</option>
                          <option value="moderator">moderator</option>
                          <option value="admin">admin</option>
                          <option value="super_admin">super_admin</option>
                        </select>
                      ) : (
                        <span className="text-stone-300">{u.role}</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={u.status === 'active' ? 'text-emerald-400' : 'text-red-400'}>
                        {u.status === 'active' ? 'Actif' : 'Suspendu'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateUser(u.id, { is_verified: !u.is_verified })}
                          className="rounded-lg border border-white/12 bg-white/5 px-2.5 py-1 text-xs text-sky-300 hover:bg-white/10"
                        >
                          {u.is_verified ? 'Retirer vérif.' : 'Vérifier'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateUser(u.id, { status: u.status === 'active' ? 'suspended' : 'active' })
                          }
                          className="rounded-lg border border-white/12 bg-white/5 px-2.5 py-1 text-xs text-amber-300 hover:bg-white/10"
                        >
                          {u.status === 'active' ? 'Suspendre' : 'Réactiver'}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteUser(u.id)}
                          title="Supprimer"
                          className="rounded-lg border border-red-500/25 bg-red-500/10 p-1.5 text-red-400 hover:bg-red-500/20"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'verifications' && (
        <div className="zola-card rounded-2xl p-5 space-y-4">
          <h2 className="font-display text-lg font-bold text-white">Demandes de vérification d'identité</h2>
          {verifications.length === 0 ? (
            <p className="text-sm text-stone-400">Aucune demande de vérification soumise.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {verifications.map((v) => (
                <div key={v.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex gap-4">
                  <img
                    src={`/api/admin/verifications/${v.id}/photo`}
                    alt="Selfie vérification"
                    className="h-28 w-24 rounded-xl object-cover bg-black/40 shrink-0"
                  />
                  <div className="flex-1 space-y-2">
                    <p className="font-semibold text-white text-sm">{v.full_name}</p>
                    <p className="text-xs text-stone-400">
                      {v.city}, {v.country} · Code :{' '}
                      <span className="font-mono text-amber-300">{v.challenge_code}</span>
                    </p>
                    {v.status === 'pending' ? (
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleVerification(v.id, 'approved')}
                          className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white"
                        >
                          Approuver
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVerification(v.id, 'rejected')}
                          className="rounded-full border border-red-500/30 px-3 py-1 text-xs text-red-300"
                        >
                          Refuser
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`inline-block text-xs font-semibold ${
                          v.status === 'approved' ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {v.status === 'approved' ? 'Approuvé' : 'Refusé'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'reports' && (
        <div className="zola-card rounded-2xl p-5 space-y-4">
          {reports.length === 0 ? (
            <p className="text-sm text-stone-400">Aucun signalement enregistré.</p>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-center gap-3">
                    <img src={r.reported_avatar} alt="" className="h-11 w-11 rounded-full object-cover" />
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {r.reported_name}{' '}
                        <span className="text-xs font-normal text-stone-400">signalé par {r.reporter_name}</span>
                      </p>
                      <p className="text-xs text-orange-300 mt-0.5">{r.reason}</p>
                      {r.details && <p className="text-xs text-stone-400 mt-1">{r.details}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.status === 'pending' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleReport(r.id, 'resolved', true)}
                          className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          <ShieldAlert className="h-3.5 w-3.5" />
                          Suspendre & Résoudre
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReport(r.id, 'dismissed', false)}
                          className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-xs text-stone-300"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Ignorer
                        </button>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {r.status === 'resolved' ? 'Traité' : 'Classé'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'payments' && (
        <div className="space-y-6">
          <div className="zola-card rounded-2xl p-5 space-y-4">
            <h2 className="font-display text-lg font-bold text-white">Tarifs Premium (FCFA)</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {plans.map((p) => (
                <div key={p.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                  <p className="font-display font-bold text-white">{p.name}</p>
                  <div>
                    <label className="block text-xs text-stone-400 mb-1">Prix (FCFA)</label>
                    <input
                      type="number"
                      value={p.price_fcfa}
                      onChange={(e) =>
                        setPlans((prev) =>
                          prev.map((x) => (x.id === p.id ? { ...x, price_fcfa: Number(e.target.value) } : x))
                        )
                      }
                      className="w-full rounded-xl border border-white/12 bg-black/30 px-3 py-2 text-sm text-white tabular-nums"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-stone-300">
                    <input
                      type="checkbox"
                      checked={p.is_popular}
                      onChange={(e) =>
                        setPlans((prev) =>
                          prev.map((x) => (x.id === p.id ? { ...x, is_popular: e.target.checked } : x))
                        )
                      }
                      className="accent-orange-500"
                    />
                    Mettre en avant (Populaire)
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSavePlan(p)}
                    className="zola-gradient w-full rounded-full py-2 text-xs font-semibold text-white"
                  >
                    Enregistrer ce tarif
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="zola-card rounded-2xl p-5 space-y-3">
            <h2 className="font-display text-lg font-bold text-white">Transactions récentes</h2>
            {payments.length === 0 ? (
              <p className="text-sm text-stone-400">Aucun paiement enregistré.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-stone-400">
                      <th className="py-2 pr-3">Référence</th>
                      <th className="py-2 pr-3">Membre</th>
                      <th className="py-2 pr-3">Formule</th>
                      <th className="py-2 pr-3">Montant</th>
                      <th className="py-2">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {payments.map((pay) => (
                      <tr key={pay.id}>
                        <td className="py-2.5 pr-3 font-mono text-xs text-stone-300">{pay.reference}</td>
                        <td className="py-2.5 pr-3 text-white">{pay.user_name}</td>
                        <td className="py-2.5 pr-3 text-stone-300">{pay.plan_name}</td>
                        <td className="py-2.5 pr-3 text-amber-300 tabular-nums">
                          {pay.amount_fcfa.toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className="py-2.5">
                          <span className={pay.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'}>
                            {pay.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'settings' && settings && (
        <form onSubmit={handleSaveSettings} className="zola-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-white font-display font-bold text-lg">
            <Settings className="h-5 w-5 text-orange-400" />
            Contenu de la page d'accueil & Paramètres généraux
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-stone-400 mb-1">Titre Hero</label>
              <input
                type="text"
                value={settings.hero_title}
                onChange={(e) => setSettings({ ...settings, hero_title: e.target.value })}
                className="w-full rounded-xl border border-white/12 bg-white/5 px-3.5 py-2.5 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-400 mb-1">Slogan Footer</label>
              <input
                type="text"
                value={settings.footer_slogan}
                onChange={(e) => setSettings({ ...settings, footer_slogan: e.target.value })}
                className="w-full rounded-xl border border-white/12 bg-white/5 px-3.5 py-2.5 text-sm text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-stone-400 mb-1">Texte de présentation Hero</label>
            <textarea
              rows={2}
              value={settings.hero_subtitle}
              onChange={(e) => setSettings({ ...settings, hero_subtitle: e.target.value })}
              className="w-full rounded-xl border border-white/12 bg-white/5 px-3.5 py-2.5 text-sm text-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-2">
            {[
              { key: 'oauth_google_enabled', label: 'Activer bouton Google OAuth' },
              { key: 'oauth_facebook_enabled', label: 'Activer bouton Facebook OAuth' },
              { key: 'oauth_apple_enabled', label: 'Activer bouton Apple OAuth' },
            ].map((o) => (
              <label
                key={o.key}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-stone-200"
              >
                <input
                  type="checkbox"
                  checked={settings[o.key as keyof SiteSettings] === '1'}
                  onChange={(e) =>
                    setSettings({ ...settings, [o.key]: e.target.checked ? '1' : '0' })
                  }
                  className="accent-orange-500"
                />
                {o.label}
              </label>
            ))}
          </div>

          <button type="submit" className="zola-gradient rounded-full px-6 py-2.5 text-sm font-semibold text-white">
            Enregistrer les paramètres
          </button>
        </form>
      )}
    </div>
  );
};
