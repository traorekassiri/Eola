<?php
declare(strict_types=1);

final class SubscriptionModel
{
    public function __construct(private PDO $pdo) {}

    public function getActivePlans(): array
    {
        return $this->pdo->query('SELECT * FROM subscription_plans WHERE active = 1 ORDER BY duration_months ASC')->fetchAll();
    }

    public function createPaymentIntent(int $userId, int $planId, string $provider = 'SasPay · Mobile Money & Carte'): array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM subscription_plans WHERE id = ? AND active = 1');
        $stmt->execute([$planId]);
        $plan = $stmt->fetch();
        if (!$plan) {
            throw new RuntimeException('Formule introuvable.');
        }

        $userStmt = $this->pdo->prepare(
            'SELECT u.email, COALESCE(up.full_name, u.email) AS full_name
             FROM users u
             LEFT JOIN user_profiles up ON up.user_id = u.id
             WHERE u.id = ?'
        );
        $userStmt->execute([$userId]);
        $payer = $userStmt->fetch() ?: ['email' => '', 'full_name' => 'Membre ZOLA'];

        $ref = 'ZOLA-' . time() . '-' . strtoupper(bin2hex(random_bytes(4)));
        $amountDecimal = number_format((float) $plan['price_fcfa'], 2, '.', '');
        $hmac = hash_hmac('sha256', "{$ref}:{$userId}:{$plan['id']}:{$plan['price_fcfa']}", PAYMENT_WEBHOOK_SECRET);

        $sasSessionId = null;
        $checkoutUrl = null;

        if (SASPAY_SECRET_KEY !== '') {
            $ch = curl_init(SASPAY_BASE_URL . '/checkout-sessions/');
            $payload = json_encode([
                'amount' => $amountDecimal,
                'currency' => 'XOF',
                'description' => 'Abonnement ZOLA Premium - ' . $plan['name'],
                'reference' => $ref,
                'customer_email' => $payer['email'],
                'customer_name' => $payer['full_name'],
                'return_url' => rtrim(APP_URL, '/') . '/premium?saspay_ref=' . urlencode($ref),
            ], JSON_UNESCAPED_SLASHES);

            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_HTTPHEADER => [
                    'Authorization: Bearer ' . SASPAY_SECRET_KEY,
                    'Content-Type: application/json',
                ],
                CURLOPT_POSTFIELDS => $payload,
                CURLOPT_TIMEOUT => 15,
            ]);
            $raw = curl_exec($ch);
            $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            $decoded = is_string($raw) ? (json_decode($raw, true) ?: []) : [];
            if ($code < 200 || $code >= 300) {
                $err = $decoded['detail'] ?? $decoded['message'] ?? $decoded['error'] ?? ('Erreur SasPay (' . $code . ')');
                throw new RuntimeException('Passerelle SasPay indisponible : ' . $err);
            }

            $nested = is_array($decoded['data'] ?? null) ? $decoded['data'] : [];
            $sasSessionId = $decoded['id'] ?? $decoded['session_id'] ?? $nested['id'] ?? $nested['session_id'] ?? null;
            $checkoutUrl = $decoded['checkout_url'] ?? $decoded['url'] ?? $nested['checkout_url'] ?? $nested['url'] ?? null;
        }

        $ins = $this->pdo->prepare(
            'INSERT INTO payments (user_id, plan_id, amount_fcfa, currency, provider, gateway, reference, verification_hmac, saspay_session_id, checkout_url, status)
             VALUES (?, ?, ?, "XOF", ?, "saspay", ?, ?, ?, ?, "pending")'
        );
        $ins->execute([$userId, $plan['id'], $plan['price_fcfa'], $provider, $ref, $hmac, $sasSessionId, $checkoutUrl]);

        return [
            'reference' => $ref,
            'amount_fcfa' => (int) $plan['price_fcfa'],
            'amount_decimal' => $amountDecimal,
            'currency' => 'XOF',
            'gateway' => 'saspay',
            'provider' => $provider,
            'session_id' => $sasSessionId,
            'checkout_url' => $checkoutUrl,
            'verification_token' => $hmac,
        ];
    }

    public function verifyAndActivate(int $userId, string $reference, string $providedHmac = ''): void
    {
        $stmt = $this->pdo->prepare(
            'SELECT p.*, sp.duration_months FROM payments p JOIN subscription_plans sp ON sp.id = p.plan_id WHERE p.reference = ? AND p.user_id = ?'
        );
        $stmt->execute([$reference, $userId]);
        $payment = $stmt->fetch();
        if (!$payment) {
            throw new RuntimeException('Paiement introuvable.');
        }
        if ($payment['status'] === 'completed') {
            return;
        }

        $webhookPayload = null;
        if (!empty($payment['saspay_session_id']) && SASPAY_SECRET_KEY !== '') {
            $ch = curl_init(SASPAY_BASE_URL . '/checkout-sessions/' . rawurlencode((string) $payment['saspay_session_id']) . '/status/');
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . SASPAY_SECRET_KEY],
                CURLOPT_TIMEOUT => 15,
            ]);
            $raw = curl_exec($ch);
            $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($code < 200 || $code >= 300 || !is_string($raw)) {
                throw new RuntimeException('Impossible de vérifier le statut SasPay.');
            }
            $decoded = json_decode($raw, true) ?: [];
            $nested = is_array($decoded['data'] ?? null) ? $decoded['data'] : [];
            $sasStatus = strtolower((string) ($decoded['status'] ?? $nested['status'] ?? ''));
            if (!in_array($sasStatus, ['completed', 'success', 'succeeded', 'paid'], true)) {
                if (in_array($sasStatus, ['failed', 'cancelled', 'expired'], true)) {
                    $this->pdo->prepare('UPDATE payments SET status = "failed", webhook_payload = ? WHERE id = ?')->execute([$raw, $payment['id']]);
                    throw new RuntimeException('Paiement SasPay annulé ou échoué.');
                }
                throw new RuntimeException('Paiement SasPay en attente de confirmation.');
            }
            $webhookPayload = $raw;
        } else {
            $expected = hash_hmac('sha256', "{$reference}:{$userId}:{$payment['plan_id']}:{$payment['amount_fcfa']}", PAYMENT_WEBHOOK_SECRET);
            if (!hash_equals($expected, $providedHmac)) {
                $this->pdo->prepare('UPDATE payments SET status = "failed" WHERE id = ?')->execute([$payment['id']]);
                throw new RuntimeException('Signature de paiement SasPay invalide.');
            }
        }

        $this->activatePaymentRow($payment, $webhookPayload);
    }

    public function handleSaspayWebhook(string $rawBody, string $timestamp, string $signature, string $event): string
    {
        if ($timestamp === '' || !ctype_digit($timestamp) || abs(time() - (int) $timestamp) > 300) {
            throw new RuntimeException('Timestamp webhook SasPay manquant ou expiré.');
        }
        $expected = strtolower(hash_hmac('sha256', "{$timestamp}.{$rawBody}", SASPAY_WEBHOOK_SECRET));
        if ($signature === '' || !hash_equals($expected, strtolower(trim($signature)))) {
            throw new RuntimeException('Signature webhook SasPay invalide.');
        }

        $decoded = json_decode($rawBody, true) ?: [];
        $data = is_array($decoded['data'] ?? null) ? $decoded['data'] : [];
        $reference = (string) ($decoded['reference'] ?? $data['reference'] ?? '');

        $stmt = $this->pdo->prepare(
            'SELECT p.*, sp.duration_months FROM payments p JOIN subscription_plans sp ON sp.id = p.plan_id WHERE p.reference = ?'
        );
        $stmt->execute([$reference]);
        $payment = $stmt->fetch();
        if (!$payment) {
            throw new RuntimeException('Référence SasPay inconnue.');
        }

        $evt = strtolower(trim($event ?: (string) ($decoded['event'] ?? '')));
        if (in_array($evt, ['transaction.failed', 'transaction.cancelled'], true)) {
            if ($payment['status'] !== 'completed') {
                $this->pdo->prepare('UPDATE payments SET status = "failed", webhook_payload = ? WHERE id = ?')->execute([$rawBody, $payment['id']]);
            }
            return 'failed';
        }

        $status = strtolower((string) ($decoded['status'] ?? $data['status'] ?? ''));
        if ($evt === 'transaction.success' || in_array($status, ['completed', 'success', 'succeeded', 'paid'], true)) {
            if ($payment['status'] !== 'completed') {
                $this->activatePaymentRow($payment, $rawBody);
            }
            return 'completed';
        }

        return 'ignored';
    }

    private function activatePaymentRow(array $payment, ?string $webhookPayload = null): void
    {
        $userId = (int) $payment['user_id'];
        $this->pdo->beginTransaction();
        try {
            $this->pdo->prepare('UPDATE payments SET status = "completed", verified_at = NOW(), webhook_payload = COALESCE(?, webhook_payload) WHERE id = ?')
                ->execute([$webhookPayload, $payment['id']]);
            $this->pdo->prepare('UPDATE subscriptions SET status = "expired" WHERE user_id = ? AND status = "active"')->execute([$userId]);
            $months = (int) $payment['duration_months'];
            $this->pdo->prepare(
                "INSERT INTO subscriptions (user_id, plan_id, status, started_at, expires_at) VALUES (?, ?, 'active', NOW(), DATE_ADD(NOW(), INTERVAL {$months} MONTH))"
            )->execute([$userId, $payment['plan_id']]);
            $this->pdo->commit();
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
}
