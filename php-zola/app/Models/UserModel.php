<?php
declare(strict_types=1);

final class UserModel
{
    public function __construct(private PDO $pdo) {}

    public function findByEmail(string $email): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([strtolower(trim($email))]);
        return $stmt->fetch() ?: null;
    }

    public function getFullProfile(int $userId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT u.id, u.email, u.role, u.status, u.is_verified, u.is_online, u.notify_messages, u.notify_matches, u.profile_visible,
                    p.full_name, p.birth_date, p.gender, p.seeking_gender, p.country, p.country_code, p.city, p.profession, p.height_cm, p.zodiac_sign, p.bio, p.avatar_url
             FROM users u
             JOIN user_profiles p ON p.user_id = u.id
             WHERE u.id = ? LIMIT 1'
        );
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        if (!$user) return null;

        $user['age'] = (new DateTimeImmutable($user['birth_date']))->diff(new DateTimeImmutable('today'))->y;
        $user['first_name'] = explode(' ', $user['full_name'])[0] ?? $user['full_name'];

        $iStmt = $this->pdo->prepare(
            'SELECT i.id, i.name FROM interests i JOIN user_interests ui ON ui.interest_id = i.id WHERE ui.user_id = ?'
        );
        $iStmt->execute([$userId]);
        $user['interests'] = $iStmt->fetchAll();

        $pStmt = $this->pdo->prepare('SELECT * FROM profile_photos WHERE user_id = ? ORDER BY is_primary DESC, id ASC');
        $pStmt->execute([$userId]);
        $user['photos'] = $pStmt->fetchAll();

        return $user;
    }

    public function createUser(array $data): int
    {
        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare(
                'INSERT INTO users (email, password_hash, role, status, is_online) VALUES (?, ?, "user", "active", 1)'
            );
            $stmt->execute([
                strtolower(trim($data['email'])),
                password_hash($data['password'], PASSWORD_DEFAULT),
            ]);
            $uid = (int) $this->pdo->lastInsertId();

            $pStmt = $this->pdo->prepare(
                'INSERT INTO user_profiles (user_id, full_name, birth_date, gender, seeking_gender, country, country_code, city, avatar_url)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $code = strtoupper(substr($data['country'], 0, 2));
            $avatar = '/img/default-avatar.jpg';
            $pStmt->execute([
                $uid,
                trim($data['full_name']),
                $data['birth_date'],
                $data['gender'],
                $data['seeking_gender'] ?? 'Tous',
                trim($data['country']),
                $code,
                trim($data['city']),
                $avatar,
            ]);

            $this->pdo->prepare('INSERT INTO profile_photos (user_id, photo_url, is_primary) VALUES (?, ?, 1)')->execute([$uid, $avatar]);
            $this->pdo->commit();
            return $uid;
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    public function discover(int $viewerId, array $filters): array
    {
        $sql = 'SELECT u.id, u.is_verified, u.is_online, p.full_name, p.birth_date, p.gender, p.country, p.country_code, p.city, p.avatar_url,
                       EXISTS(SELECT 1 FROM profile_boosts pb WHERE pb.user_id = u.id AND pb.expires_at > NOW()) AS is_boosted,
                       (SELECT COUNT(*) FROM user_interests ui1
                        JOIN user_interests ui2 ON ui2.interest_id = ui1.interest_id
                        WHERE ui1.user_id = u.id AND ui2.user_id = :viewer_int) AS shared_interests
                FROM users u
                JOIN user_profiles p ON p.user_id = u.id
                WHERE u.id != :viewer
                  AND u.status = "active"
                  AND u.profile_visible = 1
                  AND u.id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = :b1)
                  AND u.id NOT IN (SELECT blocker_id FROM blocked_users WHERE blocked_id = :b2)
                  AND u.id NOT IN (SELECT to_user_id FROM passes WHERE from_user_id = :p1)';
        $params = [':viewer' => $viewerId, ':viewer_int' => $viewerId, ':b1' => $viewerId, ':b2' => $viewerId, ':p1' => $viewerId];

        if (!empty($filters['search'])) {
            $sql .= ' AND (p.full_name LIKE :search OR p.city LIKE :search OR p.country LIKE :search)';
            $params[':search'] = '%' . $filters['search'] . '%';
        }
        if (!empty($filters['country'])) {
            $sql .= ' AND p.country = :country';
            $params[':country'] = $filters['country'];
        }
        if (!empty($filters['city'])) {
            $sql .= ' AND p.city LIKE :city';
            $params[':city'] = '%' . $filters['city'] . '%';
        }
        if (!empty($filters['gender']) && $filters['gender'] !== 'Tous') {
            $sql .= ' AND p.gender = :gender';
            $params[':gender'] = $filters['gender'];
        }
        if (!empty($filters['interestId'])) {
            $sql .= ' AND EXISTS(SELECT 1 FROM user_interests ui WHERE ui.user_id = u.id AND ui.interest_id = :interest_id)';
            $params[':interest_id'] = (int) $filters['interestId'];
        }
        if (!empty($filters['minAge'])) {
            $sql .= ' AND TIMESTAMPDIFF(YEAR, p.birth_date, CURDATE()) >= :min_age';
            $params[':min_age'] = max(18, (int) $filters['minAge']);
        }
        if (!empty($filters['maxAge'])) {
            $sql .= ' AND TIMESTAMPDIFF(YEAR, p.birth_date, CURDATE()) <= :max_age';
            $params[':max_age'] = min(100, (int) $filters['maxAge']);
        }

        $limit = max(1, min(60, (int) ($filters['limit'] ?? 24)));
        $offset = max(0, (int) ($filters['offset'] ?? 0));
        $sql .= " ORDER BY is_boosted DESC, shared_interests DESC, u.is_online DESC, u.last_seen_at DESC LIMIT {$limit} OFFSET {$offset}";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        foreach ($rows as &$r) {
            $r['is_boosted'] = (bool) $r['is_boosted'];
            $r['age'] = (new DateTimeImmutable($r['birth_date']))->diff(new DateTimeImmutable('today'))->y;
            $r['first_name'] = explode(' ', $r['full_name'])[0] ?? $r['full_name'];
            $r['compatibility_score'] = min(99, 55 + ((int) $r['shared_interests'] * 12) + ((int) $r['is_verified'] * 5));
        }
        return $rows;
    }
}
