<?php declare(strict_types=1); ?>
<header class="zola-header">
  <div class="zola-container zola-nav">
    <a href="/" class="zola-brand">ZOLA</a>
    <nav class="zola-links">
      <a href="#accueil">Accueil</a>
      <a href="/discover">Découvrir</a>
      <a href="#tarifs">Tarifs</a>
    </nav>
    <div class="zola-actions">
      <a href="/login" class="zola-btn-outline">Se connecter</a>
      <a href="/register" class="zola-btn-primary">S'inscrire</a>
    </div>
  </div>
</header>

<main class="zola-container">
  <section id="accueil" class="zola-hero">
    <h1>Trouvez l'amour en <span class="zola-accent">Afrique</span></h1>
    <p>Rencontrez des célibataires authentiques, près de chez vous ou partout en Afrique.</p>
    <p class="zola-counter"><?= (int) $activeMembers ?> membre(s) actif(s)</p>
    <div class="zola-actions">
      <a href="/register" class="zola-btn-primary">Créer un compte</a>
      <a href="#pourquoi" class="zola-btn-outline">En savoir plus</a>
    </div>
  </section>

  <section id="tarifs" class="zola-plans">
    <h2>Devenez Premium</h2>
    <div class="zola-grid-3">
      <?php foreach ($plans as $plan): ?>
        <article class="zola-card <?= $plan['is_popular'] ? 'zola-popular' : '' ?>">
          <h3><?= Security::e($plan['name']) ?></h3>
          <p class="zola-price"><?= number_format((int) $plan['price_fcfa'], 0, ',', ' ') ?> FCFA</p>
          <a href="/premium" class="zola-btn-primary">Souscrire maintenant</a>
        </article>
      <?php endforeach; ?>
    </div>
  </section>
</main>
