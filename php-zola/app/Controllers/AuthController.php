<?php
declare(strict_types=1);

final class AuthController extends Controller
{
    public function showLogin(): void
    {
        if (Security::currentUserId()) {
            header('Location: /discover');
            exit;
        }
        $this->render('login', ['title' => 'Connexion — ZOLA']);
    }

    public function showRegister(): void
    {
        if (Security::currentUserId()) {
            header('Location: /discover');
            exit;
        }
        $this->render('register', ['title' => 'Créer un compte — ZOLA']);
    }

    public function register(): void
    {
        Security::verifyCsrf($_POST['csrf_token'] ?? null);
        $email = strtolower(trim($_POST['email'] ?? ''));
        $password = $_POST['password'] ?? '';
        $confirm = $_POST['password_confirm'] ?? '';

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->json(['error' => 'Email invalide.'], 400);
        }
        if (strlen($password) < 8 || $password !== $confirm) {
            $this->json(['error' => 'Mot de passe invalide ou confirmation différente.'], 400);
        }

        $model = new UserModel($this->pdo);
        if ($model->findByEmail($email)) {
            $this->json(['error' => 'Email déjà utilisé.'], 409);
        }

        $uid = $model->createUser($_POST);
        Security::startSession();
        session_regenerate_id(true);
        $_SESSION['user_id'] = $uid;
        $this->json(['ok' => true, 'redirect' => '/discover'], 201);
    }

    public function login(): void
    {
        Security::verifyCsrf($_POST['csrf_token'] ?? null);
        $email = strtolower(trim($_POST['email'] ?? ''));
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

        if (!Security::checkLoginRateLimit($ip . ':' . $email)) {
            $this->json(['error' => 'Trop de tentatives. Patientez 15 minutes.'], 429);
        }

        $model = new UserModel($this->pdo);
        $user = $model->findByEmail($email);
        if (!$user || !password_verify($_POST['password'] ?? '', $user['password_hash'])) {
            $this->json(['error' => 'Identifiants incorrects.'], 401);
        }
        if ($user['status'] === 'suspended') {
            $this->json(['error' => 'Compte suspendu.'], 403);
        }

        Security::startSession();
        session_regenerate_id(true);
        $_SESSION['user_id'] = (int) $user['id'];
        $this->pdo->prepare('UPDATE users SET is_online = 1, last_seen_at = NOW() WHERE id = ?')->execute([$user['id']]);
        $this->json(['ok' => true, 'redirect' => '/discover']);
    }

    public function forgotPassword(): void
    {
        Security::verifyCsrf($_POST['csrf_token'] ?? null);
        $email = strtolower(trim($_POST['email'] ?? ''));
        $user = (new UserModel($this->pdo))->findByEmail($email);
        if ($user) {
            $rawToken = bin2hex(random_bytes(24));
            $tokenHash = hash('sha256', $rawToken);
            $this->pdo->prepare('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))')
                ->execute([$user['id'], $tokenHash]);
            $resetUrl = rtrim(APP_URL, '/') . '/login?reset=' . urlencode($rawToken);
            Mailer::send($email, 'Réinitialisation de votre mot de passe ZOLA', '<p>Cliquez ici pour réinitialiser votre mot de passe : <a href="' . Security::e($resetUrl) . '">' . Security::e($resetUrl) . '</a></p>');
        }
        $this->json(['ok' => true, 'message' => 'Si cet email existe, un lien vient d\'être envoyé.']);
    }

    public function logout(): void
    {
        $uid = Security::currentUserId();
        if ($uid) {
            $this->pdo->prepare('UPDATE users SET is_online = 0 WHERE id = ?')->execute([$uid]);
        }
        session_destroy();
        header('Location: /');
        exit;
    }
}
