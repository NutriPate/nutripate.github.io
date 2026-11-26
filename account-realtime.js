/* One channel per table. Events for 300ms land as one state update. */
(function () {
  const cfg = window.NUTRIPATE_SUPABASE;
  if (!cfg || !cfg.url || !cfg.key || !window.supabase || !window.supabase.createClient) return;
  window.NUTRIPATE_REALTIME = true;
  const client = window.supabase.createClient(cfg.url, cfg.key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  let channel = null;
  let queue = [];
  let timer = 0;

  function token() {
    return typeof window.nutripateAccountToken === 'function' ? window.nutripateAccountToken() : '';
  }

  function userId(access) {
    try {
      const part = String(access || '').split('.')[1] || '';
      const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((part.length + 3) % 4)));
      return json.sub || '';
    } catch (error) {
      return '';
    }
  }

  function stamp(value) {
    const time = Date.parse(String(value || ''));
    return Number.isFinite(time) ? time : 0;
  }

  function applyBatch(events) {
    if (typeof window.nutripateApplyRemote !== 'function') return;
    window.nutripateApplyRemote(events);
  }

  function enqueue(table, payload) {
    queue.push({ table, new: payload.new, old: payload.old });
    clearTimeout(timer);
    timer = setTimeout(() => {
      const batch = queue;
      queue = [];
      applyBatch(batch);
    }, 300);
  }

  async function listen() {
    const access = token();
    const uid = userId(access);
    if (!access || !uid) return;
    if (client.realtime && client.realtime.setAuth) client.realtime.setAuth(access);
    if (channel) client.removeChannel(channel);
    channel = client.channel('nutripate-' + uid)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pets', filter: 'user_id=eq.' + uid }, (payload) => enqueue('pets', payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions', filter: 'auth_user_id=eq.' + uid }, (payload) => enqueue('subscriptions', payload))
      .subscribe();
  }

  let pushTimer = 0;
  const previous = window.nutripateAfterSave;
  window.nutripateAfterSave = function () {
    if (typeof previous === 'function') previous();
    if (window.nutripateApplyingCloud) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      if (typeof window.nutripatePushPets === 'function') window.nutripatePushPets();
    }, 300);
  };
  window.nutripateListen = function () { listen().catch(() => {}); };

  window.addEventListener('pagehide', () => { if (channel) client.removeChannel(channel); });
  window.NUTRIPATE_REALTIME = true;
  if (typeof window.nutripateStartCloudSync === 'function') window.nutripateStartCloudSync();
  const start = () => { listen().catch(() => {}); };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
  setInterval(start, 60000);
})();
