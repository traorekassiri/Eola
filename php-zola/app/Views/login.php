<?php declare(strict_types=1); ?>
<main class="zola-container zola-auth-wrap">
  <section class="zola-card zola-auth-card">
    <h1>Connexion</h1>
    <p class="zola-muted">Bon retour parmi nous !</p>
    <form data-zola-form action="/api/auth/login" method="post" class="zola-form">
      <input type="hidden" name="csrf_token" value="<?= Security::e(Security::csrfToken()) ?>">
      <input type="email" name="email" required placeholder="Votre email">
      <input type="password" name="password" required placeholder="Mot de passe">
      <label class="zola-check">
        <input type="checkbox" name="remember_me" value="1">
        Se souvenir de moi
      </label>
      <button type="submit" class="zola-btn-primary">Se connecter</button>
    </form>
    <p class="zola-muted">Pas encore de compte ? <a href="/register">Créer un compte</a></p>
  </section>
</main>
