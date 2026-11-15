<?php declare(strict_types=1); ?>
<header class="zola-header">
  <div class="zola-container zola-nav">
    <a href="/discover" class="zola-brand">ZOLA Admin</a>
    <nav class="zola-links">
      <a href="/discover">Découvrir</a>
      <a href="/admin">Tableau de bord</a>
    </nav>
  </div>
</header>

<main class="zola-container">
  <h1>Espace Administrateur</h1>
  <div class="zola-grid-3">
    <article class="zola-card">
      <h3>Membres inscrits</h3>
      <p class="zola-price"><?= (int) $stats['total_users'] ?></p>
    </article>
    <article class="zola-card">
      <h3>Matchs créés</h3>
      <p class="zola-price"><?= (int) $stats['total_matches'] ?></p>
    </article>
    <article class="zola-card">
      <h3>Revenus confirmés</h3>
      <p class="zola-price"><?= number_format((int) $stats['total_revenue_fcfa'], 0, ',', ' ') ?> FCFA</p>
    </article>
  </div>
</main>
