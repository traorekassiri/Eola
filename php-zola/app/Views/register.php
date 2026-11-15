<?php declare(strict_types=1); ?>
<main class="zola-container zola-auth-wrap">
  <section class="zola-card zola-auth-card">
    <h1>Créer un compte</h1>
    <p class="zola-muted">Rejoignez notre communauté et trouvez votre âme sœur.</p>
    <form data-zola-form action="/api/auth/register" method="post" class="zola-form">
      <input type="hidden" name="csrf_token" value="<?= Security::e(Security::csrfToken()) ?>">
      <input type="text" name="full_name" required placeholder="Nom et prénom">
      <input type="email" name="email" required placeholder="Votre email">
      <input type="password" name="password" required minlength="8" placeholder="Mot de passe (8 caractères min.)">
      <input type="password" name="password_confirm" required minlength="8" placeholder="Confirmer le mot de passe">
      <input type="date" name="birth_date" required>
      <select name="gender" required>
        <option value="Femme">Femme</option>
        <option value="Homme">Homme</option>
      </select>
      <select name="seeking_gender">
        <option value="Homme">Je recherche : Homme</option>
        <option value="Femme">Je recherche : Femme</option>
        <option value="Tous">Tous</option>
      </select>
      <input type="text" name="country" required placeholder="Pays (ex: Burkina Faso)">
      <input type="text" name="city" required placeholder="Ville (ex: Ouagadougou)">
      <label class="zola-check">
        <input type="checkbox" name="accepted_terms" value="1" required>
        J'accepte les conditions d'utilisation (18+)
      </label>
      <button type="submit" class="zola-btn-primary">S'inscrire</button>
    </form>
    <p class="zola-muted">Déjà un compte ? <a href="/login">Se connecter</a></p>
  </section>
</main>
