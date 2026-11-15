<?php
declare(strict_types=1);

$envPath = dirname(__DIR__) . '/.env';
if (is_file($envPath)) {
    foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        [$k, $v] = array_pad(explode('=', $line, 2), 2, '');
        $_ENV[trim($k)] = trim($v, " \t\n\r\0\x0B\"'");
    }
}

define('APP_NAME', $_ENV['APP_NAME'] ?? 'ZOLA');
define('APP_URL', $_ENV['APP_URL'] ?? 'http://localhost');
define('APP_SECRET', $_ENV['APP_SECRET'] ?? 'zola_dev_secret_change_in_prod');
define('PAYMENT_WEBHOOK_SECRET', $_ENV['PAYMENT_WEBHOOK_SECRET'] ?? 'zola_pay_secret_change_in_prod');
define('UPLOAD_DIR', dirname(__DIR__) . '/public/uploads');
