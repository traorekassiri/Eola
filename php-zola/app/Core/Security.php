<?php
declare(strict_types=1);

final class Security
{
    public static function startSession(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }
        $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'secure' => $secure,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
    }

    public static function e(?string $value): string
    {
        return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    public static function csrfToken(): string
    {
        self::startSession();
        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf_token'];
    }

    public static function verifyCsrf(?string $token): void
    {
        self::startSession();
        $expected = $_SESSION['csrf_token'] ?? '';
        if (!$token || !$expected || !hash_equals($expected, $token)) {
            http_response_code(403);
            exit('Jeton CSRF invalide.');
        }
    }

    public static function currentUserId(): ?int
    {
        self::startSession();
        return isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : null;
    }

    public static function requireAuth(): int
    {
        $uid = self::currentUserId();
        if (!$uid) {
            header('Location: /login');
            exit;
        }
        return $uid;
    }

    public static function requireAdmin(PDO $pdo): int
    {
        $uid = self::requireAuth();
        $stmt = $pdo->prepare('SELECT role FROM users WHERE id = ? AND status = "active"');
        $stmt->execute([$uid]);
        $row = $stmt->fetch();
        if (!$row || !in_array($row['role'], ['moderator', 'admin', 'super_admin'], true)) {
            http_response_code(403);
            exit('Accès réservé aux administrateurs.');
        }
        return $uid;
    }

    public static function checkLoginRateLimit(string $key, int $max = 8, int $windowSec = 900): bool
    {
        self::startSession();
        $bucket = $_SESSION['rate_limit'][$key] ?? ['count' => 0, 'reset' => time() + $windowSec];
        if ($bucket['reset'] < time()) {
            $bucket = ['count' => 0, 'reset' => time() + $windowSec];
        }
        $bucket['count']++;
        $_SESSION['rate_limit'][$key] = $bucket;
        return $bucket['count'] <= $max;
    }

    public static function validateImageUpload(array $file, string $subDir = ''): string
    {
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            throw new RuntimeException('Erreur lors du téléversement.');
        }
        if (($file['size'] ?? 0) > 5 * 1024 * 1024) {
            throw new RuntimeException('Image trop volumineuse (5 Mo maximum).');
        }
        $bytes = @file_get_contents($file['tmp_name'], false, null, 0, 16);
        if ($bytes === false || strlen($bytes) < 12) {
            throw new RuntimeException('Fichier image illisible.');
        }

        $ext = null;
        if (substr($bytes, 0, 3) === "\xFF\xD8\xFF") {
            $ext = 'jpg';
        } elseif (substr($bytes, 0, 8) === "\x89PNG\r\n\x1A\n") {
            $ext = 'png';
        } elseif (substr($bytes, 0, 4) === 'RIFF' && substr($bytes, 8, 4) === 'WEBP') {
            $ext = 'webp';
        }

        if ($ext === null) {
            throw new RuntimeException('Signature binaire image invalide (JPG, PNG, WEBP).');
        }

        $targetDir = $subDir !== '' ? UPLOAD_DIR . '/' . trim($subDir, '/') : UPLOAD_DIR;
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0755, true);
        }

        $filename = time() . '_' . bin2hex(random_bytes(8)) . '.' . $ext;
        $dest = $targetDir . '/' . $filename;

        if ($ext === 'jpg' && function_exists('imagecreatefromjpeg') && function_exists('imagejpeg')) {
            $img = @imagecreatefromjpeg($file['tmp_name']);
            if ($img !== false) {
                imagejpeg($img, $dest, 90);
                imagedestroy($img);
            } elseif (!move_uploaded_file($file['tmp_name'], $dest)) {
                throw new RuntimeException('Impossible de sauvegarder le fichier.');
            }
        } elseif (!move_uploaded_file($file['tmp_name'], $dest)) {
            throw new RuntimeException('Impossible de sauvegarder le fichier.');
        }

        $prefix = $subDir !== '' ? '/uploads/' . trim($subDir, '/') : '/uploads';
        return $prefix . '/' . $filename;
    }

    public static function validateAudioUpload(array $file): string
    {
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            throw new RuntimeException('Erreur lors du téléversement audio.');
        }
        if (($file['size'] ?? 0) > 6 * 1024 * 1024) {
            throw new RuntimeException('Note vocale trop volumineuse (6 Mo maximum).');
        }
        $bytes = @file_get_contents($file['tmp_name'], false, null, 0, 16);
        if ($bytes === false || strlen($bytes) < 4) {
            throw new RuntimeException('Fichier audio illisible.');
        }

        $ext = null;
        if (substr($bytes, 0, 4) === "\x1A\x45\xDF\xA3") {
            $ext = 'webm';
        } elseif (substr($bytes, 0, 4) === 'OggS') {
            $ext = 'ogg';
        } elseif (substr($bytes, 4, 4) === 'ftyp') {
            $ext = 'm4a';
        } elseif (substr($bytes, 0, 3) === 'ID3' || (ord($bytes[0]) === 0xFF && (ord($bytes[1]) & 0xE0) === 0xE0)) {
            $ext = 'mp3';
        }
        if ($ext === null) {
            throw new RuntimeException('Format audio non supporté.');
        }

        if (!is_dir(UPLOAD_DIR)) {
            mkdir(UPLOAD_DIR, 0755, true);
        }
        $filename = 'voice_' . time() . '_' . bin2hex(random_bytes(8)) . '.' . $ext;
        $dest = UPLOAD_DIR . '/' . $filename;
        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            throw new RuntimeException('Impossible de sauvegarder la note vocale.');
        }
        return '/uploads/' . $filename;
    }
}
