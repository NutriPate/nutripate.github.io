(function () {
  const plans = [...document.querySelectorAll('.plan')];
  const params = new URLSearchParams(location.search);
  const initial = params.get('plan') || 'month';
  let planId = plans.some((item) => item.dataset.plan === initial) ? initial : 'month';
  const isApp = params.get('is_app') === '1';

  function paint() {
    plans.forEach((item) => item.classList.toggle('active', item.dataset.plan === planId));
  }
  plans.forEach((item) => item.addEventListener('click', () => {
    planId = item.dataset.plan;
    paint();
  }));
  paint();

  if (window.supabase && window.NUTRIPATE_SUPABASE) {
    const cfg = window.NUTRIPATE_SUPABASE;
    const client = window.supabase.createClient(cfg.url, cfg.key);
    client.auth.getSession().then(({ data }) => {
      const email = data && data.session && data.session.user && data.session.user.email;
      const input = document.getElementById('email');
      if (email && input && !input.value) input.value = email;
    }).catch(() => {});
  }

  document.getElementById('pay').addEventListener('click', async () => {
    const button = document.getElementById('pay');
    const error = document.getElementById('error');
    const email = document.getElementById('email').value.trim();
    error.textContent = '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      error.textContent = 'Введите почту — она нужна для чека.';
      return;
    }
    const cfg = window.NUTRIPATE_SUPABASE;
    if (!cfg || !cfg.url || !cfg.key) {
      error.textContent = 'На сайте не задан адрес Supabase.';
      return;
    }
    button.disabled = true;
    const back = new URL('payment/success.html', location.href);
    back.searchParams.set('is_app', isApp ? '1' : '0');
    try {
      const response = await fetch(cfg.url.replace(/\/$/, '') + '/functions/v1/create-yookassa-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: cfg.key, Authorization: 'Bearer ' + cfg.key },
        body: JSON.stringify({
          email,
          planId,
          months: 0,
          amount: 0,
          return_url: back.toString(),
          is_app: isApp,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.confirmation_url) throw new Error(data.error || 'Не удалось открыть оплату');
      back.searchParams.set('payment_id', data.payment_id || '');
      location.href = data.confirmation_url;
    } catch (err) {
      error.textContent = err.message || 'Не удалось открыть оплату';
      button.disabled = false;
    }
  });
})();
