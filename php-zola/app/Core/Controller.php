<?php
declare(strict_types=1);

abstract class Controller
{
    protected PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    protected function render(string $view, array $data = []): void
    {
        extract($data, EXTR_SKIP);
        $viewFile = dirname(__DIR__) . '/Views/' . $view . '.php';
        ob_start();
        require $viewFile;
        $content = ob_get_clean();
        require dirname(__DIR__) . '/Views/layout.php';
    }

    protected function json(array $payload, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE);
        exit;
    }
}
