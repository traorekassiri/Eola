<?php declare(strict_types=1); ?>
<header class="zola-header">
  <div class="zola-container zola-nav">
    <a href="/discover" class="zola-brand">ZOLA</a>
    <nav class="zola-links">
      <a href="/discover">Découvrir</a>
      <a href="/favorites">Favoris</a>
      <a href="/messages">Messages</a>
      <a href="/profile">Mon profil</a>
      <a href="/premium">Premium</a>
      <a href="/settings">Paramètres</a>
    </nav>
    <form action="/api/auth/logout" method="post">
      <button type="submit" class="zola-btn-outline">Déconnexion</button>
    </form>
  </div>
</header>

<main class="zola-container">
  <h1>Mes Favoris</h1>
  <?php if (empty($profiles)): ?>
    <section class="zola-card">
      <p class="zola-muted">Aucun profil sauvegardé pour le moment. Explorez Découvrir pour enregistrer vos coups de cœur.</p>
      <a href="/discover" class="zola-btn-primary">Explorer les profils</a>
    </section>
  <?php else: ?>
    <div class="zola-grid-3">
      <?php foreach ($profiles as $p): ?>
        <article class="zola-card">
          <img src="<?= Security::e($p['avatar_url']) ?>" alt="<?= Security::e($p['full_name']) ?>" class="zola-avatar-lg">
          <h3><?= Security::e($p['first_name']) ?>, <?= (int) $p['age'] ?></h3>
          <p class="zola-muted"><?= Security::e($p['city']) ?>, <?= Security::e($p['country_code']) ?></p>
          <div class="zola-actions">
            <a href="/profile/<?= (int) $p['id'] ?>" class="zola-btn-outline">Profil</a>
            <button type="button" class="zola-btn-primary" data-like-id="<?= (int) $p['id'] ?>">J'aime</button>
            <button type="button" class="zola-btn-danger" data-favorite-id="<?= (int) $p['id'] ?>">Retirer</button>
          </div>
        </article>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>
</main>
