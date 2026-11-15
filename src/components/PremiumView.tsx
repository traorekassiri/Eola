import React, { useCallback, useEffect, useState } from 'react';
import { Check, Crown, FileText, Lock, ShieldCheck } from 'lucide-react';
import savannaImg from '../assets/images/zola_savanna_sunset_1794726545758.jpg';
import { apiFetch } from '../lib/api';
import type { PaymentRecord, SubscriptionPlan, UserProfile } from '../types';

interface PremiumViewProps {
  onUserUpdated: (user: UserProfile) => void;
}

const GATEWAYS = [
  { id: 'cinetpay', label: 'CinetPay · Orange Money / MTN / Moov' },
  { id: 'fedapay', label: 'FedaPay · Mobile Money Afrique de l’Ouest' },
  { id: 'wave', label: 'Wave Mobile Money' },
  { id: 'card', label: 'Carte Bancaire Visa / Mastercard' },
];

export const PremiumView: React.FC<PremiumViewProps> = ({ onUserUpdated }) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [activeSub, setActiveSub] = useState<{
    plan_name: string;
    started_at: string;
    expires_at: string;
    status: string;
  } | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [gateway, setGateway] = useState('cinetpay');
  const [checkoutIntent, setCheckoutIntent] = useState<{
    reference: string;
    amount_fcfa: number;
    plan_name: string;
    provider: string;
    gateway: string;
    verification_token: string;
  } | null>(null);
  const [receipt, setReceipt] = useState<{
    reference: string;
    amount_fcfa: number;
    currency: string;
    provider: string;
    status: string;
    verified_at: string | null;
    plan_name: string;
    duration_months: number;
    full_name: string;
    email: string;
  } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadStatus = useCallback(async () => {
    const data = await apiFetch<{
      plans: SubscriptionPlan[];
      active_subscription: {
        plan_name: string;
        started_at: string;
        expires_at: string;
        status: string;
      } | null;
      payments: PaymentRecord[];
    }>('/api/premium/status');
    setPlans(data.plans);
    setActiveSub(data.active_subscription);
    setPayments(data.payments);
    const popular = data.plans.find((p) => p.is_popular) || data.plans[0];
    if (popular && !selectedPlanId) setSelectedPlanId(popular.id);
  }, [selectedPlanId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleCreateIntent = async () => {
    if (!selectedPlanId) return;
    setError('');
    setMessage('');
    setProcessing(true);
    try {
      const gw = GATEWAYS.find((g) => g.id === gateway);
      const data = await apiFetch<{
        payment_intent: {
          reference: string;
          amount_fcfa: number;
          plan_name: string;
          provider: string;
          gateway: string;
          verification_token: string;
        };
      }>('/api/premium/checkout', {
        method: 'POST',
        body: JSON.stringify({
          plan_id: selectedPlanId,
          gateway,
          provider: gw?.label || 'Mobile Money',
        }),
      });
      setCheckoutIntent(data.payment_intent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’initier le paiement.');
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmServerPayment = async () => {
    if (!checkoutIntent) return;
    setProcessing(true);
    setError('');
    try {
      const data = await apiFetch<{ ok: boolean; user: UserProfile }>('/api/premium/verify', {
        method: 'POST',
        body: JSON.stringify({
          reference: checkoutIntent.reference,
          verification_token: checkoutIntent.verification_token,
        }),
      });
      onUserUpdated(data.user);
      setCheckoutIntent(null);
      setMessage('Paiement vérifié côté serveur et abonnement ZOLA Premium activé !');
      loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de vérification du paiement.');
    } finally {
      setProcessing(false);
    }
  };

  const openReceipt = async (reference: string) => {
    const data = await apiFetch<{ receipt: typeof receipt }>(`/api/premium/receipt/${reference}`);
    setReceipt(data.receipt);
  };

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-amber-400/25 bg-[#120C0B] p-6 sm:p-10">
        <img
          src={savannaImg}
          alt="Paysage africain au crépuscule"
          className="absolute inset-0 h-full w-full object-cover opacity-35 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#120C0B]/70 via-[#120C0B]/80 to-[#0B0909] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-3xl text-center space-y-6">
          <div>
            <Crown className="mx-auto h-12 w-12 text-amber-400 fill-amber-400 mb-2" />
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-amber-300">
              Devenez Premium
            </h1>
            <p className="mt-1.5 text-sm sm:text-base text-stone-200">Profitez de plus d'avantages</p>
          </div>

          {message && (
            <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200">
              {message}
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-red-500/35 bg-red-500/15 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="mx-auto max-w-md space-y-2.5 text-left text-sm sm:text-base text-stone-100">
            {[
              'Voir qui vous a liké',
              'Envoyer des messages illimités',
              'Remonter son profil',
              'Accès aux filtres avancés',
            ].map((benefit) => (
              <div key={benefit} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-orange-500 text-white shrink-0">
                  <Check className="h-4 w-4" />
                </span>
                <span>{benefit}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
            {plans.map((plan) => {
              const selected = selectedPlanId === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`relative rounded-2xl p-5 text-center transition-all ${
                    selected
                      ? 'border-2 border-amber-400 bg-black/75 shadow-xl shadow-orange-600/25 scale-[1.02]'
                      : 'border border-white/15 bg-black/55 hover:border-white/30'
                  }`}
                >
                  {plan.is_popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-0.5 text-[11px] font-bold text-stone-950">
                      Populaire
                    </span>
                  )}
                  <p className="font-display text-base font-bold text-white">{plan.name}</p>
                  <p className="mt-2 font-display text-xl font-extrabold text-amber-300 tabular-nums">
                    {plan.price_fcfa.toLocaleString('fr-FR')} FCFA
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mx-auto max-w-md space-y-3">
            <select
              value={gateway}
              onChange={(e) => setGateway(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-black/60 px-4 py-2.5 text-sm text-white"
            >
              {GATEWAYS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={processing || !selectedPlanId}
              onClick={handleCreateIntent}
              className="zola-gradient zola-gradient-hover w-full rounded-full py-3.5 text-base font-bold text-white shadow-xl shadow-orange-600/30 disabled:opacity-60"
            >
              {processing ? 'Initialisation...' : 'Souscrire maintenant'}
            </button>
            <p className="flex items-center justify-center gap-1.5 text-xs text-stone-400">
              <Lock className="h-3.5 w-3.5" />
              Paiement sécurisé avec vérification HMAC et webhook côté serveur
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="zola-card rounded-2xl p-6 lg:col-span-5 space-y-3">
          <h2 className="font-display text-lg font-bold text-white">Statut de l'abonnement</h2>
          {activeSub ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-400">Formule</span>
                <span className="font-semibold text-amber-300">{activeSub.plan_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Statut</span>
                <span className="font-semibold text-emerald-400">Actif</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Début</span>
                <span className="text-stone-200 tabular-nums">{activeSub.started_at.slice(0, 10)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Expiration</span>
                <span className="text-stone-200 tabular-nums">{activeSub.expires_at.slice(0, 10)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-stone-400">
              Vous utilisez actuellement le compte gratuit. Choisissez une formule ci-dessus pour activer ZOLA Premium.
            </p>
          )}
        </div>

        <div className="zola-card rounded-2xl p-6 lg:col-span-7 space-y-3">
          <h2 className="font-display text-lg font-bold text-white">Historique des paiements</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-stone-400">Aucune transaction enregistrée.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-stone-400">
                    <th className="py-2 pr-3">Référence</th>
                    <th className="py-2 pr-3">Formule</th>
                    <th className="py-2 pr-3">Montant</th>
                    <th className="py-2 pr-3">Statut</th>
                    <th className="py-2 text-right">Reçu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {payments.map((pay) => (
                    <tr key={pay.id}>
                      <td className="py-2.5 pr-3 font-mono text-xs text-stone-300">{pay.reference}</td>
                      <td className="py-2.5 pr-3 text-white">{pay.plan_name}</td>
                      <td className="py-2.5 pr-3 text-amber-300 tabular-nums">
                        {pay.amount_fcfa.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="py-2.5 pr-3">
                        <span
                          className={
                            pay.status === 'completed'
                              ? 'text-emerald-400'
                              : pay.status === 'pending'
                                ? 'text-amber-400'
                                : 'text-red-400'
                          }
                        >
                          {pay.status === 'completed' ? 'Confirmé' : pay.status === 'pending' ? 'En attente' : 'Échoué'}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        {pay.status === 'completed' && (
                          <button
                            type="button"
                            onClick={() => openReceipt(pay.reference)}
                            className="inline-flex items-center gap-1 rounded-lg border border-white/12 bg-white/5 px-2.5 py-1 text-xs text-stone-200 hover:bg-white/10"
                          >
                            <FileText className="h-3.5 w-3.5 text-amber-400" />
                            Reçu
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {checkoutIntent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="zola-card w-full max-w-md rounded-3xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-7 w-7 text-emerald-400" />
              <div>
                <h3 className="font-display text-lg font-bold text-white">Confirmation de paiement</h3>
                <p className="text-xs text-stone-400">{checkoutIntent.provider}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-400">Référence</span>
                <span className="font-mono text-xs text-white">{checkoutIntent.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Formule</span>
                <span className="font-semibold text-white">{checkoutIntent.plan_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Total à payer</span>
                <span className="font-bold text-amber-300 tabular-nums">
                  {checkoutIntent.amount_fcfa.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed">
              L'activation s'effectue uniquement après validation cryptographique HMAC de la passerelle côté serveur (`/api/premium/verify` ou `/api/premium/webhook/{checkoutIntent.gateway}`).
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCheckoutIntent(null)}
                className="rounded-full border border-white/15 px-4 py-2 text-sm text-stone-300"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={handleConfirmServerPayment}
                className="zola-gradient rounded-full px-5 py-2 text-sm font-semibold text-white"
              >
                {processing ? 'Vérification...' : 'Valider le paiement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="zola-card w-full max-w-md rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-display text-lg font-bold text-white">Reçu de paiement ZOLA</h3>
              <span className="text-xs text-emerald-400 font-semibold">Payé</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-400">Référence</span>
                <span className="font-mono text-xs text-white">{receipt.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Membre</span>
                <span className="text-white">{receipt.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Email</span>
                <span className="text-stone-300">{receipt.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Formule</span>
                <span className="text-white">{receipt.plan_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Passerelle</span>
                <span className="text-stone-300">{receipt.provider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Date de validation</span>
                <span className="text-stone-300 tabular-nums">{receipt.verified_at || '-'}</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-2">
                <span className="font-semibold text-white">Montant payé</span>
                <span className="font-bold text-amber-300 tabular-nums">
                  {receipt.amount_fcfa.toLocaleString('fr-FR')} {receipt.currency}
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white hover:bg-white/10"
              >
                Imprimer
              </button>
              <button
                type="button"
                onClick={() => setReceipt(null)}
                className="zola-gradient rounded-full px-5 py-2 text-xs font-semibold text-white"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
