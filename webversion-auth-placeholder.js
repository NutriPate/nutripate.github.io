(function () {
  const SUPABASE_URL = 'https://lyepelkskwdgtuxiuoeo.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_Cvf2I4_-w96OttIJ6FQh-Q_1AFYh44X';
  const REDIRECT_URL = 'https://nutripate.github.io/webversion/';

  if (!window.supabase || typeof window.supabase.createClient !== 'function') return;

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });

  let accountEmail = '';
  let pushTimer = 0;
  let lastPayload = '';
  let syncing = false;

  const style = document.createElement('style');
  style.textContent = `
    .web-auth-login{margin-top:14px}
    .web-auth-screen{padding:8px 0 24px}
    .web-auth-back{border:0;background:transparent;padding:0;margin:0 0 18px;color:#07383a;font:18px Georgia,serif}
    .web-auth-screen h1{margin:0 0 8px;font:30px Georgia,serif;color:#07383a}
    .web-auth-screen>p{color:#53716f;margin:0 0 20px}
    .web-auth-form{display:grid;gap:12px}
    .web-auth-form label{display:grid;gap:6px;color:#53716f;font-size:13px}
    .web-auth-form input{width:100%;box-sizing:border-box;border:1px solid #d8e5e1;border-radius:14px;padding:14px 15px;background:#fff;color:#07383a;font:16px Arial,sans-serif}
    .web-auth-code{letter-spacing:.24em}
    .web-auth-note{font-size:12px;color:#53716f;margin-top:14px}
    .web-auth-error{color:#9b3b3b}
  `;
  document.head.appendChild(style);

  const loginScreen = () => `<section class="web-auth-screen"><button class="web-auth-back" type="button" data-web-auth="back">‹ Назад</button><h1>${accountEmail ? 'Вы уже вошли' : 'Войти в аккаунт'}</h1><p>${accountEmail ? 'Имя, питомцы и дневник этого аккаунта подтягиваются на любое устройство.' : 'Введите почту. Мы отправим одноразовый код и создадим аккаунт, если его ещё нет.'}</p><div class="web-auth-form">${accountEmail ? `<p>Почта <b>${esc(accountEmail)}</b></p><button class="soft-button full" type="button" data-web-auth="logout">Выйти</button>` : `<label>Почта<input id="webAuthEmail" type="email" autocomplete="email" placeholder="you@example.com"></label><label>Одноразовый код<input id="webAuthCode" class="web-auth-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000"></label><button class="primary full" type="button" data-web-auth="send">Получить код</button><button class="soft-button full" type="button" data-web-auth="verify">Войти по коду</button>`}</div><p class="web-auth-note" id="webAuthNote">Код приходит письмом от NutriPate. Если в письме есть ссылка, откройте её в этом же браузере.</p></section>`;

  const welcomeScreen = () => `<section class="welcome-screen"><div class="welcome-brand">Nutri<span>Pate</span></div><h1>Добро пожаловать!</h1><img class="welcome-art" src="assets/welcome_pets.png" alt="Питомцы рядом"><h2>Здесь будет день<br>вашего питомца</h2><p class="welcome-lead">Всего один профиль — и важное всегда под рукой: корм, порция и время кормления.</p><button class="primary" data-action="start-onboarding">Добавить первого питомца</button><div class="welcome-example"><b>Что понадобится</b><p>Возраст, вес, активность и особенности здоровья.</p></div><button class="soft-button full web-auth-login" type="button" data-web-auth="open">${accountEmail ? 'Аккаунт: ' + esc(accountEmail) : 'Войдите в свой аккаунт'}</button><p class="welcome-note">Один питомец и основной дневник — бесплатно.</p></section>`;

  try { viewWelcome = welcomeScreen; } catch (e) {}

  function accountSection() {
    if (accountEmail) {
      return `<section class="more-section"><h2>Аккаунт</h2><button class="more-row" type="button" data-web-auth="open"><span>${esc(accountEmail)}</span><span>Аккаунт ›</span></button></section>`;
    }
    return `<section class="more-section"><h2>Аккаунт</h2><button class="more-row" type="button" data-web-auth="open"><span>Войти по почте</span><span>›</span></button></section>`;
  }

  if (typeof viewMore === 'function') {
    const previousViewMore = viewMore;
    viewMore = function () { return previousViewMore() + accountSection(); };
  }

  function note(text, isError) {
    const el = document.getElementById('webAuthNote');
    if (!el) { if (typeof toast === 'function') toast(text); return; }
    el.textContent = text;
    el.classList.toggle('web-auth-error', !!isError);
  }

  function explain(error) {
    const message = String(error && (error.message || error) || '');
    const lower = message.toLowerCase();
    if (lower.includes('rate') || lower.includes('once every')) return 'Подождите минуту и запросите код ещё раз.';
    if (lower.includes('otp') || lower.includes('token') || lower.includes('invalid')) return 'Код не подошёл или уже устарел. Запросите новый.';
    if (lower.includes('email')) return 'Проверьте адрес почты.';
    return message || 'Не получилось связаться с аккаунтом.';
  }

  function slim(source) {
    const state = source || {};
    const pets = (Array.isArray(state.pets) ? state.pets : []).map((pet) => {
      const copy = Object.assign({}, pet);
      if (typeof copy.photo === 'string' && copy.photo.startsWith('data:')) delete copy.photo;
      return copy;
    });
    return {
      pets,
      activePetId: state.activePetId || null,
      owner: Object.assign({ name: '', email: '', privacyConsent: false }, state.owner || {}),
      selectedFoods: state.selectedFoods && typeof state.selectedFoods === 'object' ? state.selectedFoods : {},
      favorites: Array.isArray(state.favorites) ? state.favorites.slice(-200) : [],
      feedEntries: Array.isArray(state.feedEntries) ? state.feedEntries.slice(-400) : [],
      weights: Array.isArray(state.weights) ? state.weights.slice(-400) : [],
      diaryDay: state.diaryDay || null,
      reminders: state.reminders || null,
      savedAt: state.savedAt || null,
    };
  }

  function entryKey(item) {
    if (!item || typeof item !== 'object') return '';
    return item.id || [item.petId, item.date, item.time, item.kind, item.grams, item.kcal, item.kg, item.note].join('|');
  }

  function union(localItems, remoteItems) {
    const map = new Map();
    for (const item of [...(remoteItems || []), ...(localItems || [])]) {
      const key = entryKey(item);
      if (key) map.set(key, item);
    }
    return [...map.values()];
  }

  function mergeStates(local, remote, email) {
    const localPets = Array.isArray(local && local.pets) ? local.pets : [];
    const remotePets = Array.isArray(remote && remote.pets) ? remote.pets : [];
    const byId = new Map();
    for (const pet of remotePets) if (pet && pet.id) byId.set(pet.id, pet);
    for (const pet of localPets) {
      if (!pet || !pet.id) continue;
      const previous = byId.get(pet.id);
      if (!previous) byId.set(pet.id, pet);
      else byId.set(pet.id, Object.assign({}, previous, pet, { photo: pet.photo || previous.photo || null }));
    }
    const pets = [...byId.values()];
    const owner = Object.assign({ name: '', email: '', privacyConsent: false }, (remote && remote.owner) || {}, (local && local.owner) || {});
    if (!(local && local.owner && local.owner.name) && remote && remote.owner && remote.owner.name) owner.name = remote.owner.name;
    if (email) owner.email = email;
    const state = {
      pets,
      activePetId: (local && local.activePetId) || (remote && remote.activePetId) || (pets[0] && pets[0].id) || null,
      owner,
      selectedFoods: Object.assign({}, (remote && remote.selectedFoods) || {}, (local && local.selectedFoods) || {}),
      favorites: [...new Set([...((remote && remote.favorites) || []), ...((local && local.favorites) || [])])],
      feedEntries: union(local && local.feedEntries, remote && remote.feedEntries),
      weights: union(local && local.weights, remote && remote.weights),
      diaryDay: (local && local.diaryDay) || (remote && remote.diaryDay) || null,
      reminders: Object.assign({}, (remote && remote.reminders) || {}, (local && local.reminders) || {}),
      savedAt: new Date().toISOString(),
    };
    const before = JSON.stringify(slim(remote));
    const after = JSON.stringify(slim(state));
    return { state, changed: before !== after };
  }

  async function pushAccount() {
    if (typeof window.nutripateReadState !== 'function') return;
    const { data } = await client.auth.getSession();
    if (!data.session) return;
    const payload = slim(window.nutripateReadState());
    if (accountEmail) payload.owner.email = accountEmail;
    const serial = JSON.stringify(payload);
    if (serial === lastPayload) return;
    const { error } = await client.auth.updateUser({ data: { nutripate: payload } });
    if (error) {
      console.warn(error.message);
      return;
    }
    lastPayload = serial;
  }

  function schedulePush() {
    if (syncing) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => { pushAccount().catch(() => {}); }, 1200);
  }

  window.nutripateAfterSave = schedulePush;

  async function pullAccount() {
    syncing = true;
    try {
      const { data, error } = await client.auth.getUser();
      if (error || !data.user) {
        accountEmail = '';
        return;
      }
      accountEmail = data.user.email || '';
      const remote = data.user.user_metadata && data.user.user_metadata.nutripate;
      lastPayload = JSON.stringify(slim(remote || {}));
      if (typeof window.nutripateReadState !== 'function' || typeof window.nutripateReplaceState !== 'function') return;
      const merged = mergeStates(window.nutripateReadState(), remote || {}, accountEmail);
      window.nutripateReplaceState(merged.state);
      syncing = false;
      if (merged.changed) await pushAccount();
    } finally {
      syncing = false;
    }
  }

  async function sendCode() {
    const email = (document.getElementById('webAuthEmail').value || '').trim().toLowerCase();
    if (!email.includes('@') || !email.includes('.')) return note('Проверьте адрес почты.', true);
    note('Отправляем код…');
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: REDIRECT_URL },
    });
    if (error) return note(explain(error), true);
    note('Код отправлен на ' + email + '. Введите его ниже. Если письма нет, проверьте «Спам».');
  }

  async function verifyCode() {
    const email = (document.getElementById('webAuthEmail').value || '').trim().toLowerCase();
    const token = (document.getElementById('webAuthCode').value || '').replace(/\s/g, '');
    if (!email.includes('@')) return note('Сначала укажите почту.', true);
    if (!/^\d{6,10}$/.test(token)) return note('Введите код из письма.', true);
    note('Проверяем код…');
    const { error } = await client.auth.verifyOtp({ email, token, type: 'email' });
    if (error) return note(explain(error), true);
    if (typeof toast === 'function') toast('Вы вошли');
    if (typeof render === 'function') render();
  }

  async function logout() {
    await client.auth.signOut();
    accountEmail = '';
    lastPayload = '';
    if (typeof window.nutripateReplaceState === 'function') {
      window.nutripateReplaceState({
        pets: [],
        activePetId: null,
        owner: { name: '', email: '', privacyConsent: false },
        selectedFoods: {},
        favorites: [],
        feedEntries: [],
        weights: [],
        diaryDay: null,
      });
    } else if (typeof render === 'function') render();
    if (typeof toast === 'function') toast('Вы вышли. Данные остались в аккаунте.');
  }

  document.addEventListener('click', function (event) {
    const button = event.target.closest('[data-web-auth]');
    if (!button) return;
    event.preventDefault();
    const action = button.dataset.webAuth;
    if (action === 'open') {
      document.getElementById('appMain').innerHTML = loginScreen();
      return;
    }
    if (action === 'back') { if (typeof render === 'function') render(); return; }
    if (action === 'send') { sendCode().catch((error) => note(explain(error), true)); return; }
    if (action === 'verify') { verifyCode().catch((error) => note(explain(error), true)); return; }
    if (action === 'logout') { logout().catch((error) => note(explain(error), true)); }
  });

  client.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') pullAccount().catch(() => {});
    if (event === 'SIGNED_OUT') accountEmail = '';
  });
})();
