<?php
declare(strict_types=1);

final class AdminController extends Controller
{
    private function collectStats(): array
    {
        return [
            'total_users' => (int) $this->pdo->query('SELECT COUNT(*) FROM users')->fetchColumn(),
            'total_matches' => (int) $this->pdo->query('SELECT COUNT(*) FROM matches')->fetchColumn(),
            'total_revenue_fcfa' => (int) $this->pdo->query('SELECT COALESCE(SUM(amount_fcfa), 0) FROM payments WHERE status = "completed"')->fetchColumn(),
            'pending_reports' => (int) $this->pdo->query('SELECT COUNT(*) FROM reports WHERE status = "pending"')->fetchColumn(),
            'pending_verifications' => (int) $this->pdo->query('SELECT COUNT(*) FROM verification_requests WHERE status = "pending"')->fetchColumn(),
        ];
    }

    public function showPage(): void
    {
        Security::requireAdmin($this->pdo);
        $this->render('admin', [
            'title' => 'Administration — ZOLA',
            'stats' => $this->collectStats(),
        ]);
    }

    public function overview(): void
    {
        Security::requireAdmin($this->pdo);
        $this->json(['stats' => $this->collectStats()]);
    }

    public function reviewVerification(array $params): void
    {
        $adminId = Security::requireAdmin($this->pdo);
        Security::verifyCsrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);
        $reqId = (int) ($params['id'] ?? 0);
        $decision = $_POST['decision'] ?? '';
        if (!in_array($decision, ['approved', 'rejected'], true)) {
            $this->json(['error' => 'Décision invalide.'], 400);
        }
        $stmt = $this->pdo->prepare('SELECT user_id FROM verification_requests WHERE id = ?');
        $stmt->execute([$reqId]);
        $row = $stmt->fetch();
        if (!$row) {
            $this->json(['error' => 'Demande introuvable.'], 404);
        }
        $this->pdo->prepare('UPDATE verification_requests SET status = ?, admin_note = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?')
            ->execute([$decision, trim($_POST['admin_note'] ?? ''), $adminId, $reqId]);
        if ($decision === 'approved') {
            $this->pdo->prepare('UPDATE users SET is_verified = 1 WHERE id = ?')->execute([$row['user_id']]);
        }
        $this->json(['ok' => true]);
    }
}
