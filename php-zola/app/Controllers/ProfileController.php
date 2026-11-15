<?php
declare(strict_types=1);

final class ProfileController extends Controller
{
    public function showPage(array $params = []): void
    {
        $uid = Security::requireAuth();
        $targetId = isset($params['id']) ? (int) $params['id'] : $uid;
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
}
