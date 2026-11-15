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
                ORDER BY c.id DESC';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$userId, $userId, $userId]);
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
        $stmt = $this->pdo->prepare('INSERT INTO messages (conversation_id, sender_id, content, image_url, audio_url) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$conversationId, $senderId, trim($content), $imageUrl, $audioUrl]);
        return (int) $this->pdo->lastInsertId();
    }
}
