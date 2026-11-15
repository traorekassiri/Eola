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

// Boutons Favoris
document.querySelectorAll('[data-favorite-id]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const id = btn.getAttribute('data-favorite-id');
    try {
      const res = await zolaFetch(`/api/favorites/${id}`, { method: 'POST' });
      btn.textContent = res.is_favorite ? 'En favori' : 'Favori';
      showToast(res.message || 'Favoris mis à jour.');
    } catch (err) {
      showToast(err.message);
    }
  });
});

// Boutons Bloquer un profil
document.querySelectorAll('[data-block-id]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const id = btn.getAttribute('data-block-id');
    try {
      const res = await zolaFetch(`/api/users/${id}/block`, { method: 'POST' });
      showToast(res.message || 'Profil bloqué.');
      setTimeout(() => { window.location.href = '/discover'; }, 800);
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
        if (m.image_url) {
          const img = document.createElement('img');
          img.src = m.image_url;
          img.alt = 'Pièce jointe';
          img.style.maxHeight = '200px';
          img.style.borderRadius = '12px';
          div.appendChild(img);
        }
        if (m.content) {
          const p = document.createElement('p');
          p.textContent = m.content;
          div.appendChild(p);
        }
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

  document.querySelectorAll('[data-sticker]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const name = btn.getAttribute('data-sticker') || 'akoma';
      const canvas = document.createElement('canvas');
      canvas.width = 240;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#18100E';
      ctx.fillRect(0, 0, 240, 240);
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 6;
      ctx.strokeRect(12, 12, 216, 216);
      ctx.fillStyle = '#FDE68A';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(name.toUpperCase(), 120, 128);
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const fd = new FormData();
        fd.append('content', '');
        fd.append('image', new File([blob], `zola-sticker-${name}.png`, { type: 'image/png' }));
        try {
          await zolaFetch(`/api/messages/conversations/${convId}`, { method: 'POST', body: fd });
          loadThread();
        } catch (err) {
          showToast(err.message);
        }
      }, 'image/png');
    });
  });
}

// Souscription Premium (SasPay)
document.querySelectorAll('[data-plan-id]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const planId = btn.getAttribute('data-plan-id');
    try {
      const fd = new FormData();
      fd.append('plan_id', planId);
      fd.append('provider', 'SasPay · Mobile Money & Carte');
      const { payment_intent } = await zolaFetch('/api/premium/checkout', { method: 'POST', body: fd });

      if (payment_intent.checkout_url) {
        window.location.assign(payment_intent.checkout_url);
        return;
      }

      const vfd = new FormData();
      vfd.append('reference', payment_intent.reference);
      vfd.append('verification_token', payment_intent.verification_token);
      await zolaFetch('/api/premium/verify', { method: 'POST', body: vfd });
      showToast('Abonnement Premium activé via SasPay !');
      setTimeout(() => window.location.reload(), 900);
    } catch (err) {
      showToast(err.message);
    }
  });
});

window.ZolaApp = { zolaFetch };
