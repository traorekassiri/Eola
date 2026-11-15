<?php
declare(strict_types=1);

final class ProfileController extends Controller
{
    public function showPage(array $params = []): void
    {
        $uid = Security::requireAuth();
        $targetId = isset($params['id']) ? (int) $params['id'] : $uid;
        if ($targetId !== $uid) {
            $blkStmt = $this->pdo->prepare(
                'SELECT 1 FROM blocked_users WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?) LIMIT 1'
            );
            $blkStmt->execute([$uid, $targetId, $targetId, $uid]);
            if ($blkStmt->fetchColumn()) {
                http_response_code(404);
                exit('Ce profil est inaccessible.');
            }
        }
        $profile = (new UserModel($this->pdo))->getFullProfile($targetId);
        if (!$profile) {
            http_response_code(404);
            exit('Profil introuvable.');
        }
        $interests = $this->pdo->query('SELECT * FROM interests ORDER BY name ASC')->fetchAll();
        $this->render('profile', [
            'title' => $profile['full_name'] . ' — ZOLA',
            'profile' => $profile,
            'isOwn' => $targetId === $uid,
            'allInterests' => $interests,
        ]);
    }

    public function update(): void
    {
        $uid = Security::requireAuth();
        Security::verifyCsrf($_POST['csrf_token'] ?? null);
        $stmt = $this->pdo->prepare(
            'UPDATE user_profiles SET full_name = ?, birth_date = ?, gender = ?, seeking_gender = ?, country = ?, city = ?, profession = ?, height_cm = ?, zodiac_sign = ?, bio = ? WHERE user_id = ?'
        );
        $stmt->execute([
            trim($_POST['full_name'] ?? ''),
            $_POST['birth_date'] ?? '1998-01-01',
            $_POST['gender'] ?? 'Femme',
            $_POST['seeking_gender'] ?? 'Tous',
            trim($_POST['country'] ?? ''),
            trim($_POST['city'] ?? ''),
            trim($_POST['profession'] ?? ''),
            !empty($_POST['height_cm']) ? (int) $_POST['height_cm'] : null,
            trim($_POST['zodiac_sign'] ?? ''),
            trim($_POST['bio'] ?? ''),
            $uid,
        ]);
        $this->json(['ok' => true]);
    }

    public function uploadPhoto(): void
    {
        $uid = Security::requireAuth();
        Security::verifyCsrf($_POST['csrf_token'] ?? null);
        $url = Security::validateImageUpload($_FILES['photo'] ?? []);
        $isPrimary = !empty($_POST['is_primary']) ? 1 : 0;
        if ($isPrimary) {
            $this->pdo->prepare('UPDATE profile_photos SET is_primary = 0 WHERE user_id = ?')->execute([$uid]);
            $this->pdo->prepare('UPDATE user_profiles SET avatar_url = ? WHERE user_id = ?')->execute([$url, $uid]);
        }
        $this->pdo->prepare('INSERT INTO profile_photos (user_id, photo_url, is_primary) VALUES (?, ?, ?)')->execute([$uid, $url, $isPrimary]);
        $this->json(['ok' => true, 'photo_url' => $url], 201);
    }

    public function block(array $params): void
    {
        $uid = Security::requireAuth();
        Security::verifyCsrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf_token'] ?? null));
        $targetId = (int) ($params['id'] ?? 0);
        if ($targetId <= 0 || $targetId === $uid) {
            $this->json(['error' => 'Action impossible.'], 400);
        }

        $existsStmt = $this->pdo->prepare('SELECT id FROM users WHERE id = ? LIMIT 1');
        $existsStmt->execute([$targetId]);
        if (!$existsStmt->fetchColumn()) {
            $this->json(['error' => 'Profil introuvable.'], 404);
        }

        $this->pdo->beginTransaction();
        try {
            $this->pdo->prepare('INSERT IGNORE INTO blocked_users (blocker_id, blocked_id) VALUES (?, ?)')
                ->execute([$uid, $targetId]);
            $this->pdo->prepare(
                'DELETE FROM likes WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)'
            )->execute([$uid, $targetId, $targetId, $uid]);

            $u1 = min($uid, $targetId);
            $u2 = max($uid, $targetId);
            $this->pdo->prepare('DELETE FROM matches WHERE user_one_id = ? AND user_two_id = ?')
                ->execute([$u1, $u2]);

            $this->pdo->prepare(
                'DELETE FROM notifications WHERE (user_id = ? AND related_user_id = ?) OR (user_id = ? AND related_user_id = ?)'
            )->execute([$uid, $targetId, $targetId, $uid]);

            $this->pdo->prepare(
                'DELETE FROM favorites WHERE (user_id = ? AND favorite_user_id = ?) OR (user_id = ? AND favorite_user_id = ?)'
            )->execute([$uid, $targetId, $targetId, $uid]);

            $this->pdo->commit();
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            $this->json(['error' => 'Impossible de bloquer ce profil.'], 500);
        }

        $conversations = (new MessageModel($this->pdo))->listConversations($uid);
        $this->json([
            'ok' => true,
            'message' => 'Utilisateur bloqué. Vos matchs et conversations avec ce profil ont été supprimés.',
            'blocked_user_id' => $targetId,
            'conversations' => $conversations,
        ]);
    }

    private function fetchFavorites(int $uid): array
    {
        $sql = 'SELECT u.id, u.is_verified, u.is_online, p.full_name, p.birth_date, p.country_code, p.city, p.avatar_url, f.created_at AS favorited_at
                FROM favorites f
                JOIN users u ON u.id = f.favorite_user_id
                JOIN user_profiles p ON p.user_id = u.id
                WHERE f.user_id = ?
                  AND u.status = "active"
                  AND u.profile_visible = 1
                  AND u.id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = ?)
                  AND u.id NOT IN (SELECT blocker_id FROM blocked_users WHERE blocked_id = ?)
                ORDER BY f.created_at DESC';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$uid, $uid, $uid]);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['age'] = (new DateTimeImmutable($r['birth_date']))->diff(new DateTimeImmutable('today'))->y;
            $r['first_name'] = explode(' ', $r['full_name'])[0] ?? $r['full_name'];
            $r['is_favorite'] = true;
        }
        return $rows;
    }

    public function favoritesPage(): void
    {
        $uid = Security::requireAuth();
        $profiles = $this->fetchFavorites($uid);
        $this->render('favorites', [
            'title' => 'Mes Favoris — ZOLA',
            'profiles' => $profiles,
        ]);
    }

    public function favoritesList(): void
    {
        $uid = Security::requireAuth();
        $profiles = $this->fetchFavorites($uid);
        $this->json(['profiles' => $profiles, 'count' => count($profiles)]);
    }

    public function toggleFavorite(array $params): void
    {
        $uid = Security::requireAuth();
        Security::verifyCsrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf_token'] ?? null));
        $targetId = (int) ($params['id'] ?? 0);
        if ($targetId <= 0 || $targetId === $uid) {
            $this->json(['error' => 'Profil cible invalide.'], 400);
        }

        $chk = $this->pdo->prepare('SELECT 1 FROM favorites WHERE user_id = ? AND favorite_user_id = ? LIMIT 1');
        $chk->execute([$uid, $targetId]);
        if ($chk->fetchColumn()) {
            $this->pdo->prepare('DELETE FROM favorites WHERE user_id = ? AND favorite_user_id = ?')->execute([$uid, $targetId]);
            $isFavorite = false;
        } else {
            $this->pdo->prepare('INSERT IGNORE INTO favorites (user_id, favorite_user_id) VALUES (?, ?)')->execute([$uid, $targetId]);
            $isFavorite = true;
        }

        $this->json([
            'ok' => true,
            'is_favorite' => $isFavorite,
            'count' => count($this->fetchFavorites($uid)),
            'message' => $isFavorite ? 'Profil ajouté à vos favoris !' : 'Profil retiré de vos favoris.',
        ]);
    }

    public function removeFavorite(array $params): void
    {
        $uid = Security::requireAuth();
        Security::verifyCsrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf_token'] ?? null));
        $targetId = (int) ($params['id'] ?? 0);
        if ($targetId > 0) {
            $this->pdo->prepare('DELETE FROM favorites WHERE user_id = ? AND favorite_user_id = ?')->execute([$uid, $targetId]);
        }
        $this->json([
            'ok' => true,
            'is_favorite' => false,
            'count' => count($this->fetchFavorites($uid)),
            'message' => 'Profil retiré de vos favoris.',
        ]);
    }
}
