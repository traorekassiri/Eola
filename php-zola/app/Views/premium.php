<?php declare(strict_types=1); ?>
<header class="zola-header">
  <div class="zola-container zola-nav">
    <a href="/discover" class="zola-brand">ZOLA</a>
    <nav class="zola-links">
      <a href="/discover">Découvrir</a>
      <a href="/messages">Messages</a>
      <a href="/premium">Premium</a>
    </nav>
  </div>
</header>

<main class="zola-container">
  <section class="zola-plans">
    <h1>Devenez Premium</h1>
    <div class="zola-grid-3">
      <?php foreach ($plans as $plan): ?>
        <article class="zola-card <?= $plan['is_popular'] ? 'zola-popular' : '' ?>">
          <h3><?= Security::e($plan['name']) ?></h3>
          <p class="zola-price"><?= number_format((int) $plan['price_fcfa'], 0, ',', ' ') ?> FCFA</p>
          <button type="button" class="zola-btn-primary" data-plan-id="<?= (int) $plan['id'] ?>">Payer avec SasPay</button>
        </article>
      <?php endforeach; ?>
    </div>
  </section>

  <section class="zola-card">
    <h2>Historique des paiements</h2>
    <?php foreach ($payments as $pay): ?>
      <p><?= Security::e($pay['reference']) ?> · <?= Security::e($pay['plan_name']) ?> · <?= number_format((int) $pay['amount_fcfa'], 0, ',', ' ') ?> FCFA · <?= Security::e($pay['status']) ?></p>
    <?php endforeach; ?>
  </section>
</main>
