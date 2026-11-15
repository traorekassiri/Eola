import React, { useCallback, useEffect, useState } from 'react';
import {
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  Download,
  Flag,
  Heart,
  History,
  MessageSquare,
  Plus,
  ShieldAlert,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { AdminCmsPanel } from './AdminCmsPanel';
import {
  CountryDistributionChart,
  MonthlyRevenueChart,
  MonthlySignupsChart,
} from './MonthlySignupsChart';
import type {
  AdminAuditLog,
  AdminStats,
  CountryDistributionPoint,
  Interest,
  MonthlySignupPoint,
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
  const { t, locale, brandName, tCountry, tPlanName, tReportReason } = useI18n();
  const [tab, setTab] = useState<'overview' | 'users' | 'verifications' | 'reports' | 'payments' | 'audit' | 'settings'>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [monthlySignups, setMonthlySignups] = useState<MonthlySignupPoint[]>([]);
  const [countryDistribution, setCountryDistribution] = useState<CountryDistributionPoint[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [monthsWindow, setMonthsWindow] = useState<6 | 12>(6);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [verifications, setVerifications] = useState<VerificationRequestRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [newPlan, setNewPlan] = useState({
    name: '',
    slug: '',
    duration_months: 1,
    price_fcfa: 5000,
    is_popular: false,
    featuresText: 'Likes illimités\nMessagerie illimitée',
  });

  const loadData = useCallback(async () => {
    try {
      setErrorMsg('');
      const data = await apiFetch<{
        stats: AdminStats;
        monthly_signups: MonthlySignupPoint[];
        country_distribution: CountryDistributionPoint[];
        audit_logs: AdminAuditLog[];
        users: AdminUserRow[];
        reports: ReportRecord[];
        verifications: VerificationRequestRecord[];
        payments: PaymentRecord[];
        plans: SubscriptionPlan[];
        interests: Interest[];
        settings: SiteSettings;
      }>(`/api/admin/overview?page=${page}&months=${monthsWindow}`);
      setStats(data.stats);
      setMonthlySignups(data.monthly_signups || []);
      setCountryDistribution(data.country_distribution || []);
      setAuditLogs(data.audit_logs || []);
      setUsers(data.users);
      setReports(data.reports);
      setVerifications(data.verifications);
      setPayments(data.payments);
      setPlans(data.plans);
      setInterests(data.interests || []);
      setSettings(data.settings);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Impossible de charger les données administrateur.');
    }
  }, [page, monthsWindow]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateUser = async (id: number, body: Record<string, unknown>) => {
    try {
      setErrorMsg('');
      await apiFetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setFeedback('Compte utilisateur mis à jour.');
      loadData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Impossible de modifier ce compte.');
    }
  };

  const deleteUser = async (id: number) => {
    try {
      setErrorMsg('');
      await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      setFeedback('Compte supprimé.');
      loadData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Impossible de supprimer ce compte.');
    }
  };

  const handleVerification = async (id: number, status: 'approved' | 'rejected') => {
    try {
      setErrorMsg('');
      await apiFetch(`/api/admin/verifications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          admin_note: status === 'rejected' ? 'Selfie ou code non lisible' : '',
        }),
      });
      setFeedback(status === 'approved' ? 'Profil vérifié avec succès.' : 'Demande refusée.');
      loadData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Impossible de traiter cette vérification.');
    }
  };

  const handleReport = async (id: number, status: 'resolved' | 'dismissed', suspendReported = false) => {
    try {
      setErrorMsg('');
      await apiFetch(`/api/admin/reports/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, suspend_reported: suspendReported }),
      });
      setFeedback('Signalement traité.');
      loadData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Impossible de traiter ce signalement.');
    }
  };

  const handleSavePlan = async (plan: SubscriptionPlan) => {
    try {
      setErrorMsg('');
      await apiFetch(`/api/admin/plans/${plan.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: plan.name,
          slug: plan.slug,
          duration_months: plan.duration_months,
          price_fcfa: plan.price_fcfa,
          is_popular: plan.is_popular,
          active: plan.active,
          features: plan.features,
        }),
      });
      setFeedback(`Formule "${plan.name}" mise à jour.`);
      loadData();
      onSettingsUpdated();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Impossible de mettre à jour la formule.');
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlan.name.trim()) return;
    try {
      setErrorMsg('');
      const features = newPlan.featuresText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      await apiFetch('/api/admin/plans', {
        method: 'POST',
        body: JSON.stringify({
          name: newPlan.name.trim(),
          slug: newPlan.slug.trim() || undefined,
          duration_months: Number(newPlan.duration_months) || 1,
          price_fcfa: Number(newPlan.price_fcfa) || 0,
          is_popular: newPlan.is_popular,
          features,
        }),
      });
      setNewPlan({
        name: '',
        slug: '',
        duration_months: 1,
        price_fcfa: 5000,
        is_popular: false,
        featuresText: 'Likes illimités\nMessagerie illimitée',
      });
      setFeedback('Nouvelle formule créée.');
      loadData();
      onSettingsUpdated();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Impossible de créer cette formule.');
    }
  };

  const handleDeletePlan = async (plan: SubscriptionPlan) => {
    try {
      setErrorMsg('');
      await apiFetch(`/api/admin/plans/${plan.id}`, { method: 'DELETE' });
      setFeedback(`Formule "${plan.name}" supprimée / archivée.`);
      loadData();
      onSettingsUpdated();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Impossible de supprimer cette formule.');
    }
  };

  const filteredUsers = users.filter((u) =>
    `${u.full_name} ${u.email} ${u.city} ${u.country}`.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
            {t('admin.title')}
          </h1>
          <p className="text-xs text-stone-400">
            {t('admin.activeRole')} <span className="font-semibold text-orange-400">{currentUserRole}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-1">
          {[
            { id: 'overview', label: t('admin.tab.overview') },
            { id: 'users', label: t('admin.tab.users', { count: stats?.total_users || users.length }) },
            { id: 'verifications', label: t('admin.tab.verifs', { count: stats?.pending_verifications || 0 }) },
            { id: 'reports', label: t('admin.tab.reports', { count: stats?.pending_reports || 0 }) },
            { id: 'payments', label: t('admin.tab.payments') },
            { id: 'audit', label: t('admin.tab.audit') },
            { id: 'settings', label: t('admin.tab.settings') },
          ].map((tb) => (
            <button
              key={tb.id}
              type="button"
              onClick={() => setTab(tb.id as typeof tab)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                tab === tb.id ? 'zola-gradient text-white' : 'text-stone-300 hover:text-white'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-red-500/35 bg-red-500/15 px-4 py-2.5 text-sm text-red-200">
          {errorMsg}
        </div>
      )}

      {feedback && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-200">
          {feedback}
        </div>
      )}

      {tab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="zola-card rounded-2xl p-5">
              <div className="flex items-center justify-between text-stone-400 text-xs">
                <span>{t('admin.kpi.users')}</span>
                <Users className="h-4 w-4 text-orange-400" />
              </div>
              <p className="mt-2 font-display text-3xl font-extrabold text-white tabular-nums">{stats.total_users}</p>
              <p className="mt-1 text-xs text-stone-400 tabular-nums">
                {t('admin.kpi.usersSub', { verified: stats.verified_users, online: stats.online_users })}
              </p>
            </div>

            <div className="zola-card rounded-2xl p-5">
              <div className="flex items-center justify-between text-stone-400 text-xs">
                <span>{t('admin.kpi.matches')}</span>
                <Heart className="h-4 w-4 text-red-400" />
              </div>
              <p className="mt-2 font-display text-3xl font-extrabold text-white tabular-nums">{stats.total_matches}</p>
              <p className="mt-1 text-xs text-stone-400 tabular-nums flex items-center gap-1">
                <MessageSquare className="h-3 w-3" /> {t('admin.kpi.messagesSub', { count: stats.total_messages })}
              </p>
            </div>

            <div className="zola-card rounded-2xl p-5">
              <div className="flex items-center justify-between text-stone-400 text-xs">
                <span>{t('admin.kpi.revenue')}</span>
                <CreditCard className="h-4 w-4 text-amber-400" />
              </div>
              <p className="mt-2 font-display text-3xl font-extrabold text-amber-300 tabular-nums">
                {stats.total_revenue_fcfa.toLocaleString(locale)} FCFA
              </p>
              <p className="mt-1 text-xs text-stone-400 tabular-nums">
                {t('admin.kpi.revenueSub', { active: stats.active_subscriptions, rate: stats.conversion_rate })}
              </p>
            </div>

            <div className="zola-card rounded-2xl p-5">
              <div className="flex items-center justify-between text-stone-400 text-xs">
                <span>{t('admin.kpi.moderation')}</span>
                <Flag className="h-4 w-4 text-red-400" />
              </div>
              <p className="mt-2 font-display text-3xl font-extrabold text-white tabular-nums">
                {stats.pending_reports + stats.pending_verifications}
              </p>
              <p className="mt-1 text-xs text-stone-400 tabular-nums">
                {t('admin.kpi.moderationSub', {
                  reports: stats.pending_reports,
                  verifs: stats.pending_verifications,
                })}
              </p>
            </div>
          </div>

          <MonthlySignupsChart
            data={monthlySignups}
            monthsWindow={monthsWindow}
            onChangeWindow={setMonthsWindow}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <MonthlyRevenueChart data={monthlySignups} />
            <CountryDistributionChart data={countryDistribution} />
          </div>

          <div className="zola-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-bold text-white">{t('admin.csv.title')}</h2>
              <p className="text-xs text-stone-400">{t('admin.csv.desc')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { type: 'users', label: t('admin.csv.users') },
                { type: 'payments', label: t('admin.csv.payments') },
                { type: 'reports', label: t('admin.csv.reports') },
              ].map((exp) => (
                <a
                  key={exp.type}
                  href={`/api/admin/export/${exp.type}`}
                  download={`${brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'export'}-${exp.type}.csv`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
                >
                  <Download className="h-3.5 w-3.5 text-orange-400" />
                  {exp.label}
                </a>
              ))}
            </div>
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
              placeholder={t('admin.users.search')}
              className="w-full max-w-sm rounded-xl border border-white/12 bg-white/5 px-3.5 py-2 text-sm text-white"
            />
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-white/12 px-3 py-1.5 text-stone-300 disabled:opacity-40"
              >
                {t('admin.users.prev')}
              </button>
              <span className="text-stone-400 tabular-nums">Page {page}</span>
              <button
                type="button"
                disabled={users.length < 25}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-white/12 px-3 py-1.5 text-stone-300 disabled:opacity-40"
              >
                {t('admin.users.next')}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/10 text-stone-400">
                  <th className="py-2.5 pr-4">{t('admin.users.col.member')}</th>
                  <th className="py-2.5 pr-4">{t('admin.users.col.location')}</th>
                  <th className="py-2.5 pr-4">{t('admin.users.col.role')}</th>
                  <th className="py-2.5 pr-4">{t('admin.users.col.status')}</th>
                  <th className="py-2.5 text-right">{t('admin.users.col.actions')}</th>
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
                      {u.city}, {tCountry(u.country)}
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
                        {u.status === 'active' ? t('admin.users.active') : t('admin.users.suspended')}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateUser(u.id, { is_verified: !u.is_verified })}
                          className="rounded-lg border border-white/12 bg-white/5 px-2.5 py-1 text-xs text-sky-300 hover:bg-white/10"
                        >
                          {u.is_verified ? t('admin.users.unverify') : t('admin.users.verify')}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateUser(u.id, { status: u.status === 'active' ? 'suspended' : 'active' })
                          }
                          className="rounded-lg border border-white/12 bg-white/5 px-2.5 py-1 text-xs text-amber-300 hover:bg-white/10"
                        >
                          {u.status === 'active' ? t('admin.users.suspend') : t('admin.users.reactivate')}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteUser(u.id)}
                          title="Delete"
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
          <h2 className="font-display text-lg font-bold text-white">{t('admin.verifs.title')}</h2>
          {verifications.length === 0 ? (
            <p className="text-sm text-stone-400">{t('admin.verifs.empty')}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {verifications.map((v) => (
                <div key={v.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex gap-4">
                  <img
                    src={`/api/admin/verifications/${v.id}/photo`}
                    alt=""
                    className="h-28 w-24 rounded-xl object-cover bg-black/40 shrink-0"
                  />
                  <div className="flex-1 space-y-2">
                    <p className="font-semibold text-white text-sm">{v.full_name}</p>
                    <p className="text-xs text-stone-400">
                      {v.city}, {tCountry(v.country || '')} · Code:{' '}
                      <span className="font-mono text-amber-300">{v.challenge_code}</span>
                    </p>
                    {v.status === 'pending' ? (
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleVerification(v.id, 'approved')}
                          className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white"
                        >
                          {t('admin.verifs.approve')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVerification(v.id, 'rejected')}
                          className="rounded-full border border-red-500/30 px-3 py-1 text-xs text-red-300"
                        >
                          {t('admin.verifs.reject')}
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`inline-block text-xs font-semibold ${
                          v.status === 'approved' ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {v.status === 'approved' ? t('admin.verifs.approved') : t('admin.verifs.rejected')}
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
            <p className="text-sm text-stone-400">{t('admin.reports.empty')}</p>
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
                        <span className="text-xs font-normal text-stone-400">
                          {t('admin.reports.reportedBy', { name: r.reporter_name })}
                        </span>
                      </p>
                      <p className="text-xs text-orange-300 mt-0.5">{tReportReason(r.reason)}</p>
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
                          {t('admin.reports.suspendResolve')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReport(r.id, 'dismissed', false)}
                          className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-xs text-stone-300"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          {t('admin.reports.dismiss')}
                        </button>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {r.status === 'resolved' ? t('admin.reports.resolved') : t('admin.reports.dismissed')}
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
          <div className="zola-card rounded-2xl p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-white">{t('admin.plans.title')}</h2>
              <span className="text-xs text-stone-400">{plans.length} formule(s)</span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((p) => (
                <div key={p.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-stone-400">#{p.id}</span>
                    <button
                      type="button"
                      onClick={() => handleDeletePlan(p)}
                      title="Supprimer / Archiver"
                      className="rounded-lg border border-red-500/25 bg-red-500/10 p-1.5 text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Nom de la formule</label>
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) =>
                        setPlans((prev) =>
                          prev.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x))
                        )
                      }
                      className="w-full rounded-xl border border-white/12 bg-black/30 px-3 py-2 text-sm font-semibold text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-stone-400 mb-1">Durée (mois)</label>
                      <input
                        type="number"
                        min={1}
                        value={p.duration_months}
                        onChange={(e) =>
                          setPlans((prev) =>
                            prev.map((x) =>
                              x.id === p.id ? { ...x, duration_months: Number(e.target.value) || 1 } : x
                            )
                          )
                        }
                        className="w-full rounded-xl border border-white/12 bg-black/30 px-3 py-2 text-xs text-white tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-stone-400 mb-1">{t('admin.plans.price')}</label>
                      <input
                        type="number"
                        min={0}
                        value={p.price_fcfa}
                        onChange={(e) =>
                          setPlans((prev) =>
                            prev.map((x) => (x.id === p.id ? { ...x, price_fcfa: Number(e.target.value) || 0 } : x))
                          )
                        }
                        className="w-full rounded-xl border border-white/12 bg-black/30 px-3 py-2 text-xs text-white tabular-nums"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Avantages (1 par ligne)</label>
                    <textarea
                      rows={3}
                      value={(p.features || []).join('\n')}
                      onChange={(e) =>
                        setPlans((prev) =>
                          prev.map((x) =>
                            x.id === p.id
                              ? { ...x, features: e.target.value.split('\n').map((s) => s.trimStart()) }
                              : x
                          )
                        )
                      }
                      className="w-full rounded-xl border border-white/12 bg-black/30 px-3 py-2 text-xs text-stone-200"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs text-stone-300">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(p.is_popular)}
                        onChange={(e) =>
                          setPlans((prev) =>
                            prev.map((x) => (x.id === p.id ? { ...x, is_popular: e.target.checked } : x))
                          )
                        }
                        className="accent-orange-500"
                      />
                      {t('admin.plans.popular')}
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(p.active)}
                        onChange={(e) =>
                          setPlans((prev) =>
                            prev.map((x) => (x.id === p.id ? { ...x, active: e.target.checked } : x))
                          )
                        }
                        className="accent-emerald-500"
                      />
                      Actif
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleSavePlan({
                        ...p,
                        features: (p.features || []).map((f) => f.trim()).filter(Boolean),
                      })
                    }
                    className="zola-gradient w-full rounded-full py-2 text-xs font-semibold text-white"
                  >
                    {t('admin.plans.save')}
                  </button>
                </div>
              ))}
            </div>

            <form
              onSubmit={handleCreatePlan}
              className="rounded-2xl border border-dashed border-orange-500/35 bg-orange-500/[0.04] p-4 space-y-3"
            >
              <div className="flex items-center gap-2 text-sm font-display font-bold text-orange-300">
                <Plus className="h-4 w-4" />
                Créer une nouvelle formule d'abonnement
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <input
                  type="text"
                  required
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  placeholder="Nom (ex: 12 Mois)"
                  className="rounded-xl border border-white/12 bg-black/30 px-3 py-2 text-xs text-white"
                />
                <input
                  type="text"
                  value={newPlan.slug}
                  onChange={(e) => setNewPlan({ ...newPlan, slug: e.target.value })}
                  placeholder="Slug (optionnel)"
                  className="rounded-xl border border-white/12 bg-black/30 px-3 py-2 text-xs text-white"
                />
                <input
                  type="number"
                  min={1}
                  value={newPlan.duration_months}
                  onChange={(e) => setNewPlan({ ...newPlan, duration_months: Number(e.target.value) || 1 })}
                  placeholder="Mois"
                  className="rounded-xl border border-white/12 bg-black/30 px-3 py-2 text-xs text-white tabular-nums"
                />
                <input
                  type="number"
                  min={0}
                  value={newPlan.price_fcfa}
                  onChange={(e) => setNewPlan({ ...newPlan, price_fcfa: Number(e.target.value) || 0 })}
                  placeholder="Prix FCFA"
                  className="rounded-xl border border-white/12 bg-black/30 px-3 py-2 text-xs text-white tabular-nums"
                />
              </div>
              <textarea
                rows={2}
                value={newPlan.featuresText}
                onChange={(e) => setNewPlan({ ...newPlan, featuresText: e.target.value })}
                placeholder="Avantages (1 par ligne)"
                className="w-full rounded-xl border border-white/12 bg-black/30 px-3 py-2 text-xs text-stone-200"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs text-stone-300">
                  <input
                    type="checkbox"
                    checked={newPlan.is_popular}
                    onChange={(e) => setNewPlan({ ...newPlan, is_popular: e.target.checked })}
                    className="accent-orange-500"
                  />
                  {t('admin.plans.popular')}
                </label>
                <button
                  type="submit"
                  className="zola-gradient inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-semibold text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter la formule
                </button>
              </div>
            </form>
          </div>

          <div className="zola-card rounded-2xl p-5 space-y-3">
            <h2 className="font-display text-lg font-bold text-white">{t('admin.tx.title')}</h2>
            {payments.length === 0 ? (
              <p className="text-sm text-stone-400">{t('admin.tx.empty')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-stone-400">
                      <th className="py-2 pr-3">{t('premium.col.ref')}</th>
                      <th className="py-2 pr-3">{t('admin.users.col.member')}</th>
                      <th className="py-2 pr-3">{t('premium.col.plan')}</th>
                      <th className="py-2 pr-3">{t('premium.col.amount')}</th>
                      <th className="py-2">{t('premium.col.status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {payments.map((pay) => (
                      <tr key={pay.id}>
                        <td className="py-2.5 pr-3 font-mono text-xs text-stone-300">{pay.reference}</td>
                        <td className="py-2.5 pr-3 text-white">{pay.user_name}</td>
                        <td className="py-2.5 pr-3 text-stone-300">{tPlanName(pay.plan_name)}</td>
                        <td className="py-2.5 pr-3 text-amber-300 tabular-nums">
                          {pay.amount_fcfa.toLocaleString(locale)} FCFA
                        </td>
                        <td className="py-2.5">
                          <span className={pay.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'}>
                            {pay.status === 'completed'
                              ? t('premium.tx.completed')
                              : pay.status === 'pending'
                                ? t('premium.tx.pending')
                                : pay.status}
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

      {tab === 'audit' && (
        <div className="zola-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-white font-display font-bold text-lg">
            <History className="h-5 w-5 text-orange-400" />
            {t('admin.audit.title')}
          </div>
          {auditLogs.length === 0 ? (
            <p className="text-sm text-stone-400">{t('admin.audit.empty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-stone-400">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Admin</th>
                    <th className="py-2 pr-3">Action</th>
                    <th className="py-2 pr-3">Target</th>
                    <th className="py-2">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 pr-3 font-mono text-xs text-stone-400 tabular-nums">{log.created_at}</td>
                      <td className="py-2.5 pr-3 text-white font-medium">{log.admin_name}</td>
                      <td className="py-2.5 pr-3">
                        <span className="rounded-full bg-orange-500/15 border border-orange-500/30 px-2.5 py-0.5 text-xs text-orange-300 font-mono">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-stone-300 text-xs">
                        {log.target_type} #{log.target_id}
                      </td>
                      <td className="py-2.5 text-stone-400 text-xs">{log.details || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'settings' && settings && (
        <AdminCmsPanel
          settings={settings}
          setSettings={setSettings}
          interests={interests}
          onReloadAdmin={loadData}
          onSettingsUpdated={onSettingsUpdated}
          setFeedback={setFeedback}
        />
      )}
    </div>
  );
};
