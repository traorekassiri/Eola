<?php declare(strict_types=1); ?>
<header class="zola-header">
  <div class="zola-container zola-nav">
    <a href="/discover" class="zola-brand">ZOLA</a>
    <nav class="zola-links">
      <a href="/discover">Découvrir</a>
      <a href="/favorites">Favoris</a>
      <a href="/messages">Messages</a>
      <a href="/profile">Mon profil</a>
      <a href="/settings">Paramètres</a>
    </nav>
  </div>
</header>

<main class="zola-container">
  <section class="zola-card">
    <img src="<?= Security::e($profile['avatar_url']) ?>" alt="<?= Security::e($profile['full_name']) ?>" class="zola-avatar-lg">
    <h1><?= Security::e($profile['first_name']) ?>, <?= (int) $profile['age'] ?></h1>
    <p class="zola-muted"><?= Security::e($profile['city']) ?>, <?= Security::e($profile['country']) ?></p>
    <p><?= Security::e($profile['bio']) ?></p>

    <?php if (!empty($isOwn)): ?>
      <h2>Modifier mon profil</h2>
      <form data-zola-form action="/api/profile/update" method="post" class="zola-form">
        <input type="hidden" name="csrf_token" value="<?= Security::e(Security::csrfToken()) ?>">
        <input type="text" name="full_name" value="<?= Security::e($profile['full_name']) ?>" required>
        <input type="date" name="birth_date" value="<?= Security::e($profile['birth_date']) ?>" required>
        <input type="text" name="country" value="<?= Security::e($profile['country']) ?>" required>
        <input type="text" name="city" value="<?= Security::e($profile['city']) ?>" required>
        <input type="text" name="profession" value="<?= Security::e($profile['profession']) ?>" placeholder="Profession">
        <input type="number" name="height_cm" value="<?= Security::e((string) $profile['height_cm']) ?>" placeholder="Taille (cm)">
        <textarea name="bio" rows="4"><?= Security::e($profile['bio']) ?></textarea>
        <button type="submit" class="zola-btn-primary">Enregistrer les modifications</button>
      </form>
    <?php else: ?>
      <div class="zola-actions-row">
        <button type="button" class="zola-btn-primary" data-like-id="<?= (int) $profile['id'] ?>">J'aime</button>
        <button type="button" class="zola-btn-outline" data-favorite-id="<?= (int) $profile['id'] ?>">Sauvegarder en favori</button>
        <button type="button" class="zola-btn-danger" data-block-id="<?= (int) $profile['id'] ?>">Bloquer ce profil</button>
      </div>
    <?php endif; ?>
  </section>
</main>
