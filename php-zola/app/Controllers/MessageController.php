<?php
declare(strict_types=1);

final class MessageController extends Controller
{
    public function showPage(): void
    {
        $uid = Security::requireAuth();
        $conversations = (new MessageModel($this->pdo))->listConversations($uid);
        $activeConvId = isset($_GET['c']) ? (int) $_GET['c'] : ($conversations[0]['id'] ?? null);
        $this->render('messages', [
            'title' => 'Messages — ZOLA',
            'conversations' => $conversations,
            'activeConvId' => $activeConvId,
        ]);
    }

    public function conversations(): void
    {
        $uid = Security::requireAuth();
        $list = (new MessageModel($this->pdo))->listConversations($uid);
        $this->json(['conversations' => $list]);
    }

    public function thread(array $params): void
    {
        $uid = Security::requireAuth();
        $convId = (int) ($params['id'] ?? 0);
        $messages = (new MessageModel($this->pdo))->getMessages($convId, $uid);
        $this->json(['messages' => $messages]);
    }

    public function send(array $params): void
    {
        $uid = Security::requireAuth();
        Security::verifyCsrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);
        $convId = (int) ($params['id'] ?? 0);
        $imageUrl = !empty($_FILES['image']['tmp_name']) ? Security::validateImageUpload($_FILES['image']) : null;
        $audioUrl = !empty($_FILES['audio']['tmp_name']) ? Security::validateAudioUpload($_FILES['audio']) : null;
        try {
            $msgId = (new MessageModel($this->pdo))->sendMessage($convId, $uid, $_POST['content'] ?? '', $imageUrl, $audioUrl);
            $this->json(['ok' => true, 'id' => $msgId], 201);
        } catch (RuntimeException $e) {
            $this->json(['error' => $e->getMessage()], 400);
        }
    }

    public function react(array $params): void
    {
        $uid = Security::requireAuth();
        Security::verifyCsrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);
        $msgId = (int) ($params['id'] ?? 0);
        $payload = json_decode(file_get_contents('php://input') ?: '{}', true) ?: $_POST;
        $emoji = trim((string) ($payload['emoji'] ?? ''));
        try {
            $reactions = (new MessageModel($this->pdo))->toggleReaction($msgId, $uid, $emoji);
            $this->json(['ok' => true, 'reactions' => $reactions]);
        } catch (Throwable $e) {
            $this->json(['error' => $e->getMessage()], 400);
        }
    }
}
