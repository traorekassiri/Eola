<?php
declare(strict_types=1);

final class DiscoverController extends Controller
{
    public function showPage(): void
    {
        $uid = Security::requireAuth();
        $profiles = (new UserModel($this->pdo))->discover($uid, $_GET);
        $this->render('discover', [
            'title' => 'Découvrir — ZOLA',
            'profiles' => $profiles,
        ]);
    }

    public function index(): void
    {
        $uid = Security::requireAuth();
        $profiles = (new UserModel($this->pdo))->discover($uid, $_GET);
        $this->json(['profiles' => $profiles]);
    }

    public function like(array $params): void
    {
        $uid = Security::requireAuth();
        Security::verifyCsrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);
        $targetId = (int) ($params['id'] ?? 0);
        $payload = json_decode(file_get_contents('php://input') ?: '{}', true) ?: $_POST;
        $isSuper = !empty($payload['is_super']);
        try {
            $res = (new MatchModel($this->pdo))->likeUser($uid, $targetId, $isSuper);
            $this->json($res);
        } catch (RuntimeException $e) {
            $this->json(['error' => $e->getMessage()], 429);
        }
    }

    public function boost(): void
    {
        $uid = Security::requireAuth();
        Security::verifyCsrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);
        $stmt = $this->pdo->prepare("SELECT 1 FROM subscriptions WHERE user_id = ? AND status = 'active' AND expires_at > NOW() LIMIT 1");
        $stmt->execute([$uid]);
        if (!$stmt->fetchColumn()) {
            $this->json(['error' => 'Fonctionnalité réservée aux membres Premium.'], 403);
        }
        $this->pdo->prepare('INSERT INTO profile_boosts (user_id, expires_at) VALUES (?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))')
            ->execute([$uid]);
        $this->json(['ok' => true, 'message' => 'Votre profil est propulsé pendant 30 minutes.']);
    }

    public function pass(array $params): void
    {
        $uid = Security::requireAuth();
        Security::verifyCsrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);
        $targetId = (int) ($params['id'] ?? 0);
        if ($targetId > 0 && $targetId !== $uid) {
            $this->pdo->prepare('INSERT IGNORE INTO passes (from_user_id, to_user_id) VALUES (?, ?)')->execute([$uid, $targetId]);
        }
        $this->json(['ok' => true]);
    }

    public function resetPasses(): void
    {
        $uid = Security::requireAuth();
        Security::verifyCsrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);
        $this->pdo->prepare('DELETE FROM passes WHERE from_user_id = ?')->execute([$uid]);
        $this->json(['ok' => true]);
    }
}
