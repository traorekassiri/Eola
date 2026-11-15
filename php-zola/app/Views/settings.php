<?php declare(strict_types=1); ?>
<header class="zola-header">
  <div class="zola-container zola-nav">
    <a href="/discover" class="zola-brand">ZOLA</a>
    <nav class="zola-links">
      <a href="/discover">Découvrir</a>
      <a href="/profile">Mon profil</a>
      <a href="/settings">Paramètres</a>
    </nav>
  </div>
</header>

<main class="zola-container">
  <section class="zola-card">
    <h1>Paramètres</h1>
    <form data-zola-form action="/api/settings/preferences" method="post" class="zola-form">
      <input type="hidden" name="csrf_token" value="<?= Security::e(Security::csrfToken()) ?>">
      <label class="zola-check">
        <input type="checkbox" name="notify_matches" value="1" <?= $user['notify_matches'] ? 'checked' : '' ?>>
        Notifications de Match
      </label>
      <label class="zola-check">
        <input type="checkbox" name="notify_messages" value="1" <?= $user['notify_messages'] ? 'checked' : '' ?>>
        Notifications de nouveaux messages
      </label>
      <label class="zola-check">
        <input type="checkbox" name="profile_visible" value="1" <?= $user['profile_visible'] ? 'checked' : '' ?>>
        Mon profil est visible par tous
      </label>
      <button type="submit" class="zola-btn-primary">Enregistrer</button>
    </form>
  </section>
</main>
