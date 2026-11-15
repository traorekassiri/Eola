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
      <p style="font-size:0.85rem;color:#a8a29e;">Conversion : <?= number_format((float) ($stats['conversion_rate'] ?? 0), 1) ?>%</p>
    </article>
  </div>

  <section class="zola-card" style="margin-top: 1.5rem;">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;">
      <h2 style="margin:0;">Évolution des inscriptions par mois</h2>
      <div class="zola-actions">
        <a href="/admin?months=6" class="zola-btn-outline">6 mois</a>
        <a href="/admin?months=12" class="zola-btn-outline">12 mois</a>
      </div>
    </div>
    <div id="zola-admin-d3-chart" style="margin-top:1rem;width:100%;"></div>
  </section>

  <div class="zola-grid-3" style="margin-top:1.5rem;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));">
    <section class="zola-card">
      <h2>Revenus Premium mensuels (FCFA)</h2>
      <div id="zola-admin-d3-revenue" style="width:100%;"></div>
    </section>
    <section class="zola-card">
      <h2>Répartition par pays</h2>
      <div id="zola-admin-d3-countries" style="width:100%;"></div>
    </section>
  </div>

  <section class="zola-card" style="margin-top:1.5rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
    <div>
      <h2 style="margin:0;">Exports CSV</h2>
      <p style="margin:0.25rem 0 0;font-size:0.85rem;color:#a8a29e;">Export UTF-8 comptable et modération</p>
    </div>
    <div class="zola-actions">
      <a href="/api/admin/export/users" class="zola-btn-outline">Utilisateurs</a>
      <a href="/api/admin/export/payments" class="zola-btn-outline">Paiements</a>
      <a href="/api/admin/export/reports" class="zola-btn-outline">Signalements</a>
    </div>
  </section>

  <section class="zola-card" style="margin-top:1.5rem;">
    <h2>Journal d'audit</h2>
    <?php if (empty($auditLogs)): ?>
      <p style="color:#a8a29e;">Aucune action enregistrée.</p>
    <?php else: ?>
      <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
        <thead>
          <tr style="text-align:left;color:#a8a29e;border-bottom:1px solid rgba(255,255,255,0.1);">
            <th style="padding:0.5rem;">Date</th>
            <th style="padding:0.5rem;">Admin</th>
            <th style="padding:0.5rem;">Action</th>
            <th style="padding:0.5rem;">Détails</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($auditLogs as $log): ?>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
              <td style="padding:0.5rem;"><?= htmlspecialchars((string) $log['created_at']) ?></td>
              <td style="padding:0.5rem;"><?= htmlspecialchars((string) $log['admin_name']) ?></td>
              <td style="padding:0.5rem;color:#fb923c;"><?= htmlspecialchars((string) $log['action']) ?></td>
              <td style="padding:0.5rem;color:#d6d3d1;"><?= htmlspecialchars((string) $log['details']) ?></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    <?php endif; ?>
  </section>
</main>

<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>
<script>
  (function () {
    const data = <?= json_encode($monthlySignups ?? [], JSON_UNESCAPED_UNICODE) ?>;
    const countries = <?= json_encode($countryDistribution ?? [], JSON_UNESCAPED_UNICODE) ?>;
    if (!window.d3) return;

    const host = document.getElementById('zola-admin-d3-chart');
    if (host && data.length) {
      const width = Math.max(320, host.clientWidth || 720);
      const height = 260;
      const margin = { top: 20, right: 18, bottom: 34, left: 36 };
      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;

      const svg = d3.select(host).append('svg').attr('viewBox', `0 0 ${width} ${height}`).style('width', '100%');
      const defs = svg.append('defs');
      const grad = defs.append('linearGradient').attr('id', 'php-zola-grad').attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
      grad.append('stop').attr('offset', '0%').attr('stop-color', '#ff6b1a');
      grad.append('stop').attr('offset', '100%').attr('stop-color', '#e62e2d');

      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
      const maxVal = Math.max(1, d3.max(data, d => d.count) || 0);
      const x = d3.scaleBand().domain(data.map(d => d.label)).range([0, innerW]).padding(0.32);
      const y = d3.scaleLinear().domain([0, maxVal + 1]).nice().range([innerH, 0]);

      g.append('g').call(d3.axisLeft(y).ticks(5)).selectAll('text').attr('fill', '#a8a29e');
      g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x)).selectAll('text').attr('fill', '#d6d3d1');
      g.selectAll('rect').data(data).enter().append('rect')
        .attr('x', d => x(d.label)).attr('y', d => y(d.count)).attr('width', x.bandwidth())
        .attr('height', d => Math.max(3, innerH - y(d.count))).attr('rx', 6)
        .attr('fill', d => (d.count > 0 ? 'url(#php-zola-grad)' : 'rgba(255,255,255,0.08)'));
    }

    const revHost = document.getElementById('zola-admin-d3-revenue');
    if (revHost && data.length) {
      const width = Math.max(280, revHost.clientWidth || 420);
      const height = 220;
      const margin = { top: 18, right: 14, bottom: 30, left: 52 };
      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      const svg = d3.select(revHost).append('svg').attr('viewBox', `0 0 ${width} ${height}`).style('width', '100%');
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
      const maxRev = Math.max(5000, d3.max(data, d => d.revenue_fcfa || 0) || 0);
      const x = d3.scaleBand().domain(data.map(d => d.label)).range([0, innerW]).padding(0.3);
      const y = d3.scaleLinear().domain([0, maxRev * 1.1]).nice().range([innerH, 0]);
      g.append('g').call(d3.axisLeft(y).ticks(4).tickFormat(v => Math.round(v / 1000) + 'k')).selectAll('text').attr('fill', '#a8a29e');
      g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x)).selectAll('text').attr('fill', '#d6d3d1');
      g.selectAll('rect').data(data).enter().append('rect')
        .attr('x', d => x(d.label)).attr('y', d => y(d.revenue_fcfa || 0)).attr('width', x.bandwidth())
        .attr('height', d => Math.max(3, innerH - y(d.revenue_fcfa || 0))).attr('rx', 5).attr('fill', '#f59e0b');
    }

    const cHost = document.getElementById('zola-admin-d3-countries');
    if (cHost && countries.length) {
      const width = Math.max(280, cHost.clientWidth || 420);
      const height = Math.max(180, countries.length * 28 + 24);
      const margin = { top: 8, right: 28, bottom: 16, left: 108 };
      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      const svg = d3.select(cHost).append('svg').attr('viewBox', `0 0 ${width} ${height}`).style('width', '100%');
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
      const maxC = Math.max(1, d3.max(countries, d => Number(d.count)) || 1);
      const y = d3.scaleBand().domain(countries.map(d => d.country)).range([0, innerH]).padding(0.28);
      const x = d3.scaleLinear().domain([0, maxC]).range([0, innerW]);
      g.append('g').call(d3.axisLeft(y)).selectAll('text').attr('fill', '#e7e5e4');
      g.selectAll('rect').data(countries).enter().append('rect')
        .attr('x', 0).attr('y', d => y(d.country)).attr('height', y.bandwidth())
        .attr('width', d => Math.max(4, x(Number(d.count)))).attr('rx', 5).attr('fill', '#ff6b1a');
    }
  })();
</script>
