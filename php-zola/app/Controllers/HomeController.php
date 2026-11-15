<?php
declare(strict_types=1);

final class HomeController extends Controller
{
    public function index(): void
    {
        $count = (int) $this->pdo->query('SELECT COUNT(*) FROM users WHERE status = "active"')->fetchColumn();
        $plans = (new SubscriptionModel($this->pdo))->getActivePlans();
        $this->render('home', [
            'title' => 'ZOLA — Trouvez l’amour en Afrique',
            'activeMembers' => $count,
            'plans' => $plans,
        ]);
    }
}
