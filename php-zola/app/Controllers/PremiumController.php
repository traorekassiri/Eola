<?php
declare(strict_types=1);

final class PremiumController extends Controller
{
    public function showPage(): void
    {
        $uid = Security::requireAuth();
        $model = new SubscriptionModel($this->pdo);
        $plans = $model->getActivePlans();
        $payStmt = $this->pdo->prepare('SELECT p.*, sp.name AS plan_name FROM payments p JOIN subscription_plans sp ON sp.id = p.plan_id WHERE p.user_id = ? ORDER BY p.id DESC');
        $payStmt->execute([$uid]);
        $this->render('premium', [
            'title' => 'Devenez Premium — ZOLA',
            'plans' => $plans,
            'payments' => $payStmt->fetchAll(),
        ]);
    }

    public function checkout(): void
    {
        $uid = Security::requireAuth();
        Security::verifyCsrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);
        $planId = (int) ($_POST['plan_id'] ?? 0);
        $provider = 'SasPay · Mobile Money & Carte';
        $intent = (new SubscriptionModel($this->pdo))->createPaymentIntent($uid, $planId, $provider);
        $this->json(['payment_intent' => $intent], 201);
    }

    public function verify(): void
    {
        $uid = Security::requireAuth();
        Security::verifyCsrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);
        (new SubscriptionModel($this->pdo))->verifyAndActivate(
            $uid,
            (string) ($_POST['reference'] ?? ''),
            (string) ($_POST['verification_token'] ?? '')
        );
        $this->json(['ok' => true]);
    }

    public function webhookSaspay(): void
    {
        $rawBody = file_get_contents('php://input') ?: '';
        $ts = (string) ($_SERVER['HTTP_X_WEBHOOK_TIMESTAMP'] ?? '');
        $sig = (string) ($_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] ?? '');
        $evt = (string) ($_SERVER['HTTP_X_WEBHOOK_EVENT'] ?? '');
        try {
            $status = (new SubscriptionModel($this->pdo))->handleSaspayWebhook($rawBody, $ts, $sig, $evt);
            $this->json(['ok' => true, 'status' => $status]);
        } catch (RuntimeException $e) {
            $this->json(['error' => $e->getMessage()], 403);
        }
    }
}
