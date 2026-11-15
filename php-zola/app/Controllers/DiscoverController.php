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
        $res = (new MatchModel($this->pdo))->likeUser($uid, $targetId);
        $this->json($res);
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
