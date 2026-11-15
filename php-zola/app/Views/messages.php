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
    </nav>
  </div>
</header>

<main class="zola-container zola-chat-layout">
  <aside class="zola-card">
    <h2>Messages</h2>
    <?php foreach ($conversations as $conv): ?>
      <a href="/messages?c=<?= (int) $conv['id'] ?>" class="zola-conv-row">
        <strong><?= Security::e($conv['full_name']) ?></strong>
        <span class="zola-muted"><?= Security::e($conv['last_message'] ?? 'Nouveau Match') ?></span>
      </a>
    <?php endforeach; ?>
  </aside>

  <section class="zola-card">
    <?php if (!empty($activeConvId)): ?>
      <div id="zola-thread" data-conv-id="<?= (int) $activeConvId ?>"></div>
      <div class="zola-actions" id="zola-stickers-bar" data-conv-id="<?= (int) $activeConvId ?>">
        <button type="button" class="zola-btn-outline" data-sticker="akoma">Akoma</button>
        <button type="button" class="zola-btn-outline" data-sticker="gye-nyame">Gye Nyame</button>
        <button type="button" class="zola-btn-outline" data-sticker="djembe">Djembé</button>
        <button type="button" class="zola-btn-outline" data-sticker="kente">Kente</button>
      </div>
      <form id="zola-msg-form" class="zola-actions" enctype="multipart/form-data">
        <input type="file" name="image" accept="image/jpeg,image/png,image/webp">
        <input type="text" name="content" placeholder="Écrire un message...">
        <button type="submit" class="zola-btn-primary">Envoyer</button>
      </form>
    <?php else: ?>
      <p class="zola-muted">Sélectionnez une conversation.</p>
    <?php endif; ?>
  </section>
</main>
