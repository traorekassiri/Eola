<?php
declare(strict_types=1);

final class MessageModel
{
    public function __construct(private PDO $pdo) {}

    public function isMember(int $conversationId, int $userId): bool
    {
        $stmt = $this->pdo->prepare('SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?');
        $stmt->execute([$conversationId, $userId]);
        return (bool) $stmt->fetchColumn();
    }

    public function listConversations(int $userId): array
    {
        $sql = 'SELECT c.id, p.full_name, p.avatar_url, u.is_online,
                       (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_message,
                       (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != ? AND m.is_read = 0) AS unread_count
                FROM conversations c
                JOIN conversation_members cm_me ON cm_me.conversation_id = c.id AND cm_me.user_id = ?
                JOIN conversation_members cm_other ON cm_other.conversation_id = c.id AND cm_other.user_id != ?
                JOIN users u ON u.id = cm_other.user_id
                JOIN user_profiles p ON p.user_id = u.id
                WHERE u.status = "active"
                  AND u.id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = ?)
                  AND u.id NOT IN (SELECT blocker_id FROM blocked_users WHERE blocked_id = ?)
                ORDER BY c.id DESC';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$userId, $userId, $userId, $userId, $userId]);
        return $stmt->fetchAll();
    }

    public function getMessages(int $conversationId, int $viewerId): array
    {
        if (!$this->isMember($conversationId, $viewerId)) {
            throw new RuntimeException('Accès refusé à cette conversation.');
        }
        $this->pdo->prepare('UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ?')->execute([$conversationId, $viewerId]);
        $stmt = $this->pdo->prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC');
        $stmt->execute([$conversationId]);
        return $stmt->fetchAll();
    }

    public function sendMessage(int $conversationId, int $senderId, string $content, ?string $imageUrl = null, ?string $audioUrl = null): int
    {
        if (!$this->isMember($conversationId, $senderId)) {
            throw new RuntimeException('Accès refusé à cette conversation.');
        }
        $cleanContent = trim($content);
        if ($cleanContent !== '') {
            $dupStmt = $this->pdo->prepare(
                'SELECT COUNT(*) FROM messages WHERE sender_id = ? AND content = ? AND created_at > DATE_SUB(NOW(), INTERVAL 2 MINUTE)'
            );
            $dupStmt->execute([$senderId, $cleanContent]);
            if ((int) $dupStmt->fetchColumn() >= 3) {
                throw new RuntimeException('Envoi trop rapide de messages identiques (anti-spam).');
            }
            if (preg_match('/(bit\.ly|tinyurl\.com|t\.me\/|wa\.me\/|whatsapp\.com)/i', $cleanContent)) {
                throw new RuntimeException('Les liens raccourcis ou redirections externes ne sont pas autorisés.');
            }
        }
        $stmt = $this->pdo->prepare('INSERT INTO messages (conversation_id, sender_id, content, image_url, audio_url) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$conversationId, $senderId, $cleanContent, $imageUrl, $audioUrl]);
        return (int) $this->pdo->lastInsertId();
    }

    public function toggleReaction(int $messageId, int $userId, string $emoji): array
    {
        $allowed = ['❤️', '😊', '🔥', '😂', '👏', '🙏'];
        if (!in_array($emoji, $allowed, true)) {
            throw new InvalidArgumentException('Réaction non autorisée.');
        }
        $mStmt = $this->pdo->prepare('SELECT conversation_id FROM messages WHERE id = ?');
        $mStmt->execute([$messageId]);
        $convId = (int) $mStmt->fetchColumn();
        if (!$convId || !$this->isMember($convId, $userId)) {
            throw new RuntimeException('Accès refusé.');
        }

        $chk = $this->pdo->prepare('SELECT id FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?');
        $chk->execute([$messageId, $userId, $emoji]);
        $existingId = $chk->fetchColumn();
        if ($existingId) {
            $this->pdo->prepare('DELETE FROM message_reactions WHERE id = ?')->execute([$existingId]);
        } else {
            $this->pdo->prepare('INSERT INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)')->execute([$messageId, $userId, $emoji]);
        }

        $rStmt = $this->pdo->prepare(
            'SELECT emoji, COUNT(*) AS count, MAX(CASE WHEN user_id = ? THEN 1 ELSE 0 END) AS reacted_by_me
             FROM message_reactions WHERE message_id = ? GROUP BY emoji'
        );
        $rStmt->execute([$userId, $messageId]);
        return $rStmt->fetchAll();
    }
}
