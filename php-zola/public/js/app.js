const csrfMeta = document.querySelector('meta[name="csrf-token"]');
const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : '';

async function zolaFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  if (csrfToken && options.method && options.method.toUpperCase() !== 'GET') {
    headers.set('X-CSRF-Token', csrfToken);
  }
  const response = await fetch(url, { ...options, headers, credentials: 'same-origin' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

function showToast(message) {
  const el = document.createElement('div');
  el.className = 'zola-toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// Formulaires AJAX (inscription, connexion, profil, paramètres)
document.querySelectorAll('form[data-zola-form]').forEach((form) => {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const data = await zolaFetch(form.action, {
        method: (form.method || 'POST').toUpperCase(),
        body: new FormData(form),
      });
      if (data.redirect) {
        window.location.href = data.redirect;
      } else {
        showToast(data.message || 'Modifications enregistrées.');
      }
    } catch (err) {
      showToast(err.message);
    }
  });
});

// Boutons J'aime
document.querySelectorAll('[data-like-id]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const id = btn.getAttribute('data-like-id');
    try {
      const res = await zolaFetch(`/api/likes/${id}`, { method: 'POST' });
      btn.textContent = res.matched ? 'Match !' : 'Aimé';
      btn.disabled = true;
      if (res.matched) {
        showToast("C'est un Match ! Vous pouvez vous écrire.");
      }
    } catch (err) {
      showToast(err.message);
    }
  });
});

// Messagerie AJAX
const threadEl = document.getElementById('zola-thread');
const msgForm = document.getElementById('zola-msg-form');
if (threadEl) {
  const convId = threadEl.getAttribute('data-conv-id');
  const loadThread = async () => {
    try {
      const data = await zolaFetch(`/api/messages/conversations/${convId}`);
      threadEl.innerHTML = '';
      (data.messages || []).forEach((m) => {
        const div = document.createElement('div');
        div.className = 'zola-bubble';
        div.textContent = m.content || '';
        threadEl.appendChild(div);
      });
      threadEl.scrollTop = threadEl.scrollHeight;
    } catch (_) {}
  };
  loadThread();
  setInterval(loadThread, 4000);

  if (msgForm) {
    msgForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        await zolaFetch(`/api/messages/conversations/${convId}`, {
          method: 'POST',
          body: new FormData(msgForm),
        });
        msgForm.reset();
        loadThread();
      } catch (err) {
        showToast(err.message);
      }
    });
  }
}

// Souscription Premium
document.querySelectorAll('[data-plan-id]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const planId = btn.getAttribute('data-plan-id');
    try {
      const fd = new FormData();
      fd.append('plan_id', planId);
      fd.append('provider', 'CinetPay');
      const { payment_intent } = await zolaFetch('/api/premium/checkout', { method: 'POST', body: fd });

      const vfd = new FormData();
      vfd.append('reference', payment_intent.reference);
      vfd.append('verification_token', payment_intent.verification_token);
      await zolaFetch('/api/premium/verify', { method: 'POST', body: vfd });
      showToast('Abonnement Premium activé !');
      setTimeout(() => window.location.reload(), 900);
    } catch (err) {
      showToast(err.message);
    }
  });
});

window.ZolaApp = { zolaFetch };
