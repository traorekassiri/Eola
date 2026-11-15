<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/config.php';
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/app/Core/Security.php';
require_once dirname(__DIR__) . '/app/Core/Mailer.php';
require_once dirname(__DIR__) . '/app/Core/Router.php';
require_once dirname(__DIR__) . '/app/Core/Controller.php';

foreach (glob(dirname(__DIR__) . '/app/Models/*.php') as $modelFile) {
    require_once $modelFile;
}
foreach (glob(dirname(__DIR__) . '/app/Controllers/*.php') as $controllerFile) {
    require_once $controllerFile;
}

Security::startSession();
$pdo = Database::pdo();
$router = new Router();

$home = new HomeController($pdo);
$auth = new AuthController($pdo);
$discover = new DiscoverController($pdo);
$messages = new MessageController($pdo);
$profile = new ProfileController($pdo);
$premium = new PremiumController($pdo);
$settings = new SettingsController($pdo);
$admin = new AdminController($pdo);

// Pages MVC
$router->get('/', [$home, 'index']);
$router->get('/login', [$auth, 'showLogin']);
$router->get('/register', [$auth, 'showRegister']);
$router->get('/discover', [$discover, 'showPage']);
$router->get('/messages', [$messages, 'showPage']);
$router->get('/profile', [$profile, 'showPage']);
$router->get('/profile/{id}', [$profile, 'showPage']);
$router->get('/premium', [$premium, 'showPage']);
$router->get('/settings', [$settings, 'showPage']);
$router->get('/admin', [$admin, 'showPage']);

// Auth & Mot de passe
$router->post('/api/auth/register', [$auth, 'register']);
$router->post('/api/auth/login', [$auth, 'login']);
$router->post('/api/auth/forgot-password', [$auth, 'forgotPassword']);
$router->post('/api/auth/logout', [$auth, 'logout']);

// Découverte, Likes & Passes
$router->get('/api/discover', [$discover, 'index']);
$router->post('/api/likes/{id}', [$discover, 'like']);
$router->post('/api/passes/{id}', [$discover, 'pass']);
$router->post('/api/passes/reset', [$discover, 'resetPasses']);

// Messagerie privée & Audio/Photo
$router->get('/api/messages/conversations', [$messages, 'conversations']);
$router->get('/api/messages/conversations/{id}', [$messages, 'thread']);
$router->post('/api/messages/conversations/{id}', [$messages, 'send']);

// Profil & Galerie
$router->post('/api/profile/update', [$profile, 'update']);
$router->post('/api/profile/photo', [$profile, 'uploadPhoto']);

// Abonnement Premium & Paiements
$router->post('/api/premium/checkout', [$premium, 'checkout']);
$router->post('/api/premium/verify', [$premium, 'verify']);

// Paramètres
$router->post('/api/settings/preferences', [$settings, 'updatePreferences']);
$router->post('/api/settings/password', [$settings, 'updatePassword']);
$router->post('/api/settings/account/delete', [$settings, 'deleteAccount']);

// Administration RBAC
$router->get('/api/admin/overview', [$admin, 'overview']);
$router->post('/api/admin/verifications/{id}', [$admin, 'reviewVerification']);

$router->dispatch($_SERVER['REQUEST_METHOD'], $_SERVER['REQUEST_URI']);
