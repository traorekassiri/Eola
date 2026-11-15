<?php
declare(strict_types=1);

final class SubscriptionModel
{
    public function __construct(private PDO $pdo) {}

    public function getActivePlans(): array
    {
        return $this->pdo->query('SELECT * FROM subscription_plans WHERE active = 1 ORDER BY duration_months ASC')->fetchAll();
    }

    public function createPaymentIntent(int $userId, int $planId, string $provider): array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM subscription_plans WHERE id = ? AND active = 1');
        $stmt->execute([$planId]);
        $plan = $stmt->fetch();
        if (!$plan) {
            throw new RuntimeException('Formule introuvable.');
        }

        $ref = 'ZOLA-' . time() . '-' . strtoupper(bin2hex(random_bytes(4)));
        $hmac = hash_hmac('sha256', "{$ref}:{$userId}:{$plan['id']}:{$plan['price_fcfa']}", PAYMENT_WEBHOOK_SECRET);

        $ins = $this->pdo->prepare(
            'INSERT INTO payments (user_id, plan_id, amount_fcfa, currency, provider, reference, verification_hmac, status)
             VALUES (?, ?, ?, "XOF", ?, ?, ?, "pending")'
        );
        $ins->execute([$userId, $plan['id'], $plan['price_fcfa'], $provider, $ref, $hmac]);

        return ['reference' => $ref, 'amount_fcfa' => $plan['price_fcfa'], 'verification_token' => $hmac];
    }

    public function verifyAndActivate(int $userId, string $reference, string $providedHmac): void
    {
        $stmt = $this->pdo->prepare(
            'SELECT p.*, sp.duration_months FROM payments p JOIN subscription_plans sp ON sp.id = p.plan_id WHERE p.reference = ? AND p.user_id = ?'
        );
        $stmt->execute([$reference, $userId]);
        $payment = $stmt->fetch();
        if (!$payment) {
            throw new RuntimeException('Paiement introuvable.');
        }

        $expected = hash_hmac('sha256', "{$reference}:{$userId}:{$payment['plan_id']}:{$payment['amount_fcfa']}", PAYMENT_WEBHOOK_SECRET);
        if (!hash_equals($expected, $providedHmac)) {
            $this->pdo->prepare('UPDATE payments SET status = "failed" WHERE id = ?')->execute([$payment['id']]);
            throw new RuntimeException('Signature de paiement invalide.');
        }

        $this->pdo->beginTransaction();
        try {
            $this->pdo->prepare('UPDATE payments SET status = "completed", verified_at = NOW() WHERE id = ?')->execute([$payment['id']]);
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
