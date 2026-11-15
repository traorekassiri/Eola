<?php
declare(strict_types=1);

final class MatchModel
{
    public function __construct(private PDO $pdo) {}

    public function likeUser(int $fromId, int $toId): array
    {
        if ($fromId === $toId) {
            throw new InvalidArgumentException('Action invalide.');
        }

        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare('INSERT IGNORE INTO likes (from_user_id, to_user_id) VALUES (?, ?)');
            $stmt->execute([$fromId, $toId]);

            $chk = $this->pdo->prepare('SELECT id FROM likes WHERE from_user_id = ? AND to_user_id = ?');
            $chk->execute([$toId, $fromId]);
            $mutual = (bool) $chk->fetch();

            if (!$mutual) {
                $this->pdo->commit();
                return ['matched' => false, 'conversation_id' => null];
            }

            $u1 = min($fromId, $toId);
            $u2 = max($fromId, $toId);
            $this->pdo->prepare('INSERT IGNORE INTO matches (user_one_id, user_two_id) VALUES (?, ?)')->execute([$u1, $u2]);

            $mStmt = $this->pdo->prepare('SELECT id FROM matches WHERE user_one_id = ? AND user_two_id = ?');
            $mStmt->execute([$u1, $u2]);
            $matchId = (int) $mStmt->fetchColumn();

            $this->pdo->prepare('INSERT IGNORE INTO conversations (match_id) VALUES (?)')->execute([$matchId]);
            $cStmt = $this->pdo->prepare('SELECT id FROM conversations WHERE match_id = ?');
            $cStmt->execute([$matchId]);
            $convId = (int) $cStmt->fetchColumn();

            $cm = $this->pdo->prepare('INSERT IGNORE INTO conversation_members (conversation_id, user_id) VALUES (?, ?)');
            $cm->execute([$convId, $fromId]);
            $cm->execute([$convId, $toId]);

            $this->pdo->commit();
            return ['matched' => true, 'conversation_id' => $convId];
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
}
