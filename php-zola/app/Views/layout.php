<?php declare(strict_types=1); ?>
<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="csrf-token" content="<?= Security::e(Security::csrfToken()) ?>">
  <title><?= Security::e($title ?? 'ZOLA — Plateforme de Rencontres Africaines') ?></title>
  <link rel="stylesheet" href="/css/zola.css">
</head>
<body class="zola-body">
  <?= $content ?>
  <script src="/js/app.js"></script>
</body>
</html>
