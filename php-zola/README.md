# ZOLA — Plateforme de Rencontres Africaines (PHP 8.1+ / MySQL MVC)

## Structure MVC
- `config/` : Chargement `.env` (`config.php`) et connexion PDO sécurisée (`database.php`)
- `database/schema.sql` : Schéma complet des 21 tables MySQL (`users`, `user_profiles`, `profile_photos`, `interests`, `user_interests`, `likes`, `passes`, `matches`, `conversations`, `conversation_members`, `messages`, `notifications`, `subscription_plans`, `subscriptions`, `payments`, `reports`, `blocked_users`, `password_resets`, `admin_users`, `site_settings`, `verification_requests`)
- `app/Core/` : `Router.php`, `Controller.php`, `Security.php` (CSRF, XSS, `password_hash`, limitation des tentatives, inspection magic-bytes + suppression EXIF, validation audio), `Mailer.php` (Brevo / SMTP)
- `app/Models/` : `UserModel.php`, `MatchModel.php`, `MessageModel.php`, `SubscriptionModel.php`
- `app/Controllers/` : `HomeController.php`, `AuthController.php`, `DiscoverController.php`, `MessageController.php`, `ProfileController.php`, `PremiumController.php`, `SettingsController.php`, `AdminController.php`
- `app/Views/` : Vues HTML5 (`layout.php`, `home.php`, `register.php`, `login.php`, `discover.php`, `messages.php`, `profile.php`, `premium.php`, `settings.php`, `admin.php`)
- `public/` : Point d'entrée `index.php`, `.htaccess`, `css/zola.css`, `js/app.js`

## Installation sur hébergement PHP / MySQL
1. Importer `database/schema.sql` dans MySQL 8.0+ / MariaDB 10.6+.
2. Copier `.env.example` vers `.env` et renseigner `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`, `APP_SECRET`, `PAYMENT_WEBHOOK_SECRET`, `BREVO_API_KEY`.
3. Pointer le DocumentRoot Apache/Nginx vers `php-zola/public`.
