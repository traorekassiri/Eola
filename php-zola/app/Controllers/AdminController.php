<?php
declare(strict_types=1);

final class AdminController extends Controller
{
    private function recordAuditLog(int $adminId, string $action, string $targetType, string $targetId, string $details = ''): void
    {
        $this->pdo->prepare(
            'INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)'
        )->execute([$adminId, $action, $targetType, $targetId, $details]);
    }

    private function collectStats(): array
    {
        $totalUsers = (int) $this->pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
        $activeSubs = (int) $this->pdo->query('SELECT COUNT(*) FROM subscriptions WHERE status = "active" AND expires_at > NOW()')->fetchColumn();
        return [
            'total_users' => $totalUsers,
            'total_matches' => (int) $this->pdo->query('SELECT COUNT(*) FROM matches')->fetchColumn(),
            'active_subscriptions' => $activeSubs,
            'conversion_rate' => $totalUsers > 0 ? round(($activeSubs / $totalUsers) * 100, 1) : 0.0,
            'total_revenue_fcfa' => (int) $this->pdo->query('SELECT COALESCE(SUM(amount_fcfa), 0) FROM payments WHERE status = "completed"')->fetchColumn(),
            'pending_reports' => (int) $this->pdo->query('SELECT COUNT(*) FROM reports WHERE status = "pending"')->fetchColumn(),
            'pending_verifications' => (int) $this->pdo->query('SELECT COUNT(*) FROM verification_requests WHERE status = "pending"')->fetchColumn(),
        ];
    }

    private function collectMonthlySeries(int $monthsWindow = 6): array
    {
        $rows = $this->pdo->query(
            "SELECT DATE_FORMAT(created_at, '%Y-%m') AS ym, COUNT(*) AS cnt FROM users GROUP BY ym ORDER BY ym ASC"
        )->fetchAll();
        $revRows = $this->pdo->query(
            "SELECT DATE_FORMAT(COALESCE(verified_at, created_at), '%Y-%m') AS ym, COALESCE(SUM(amount_fcfa), 0) AS rev FROM payments WHERE status = 'completed' GROUP BY ym"
        )->fetchAll();

        $map = [];
        foreach ($rows as $r) {
            $map[$r['ym']] = (int) $r['cnt'];
        }
        $revMap = [];
        foreach ($revRows as $r) {
            $revMap[$r['ym']] = (int) $r['rev'];
        }

        $monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
        $series = [];
        $now = new DateTimeImmutable('first day of this month');
        for ($i = $monthsWindow - 1; $i >= 0; $i--) {
            $dt = $now->modify("-{$i} months");
            $ym = $dt->format('Y-m');
            $mIdx = (int) $dt->format('n') - 1;
            $series[] = [
                'month' => $ym,
                'label' => $monthNames[$mIdx] . ' ' . $dt->format('y'),
                'count' => $map[$ym] ?? 0,
                'revenue_fcfa' => $revMap[$ym] ?? 0,
            ];
        }
        return $series;
    }

    private function collectCountryDistribution(): array
    {
        return $this->pdo->query(
            'SELECT p.country, COUNT(*) AS count FROM user_profiles p JOIN users u ON u.id = p.user_id GROUP BY p.country ORDER BY count DESC LIMIT 8'
        )->fetchAll();
    }

    private function collectAuditLogs(): array
    {
        return $this->pdo->query(
            'SELECT a.id, up.full_name AS admin_name, a.action, a.target_type, a.target_id, a.details, a.created_at
             FROM admin_audit_logs a JOIN user_profiles up ON up.user_id = a.admin_id ORDER BY a.id DESC LIMIT 60'
        )->fetchAll();
    }

    public function showPage(): void
    {
        Security::requireAdmin($this->pdo);
        $months = ((int) ($_GET['months'] ?? 6)) === 12 ? 12 : 6;
        $this->render('admin', [
            'title' => 'Administration — ZOLA',
            'stats' => $this->collectStats(),
            'monthlySignups' => $this->collectMonthlySeries($months),
            'countryDistribution' => $this->collectCountryDistribution(),
            'auditLogs' => $this->collectAuditLogs(),
        ]);
    }

    public function overview(): void
    {
        Security::requireAdmin($this->pdo);
        $months = ((int) ($_GET['months'] ?? 6)) === 12 ? 12 : 6;
        $this->json([
            'stats' => $this->collectStats(),
            'monthly_signups' => $this->collectMonthlySeries($months),
            'country_distribution' => $this->collectCountryDistribution(),
            'audit_logs' => $this->collectAuditLogs(),
        ]);
    }

    public function exportCsv(array $params): void
    {
        $adminId = Security::requireAdmin($this->pdo);
        $type = $params['type'] ?? 'users';
        if ($type === 'payments') {
            $headers = ['Reference', 'Membre', 'Formule', 'Montant_FCFA', 'Passerelle', 'Statut', 'Date'];
            $rows = $this->pdo->query(
                'SELECT p.reference, up.full_name, sp.name, p.amount_fcfa, p.provider, p.status, p.created_at
                 FROM payments p JOIN user_profiles up ON up.user_id = p.user_id JOIN subscription_plans sp ON sp.id = p.plan_id ORDER BY p.id DESC'
            )->fetchAll(PDO::FETCH_NUM);
        } elseif ($type === 'reports') {
            $headers = ['ID', 'Signalant', 'Signale', 'Motif', 'Statut', 'Date'];
            $rows = $this->pdo->query(
                'SELECT r.id, pr.full_name, pd.full_name, r.reason, r.status, r.created_at
                 FROM reports r JOIN user_profiles pr ON pr.user_id = r.reporter_id JOIN user_profiles pd ON pd.user_id = r.reported_user_id ORDER BY r.id DESC'
            )->fetchAll(PDO::FETCH_NUM);
        } else {
            $type = 'users';
            $headers = ['ID', 'Nom', 'Email', 'Role', 'Statut', 'Verifie', 'Pays', 'Ville', 'Inscription'];
            $rows = $this->pdo->query(
                'SELECT u.id, p.full_name, u.email, u.role, u.status, u.is_verified, p.country, p.city, u.created_at
                 FROM users u JOIN user_profiles p ON p.user_id = u.id ORDER BY u.id DESC'
            )->fetchAll(PDO::FETCH_NUM);
        }

        $this->recordAuditLog($adminId, 'export_csv', $type, $type, 'Export CSV (' . count($rows) . ' lignes)');
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="zola-' . $type . '.csv"');
        $out = fopen('php://output', 'w');
        fwrite($out, "\xEF\xBB\xBF");
        fputcsv($out, $headers);
        foreach ($rows as $r) {
            fputcsv($out, $r);
        }
        fclose($out);
        exit;
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
        $this->recordAuditLog($adminId, 'verification_' . $decision, 'verification', (string) $reqId, 'Membre #' . $row['user_id']);
        $this->json(['ok' => true]);
    }
}
