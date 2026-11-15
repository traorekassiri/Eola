<?php
declare(strict_types=1);

final class SettingsController extends Controller
{
    public function showPage(): void
    {
        $uid = Security::requireAuth();
        $user = (new UserModel($this->pdo))->getFullProfile($uid);
        $this->render('settings', [
            'title' => 'Paramètres — ZOLA',
            'user' => $user,
        ]);
    }

    public function updatePreferences(): void
    {
        $uid = Security::requireAuth();
        Security::verifyCsrf($_POST['csrf_token'] ?? null);
        $stmt = $this->pdo->prepare('UPDATE users SET notify_messages = ?, notify_matches = ?, profile_visible = ? WHERE id = ?');
        $stmt->execute([
            !empty($_POST['notify_messages']) ? 1 : 0,
            !empty($_POST['notify_matches']) ? 1 : 0,
            !empty($_POST['profile_visible']) ? 1 : 0,
            $uid,
        ]);
        $this->json(['ok' => true]);
    }

    public function updatePassword(): void
    {
        $uid = Security::requireAuth();
        Security::verifyCsrf($_POST['csrf_token'] ?? null);
        $stmt = $this->pdo->prepare('SELECT password_hash FROM users WHERE id = ?');
        $stmt->execute([$uid]);
        $hash = (string) $stmt->fetchColumn();
        if (!password_verify($_POST['current_password'] ?? '', $hash)) {
            $this->json(['error' => 'Mot de passe actuel incorrect.'], 400);
        }
        $newPass = (string) ($_POST['new_password'] ?? '');
        if (strlen($newPass) < 8) {
            $this->json(['error' => '8 caractères minimum requis.'], 400);
        }
        $this->pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([
            password_hash($newPass, PASSWORD_DEFAULT),
            $uid,
        ]);
        $this->json(['ok' => true]);
    }

    public function deleteAccount(): void
    {
        $uid = Security::requireAuth();
        Security::verifyCsrf($_POST['csrf_token'] ?? null);
        $this->pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$uid]);
        session_destroy();
        $this->json(['ok' => true]);
    }
}
