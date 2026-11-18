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
  let pendingEmail = '';
  let pendingMode = '';
  let pendingName = '';
  let authMode = 'login';

  const style = document.createElement('style');
  style.textContent = `
    .web-auth-login{margin-top:14px}
    .web-auth-screen{padding:8px 0 24px}
    .web-auth-back{border:0;background:transparent;padding:0;margin:0 0 18px;color:#07383a;font:18px Montserrat,sans-serif}
    .web-auth-screen h1{margin:0 0 8px;font:30px Montserrat,sans-serif;color:#07383a}
    .web-auth-screen>p{color:#53716f;margin:0 0 20px}
    .web-auth-form{display:grid;gap:12px}
    .web-auth-form label{display:grid;gap:6px;color:#53716f;font-size:13px}
    .web-auth-form input[type=text],.web-auth-form input[type=email]{width:100%;box-sizing:border-box;border:1px solid #d8e5e1;border-radius:14px;padding:14px 15px;background:#fff;color:#07383a;font:16px Montserrat,sans-serif}
    .web-auth-code{letter-spacing:.24em}
    .web-auth-note{font-size:12px;color:#53716f;margin-top:14px}
    .web-auth-error{color:#9b3b3b}
    .web-auth-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .web-auth-actions .primary,.web-auth-actions .soft-button{width:100%;min-height:48px}
    .web-auth-consent{display:flex;align-items:flex-start;gap:10px;color:#07383a;font:14px Montserrat,sans-serif}
    .web-auth-consent input{width:18px;height:18px;margin-top:2px;accent-color:#12b6b8;flex:none}
    .web-auth-consent a{color:#0a8f8c}
    .web-auth-start{margin:0 0 18px;padding:14px;border:1px solid #d8e5e1;border-radius:16px;background:#f3fffd}
    .web-auth-start-title{margin:0 0 10px;text-align:center;color:#07383a;font:600 16px Montserrat,sans-serif}
    .account-pointer{display:grid;justify-items:center;gap:2px;margin:4px 0 18px;color:#0a8f8c;text-align:center}
    .account-pointer b{font-size:32px;line-height:1;font-weight:700}
    .account-pointer span{color:#53716f;font-size:14px}
    .nav-item[data-tab="more"] .nav-alert{width:16px;height:16px;border-radius:50%;background:#B42318;color:#fff;font:700 11px/16px Montserrat,sans-serif;text-align:center;pointer-events:none}
    .web-own-name{display:grid;gap:6px;color:#53716f;font:14px Montserrat,sans-serif}
    .web-own-name input{width:100%;box-sizing:border-box;border:1px solid #d8e5e1;border-radius:14px;padding:14px 15px;background:#fff;color:#07383a;font:16px Montserrat,sans-serif}
    #accountAnchor .primary,#accountAnchor .soft-button{width:100%;min-height:48px;margin-top:8px}
  `;
  document.head.appendChild(style);

  const oldBar = document.getElementById('emailSuggest');
  if (oldBar) oldBar.remove();
  document.body.classList.remove('has-email-suggest');

  function htmlEscape(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function ownerName() {
    if (typeof state !== 'undefined' && state.owner && state.owner.name) return state.owner.name;
    return '';
  }

  function ownNameForm() {
    return `<label class="web-own-name">Ваше имя<input id="webOwnName" type="text" maxlength="80" autocomplete="name" value="${htmlEscape(ownerName())}" placeholder="Как к вам обращаться"></label><button class="primary full" type="button" data-web-auth="rename">Сохранить имя</button>`;
  }

  const authScreen = () => {
    if (accountEmail) {
      return `<section class="web-auth-screen"><button class="web-auth-back" type="button" data-web-auth="back">‹ Назад</button><h1>Аккаунт</h1><p>Имя, питомцы и дневник открываются на любом устройстве, где вы войдёте по этой почте.</p><div class="web-auth-form">${ownNameForm()}<p>Почта <b>${htmlEscape(accountEmail)}</b></p><button class="soft-button full" type="button" data-web-auth="logout">Выйти</button></div></section>`;
    }
    if (authMode === 'signup') {
      return `<section class="web-auth-screen"><button class="web-auth-back" type="button" data-web-auth="back">‹ Назад</button><h1>Регистрация</h1><p>Аккаунт создаётся только на почту, которую вы укажете. Код придёт письмом.</p><div class="web-auth-form"><label>Имя<input id="webAuthName" type="text" autocomplete="name" placeholder="Как к вам обращаться"></label><label>Почта<input id="webAuthEmail" type="email" autocomplete="email" placeholder="you@example.com"></label><label>Одноразовый код<input id="webAuthCode" class="web-auth-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000"></label><div class="web-auth-consent"><input id="webAuthConsent" type="checkbox"><span>Я согласен(на) на <a href="privacy-policy.pdf" target="_blank" rel="noopener">обработку персональных данных</a></span></div><button class="soft-button full" type="button" data-web-auth="signup">Получить код</button><button class="primary full" type="button" data-web-auth="create">Создать аккаунт</button><button class="soft-button full" type="button" data-web-auth="show-login">Уже есть аккаунт — войти</button></div><p class="web-auth-note" id="webAuthNote">Сначала имя и почта, затем код из письма, и после этого согласие.</p></section>`;
    }
    return `<section class="web-auth-screen"><button class="web-auth-back" type="button" data-web-auth="back">‹ Назад</button><h1>Вход</h1><p>Почта и одноразовый код из письма. Имя указывается только при регистрации.</p><div class="web-auth-form"><label>Почта<input id="webAuthEmail" type="email" autocomplete="email" placeholder="you@example.com"></label><label>Одноразовый код<input id="webAuthCode" class="web-auth-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000"></label><button class="soft-button full" type="button" data-web-auth="login">Получить код</button><div class="web-auth-actions"><button class="primary" type="button" data-web-auth="enter">Войти</button><button class="soft-button" type="button" data-web-auth="show-signup">Зарегистрироваться</button></div></div><p class="web-auth-note" id="webAuthNote">Код приходит письмом от NutriPate.</p></section>`;
  };

  function showAuth(mode) {
    if (mode === 'login' || mode === 'signup') authMode = mode;
    state.authScreen = authMode === "signup" ? "register" : "login";
    if (typeof modal !== 'undefined' && modal && modal.open && typeof modal.close === 'function') modal.close();
    const main = document.getElementById('appMain');
    if (main) main.innerHTML = authScreen();
    const bar = document.getElementById('emailSuggest');
    if (bar) bar.remove();
  }

  window.nutripateOpenAuth = showAuth;

  const welcomeScreen = () => `<section class="welcome-screen"><div class="welcome-brand">Nutri<span>Pate</span></div><h1>Добро пожаловать!</h1><img class="welcome-art" src="assets/welcome_pets.png" alt="Питомцы рядом"><h2>Здесь будет день<br>вашего питомца</h2><p class="welcome-lead">Всего один профиль — и важное всегда под рукой: корм, порция и время кормления.</p><button class="primary" data-action="start-onboarding">Добавить первого питомца</button><div class="welcome-example"><b>Что понадобится</b><p>Возраст, вес, активность и особенности здоровья.</p></div><div class="web-auth-actions web-auth-login">${accountEmail ? `<button class="soft-button" type="button" data-web-auth="open-login">Аккаунт</button>` : `<button class="primary" type="button" data-web-auth="open-login">Войти</button><button class="soft-button" type="button" data-web-auth="open-signup">Зарегистрироваться</button>`}</div><p class="welcome-note">Один питомец и основной дневник — бесплатно.</p></section>`;

  try { viewWelcome = welcomeScreen; } catch (e) {}

  function accountButtons() {
    if (accountEmail) return `<button class="soft-button" type="button" data-web-auth="open-login">Аккаунт</button>`;
    return `<button class="primary" type="button" data-web-auth="open-login">Войти</button><button class="soft-button" type="button" data-web-auth="open-signup">Зарегистрироваться</button>`;
  }

  function decorateWelcome() {
    const main = document.getElementById("appMain");
    if (!main || accountEmail) return;
    const section = main.querySelector(".welcome-screen");
    if (!section || section.querySelector("[data-web-auth='open-signup']")) return;
    const box = document.createElement("div");
    box.className = "web-auth-start";
    box.innerHTML = `<p class="web-auth-start-title">Зарегистрируйтесь</p><div class="web-auth-actions">${accountButtons()}</div><p class="welcome-note">Имя, почта, код из письма и согласие на обработку данных.</p>`;
    section.prepend(box);
  }

  function markAccountNav() {
    const more = document.querySelector(".nav-item[data-tab='more']");
    if (!more) return;
    let badge = more.querySelector(".nav-alert");
    if (accountEmail) {
      if (badge) badge.remove();
      return;
    }
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "nav-alert";
      badge.textContent = "!";
      badge.setAttribute("aria-hidden", "true");
      more.prepend(badge);
    }
  }

  function accountSection() {
    if (accountEmail) {
      return `<section class="more-section" id="accountAnchor"><h2>Аккаунт</h2><p class="muted">Почта ${htmlEscape(accountEmail)}</p>${ownNameForm()}<button class="soft-button full" type="button" data-web-auth="logout">Выйти</button></section>`;
    }
    return `<section class="more-section" id="accountAnchor"><h2>Аккаунт</h2><p class="muted">Зарегистрируйтесь, чтобы питомец и дневник открывались на любом устройстве.</p><div class="web-auth-actions"><button class="primary" type="button" data-web-auth="open-signup">Зарегистрироваться</button><button class="soft-button" type="button" data-web-auth="open-login">Войти</button></div></section>`;
  }

  function accountPointer() {
    if (accountEmail) return "";
    return `<div class="account-pointer"><b>↓</b><span>Зарегистрируйтесь внизу экрана</span></div>`;
  }

  if (typeof viewMore === 'function') {
    const previousViewMore = viewMore;
    viewMore = function () { return accountPointer() + previousViewMore() + accountSection(); };
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

  function sameRow(left, right) {
    return ['date', 'time', 'at', 'kind', 'grams', 'kcal', 'text', 'name', 'weightKg', 'kg'].every((key) => left[key] === right[key]);
  }

  function mirrorHistory(source) {
    const state = Object.assign({}, source || {});
    const feedDiary = Object.assign({}, state.feedDiary || {});
    const entries = Array.isArray(state.feedEntries) ? state.feedEntries.slice() : [];
    entries.forEach((entry) => {
      if (!entry || !entry.petId) return;
      const row = { id: entry.id, date: entry.date, at: entry.at || entry.time || '', kind: entry.kind || 'feed', meal: entry.meal || entry.kind || 'feed', name: entry.name || entry.foodName || '', grams: entry.grams, kcal: entry.kcal, text: entry.text || '' };
      const bucket = (feedDiary[entry.petId] || []).slice();
      if (!bucket.some((item) => item && sameRow(item, row))) bucket.push(row);
      feedDiary[entry.petId] = bucket;
    });
    const seen = new Set();
    const mergedEntries = [];
    Object.keys(feedDiary).forEach((petId) => {
      (feedDiary[petId] || []).forEach((row) => {
        if (!row) return;
        const entry = { id: row.id, petId, date: row.date, time: row.at || row.time || '', kind: row.kind || 'feed', meal: row.meal || '', name: row.name || row.text || '', foodName: row.name || '', grams: row.grams, kcal: row.kcal, text: row.text || '' };
        const marker = [petId, entry.date, entry.time, entry.kind, entry.grams, entry.text].join('|');
        if (seen.has(marker)) return;
        seen.add(marker);
        mergedEntries.push(entry);
      });
    });
    state.feedDiary = feedDiary;
    state.feedEntries = mergedEntries;
    const weightDiary = Object.assign({}, state.weightDiary || {});
    (Array.isArray(state.weights) ? state.weights : []).forEach((item) => {
      if (!item || !item.petId) return;
      const row = { date: item.date, weightKg: item.weightKg != null ? item.weightKg : item.kg, note: item.note || '', time: item.time || '' };
      const bucket = (weightDiary[item.petId] || []).slice();
      if (!bucket.some((saved) => saved && sameRow(saved, row))) bucket.push(row);
      weightDiary[item.petId] = bucket;
    });
    const seenWeights = new Set();
    const flat = [];
    Object.keys(weightDiary).forEach((petId) => {
      (weightDiary[petId] || []).forEach((row) => {
        if (!row) return;
        const kg = row.weightKg != null ? row.weightKg : row.kg;
        const marker = [petId, row.date, row.time || '', kg].join('|');
        if (seenWeights.has(marker)) return;
        seenWeights.add(marker);
        flat.push({ petId, date: row.date, kg, note: row.note || '', time: row.time || '' });
      });
    });
    state.weightDiary = weightDiary;
    state.weights = flat;
    return state;
  }

  function slim(source) {
    const state = JSON.parse(JSON.stringify(source || {}));
    delete state.account;
    delete state.authScreen;
    state.pets = (Array.isArray(state.pets) ? state.pets : []).map((pet) => {
      const copy = Object.assign({}, pet);
      if (typeof copy.photo === 'string' && copy.photo.startsWith('data:')) delete copy.photo;
      return copy;
    });
    state.owner = Object.assign({ name: '', email: '', privacyConsent: false }, state.owner || {});
    return mirrorHistory(state);
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

  function mergeStates(local, remote, email, proOnAccount) {
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
    const pro = Boolean(proOnAccount || (remote && remote.pro) || (local && local.pro));
    const proPlan = pro ? ((local && local.pro) ? (local.proPlan || 'account') : ((remote && remote.proPlan) || 'account')) : null;
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
      pro,
      proPlan,
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
    const user = data.session.user;
    const now = new Date().toISOString();
    const saved = await client.from('app_states').upsert({ user_id: user.id, state: payload, updated_at: now }, { onConflict: 'user_id' });
    if (saved.error) {
      console.warn(saved.error.message);
      return;
    }
    const profile = {
      user_id: user.id,
      display_name: (payload.owner && payload.owner.name) || '',
      email: user.email || accountEmail,
    };
    if (payload.owner && payload.owner.privacyConsent) profile.privacy_consent_at = now;
    await client.from('profiles').upsert(profile, { onConflict: 'user_id' });
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
      const stored = await client.from('app_states').select('state').limit(1);
      const remote = mirrorHistory((stored.data && stored.data[0] && stored.data[0].state) || (data.user.user_metadata && data.user.user_metadata.nutripate) || {});
      const proOnAccount = Boolean((remote && remote.pro) || (data.user.user_metadata && data.user.user_metadata.nutripate_pro));
      lastPayload = JSON.stringify(slim(remote || {}));
      if (typeof window.nutripateReadState !== 'function' || typeof window.nutripateReplaceState !== 'function') return;
      const merged = mergeStates(window.nutripateReadState(), remote || {}, accountEmail, proOnAccount);
      if (pendingMode === 'signup' && pendingName) {
        merged.state.owner = Object.assign({}, merged.state.owner, {
          name: pendingName,
          email: accountEmail,
          privacyConsent: true,
          privacyConsentAt: new Date().toISOString(),
        });
        merged.changed = true;
        pendingMode = '';
        pendingName = '';
      }
      window.nutripateReplaceState(merged.state);
      syncing = false;
      if (merged.changed) await pushAccount();
    } finally {
      syncing = false;
    }
  }

  function signupName() {
    const name = (document.getElementById('webAuthName').value || '').trim();
    if (name.length < 2) {
      note('Напишите, как к вам обращаться.', true);
      return false;
    }
    pendingName = name;
    return true;
  }

  function signupConsent() {
    const consent = document.getElementById('webAuthConsent');
    if (!consent || !consent.checked) {
      note('Нужно согласие на обработку персональных данных.', true);
      return false;
    }
    return true;
  }

  async function sendCode(createUser) {
    const email = (document.getElementById('webAuthEmail').value || '').trim().toLowerCase();
    if (!email.includes('@') || !email.includes('.')) return note('Проверьте адрес почты.', true);
    if (createUser && !signupName()) return;
    note('Отправляем код…');
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: createUser },
    });
    if (error) {
      const lower = String(error.message || error).toLowerCase();
      if (!createUser && (lower.includes('not found') || lower.includes('signup') || lower.includes('signups'))) {
        return note('Аккаунта на эту почту нет. Нажмите «Создать аккаунт», чтобы завести его именно на неё.', true);
      }
      return note(explain(error), true);
    }
    pendingEmail = email;
    pendingMode = createUser ? 'signup' : 'login';
    if (createUser) note('Код отправлен на ' + email + '. Аккаунт будет создан только для этой почты. Введите код.');
    else note('Код для входа отправлен на ' + email + '.');
  }

  async function verifyCode() {
    const email = (document.getElementById('webAuthEmail').value || '').trim().toLowerCase();
    const token = (document.getElementById('webAuthCode').value || '').replace(/\s/g, '');
    if (authMode === 'signup' && (!signupName() || !signupConsent())) return;
    if (authMode === 'signup') pendingMode = 'signup';
    if (!email.includes('@')) return note('Сначала укажите почту.', true);
    if (pendingEmail && email !== pendingEmail) return note('Код запрошен для ' + pendingEmail, true);
    if (!/^\d{6,10}$/.test(token)) return note('Введите код из письма.', true);
    note('Проверяем код…');
    const { error } = await client.auth.verifyOtp({ email, token, type: 'email' });
    if (error) return note(explain(error), true);
    await pullAccount();
    if (typeof toast === 'function') toast(pendingMode === 'signup' ? 'Аккаунт создан' : 'Вы вошли');
    if (typeof render === 'function') render();
  }

  async function saveOwnName(explicit) {
    const input = document.getElementById('webOwnName');
    const raw = explicit != null ? explicit : (input && input.value);
    const name = String(raw || '').replace(/\s+/g, ' ').trim();
    const fail = (text) => {
      if (document.getElementById('webAuthNote')) note(text, true);
      else if (typeof toast === 'function') toast(text);
    };
    if (name.length < 2) return fail('Напишите имя — хотя бы 2 буквы.');
    const { data } = await client.auth.getSession();
    if (!data.session) return fail('Сначала войдите, чтобы имя сохранилось в аккаунте.');
    if (typeof window.nutripateReadState === 'function' && typeof window.nutripateReplaceState === 'function') {
      const current = window.nutripateReadState() || {};
      const owner = Object.assign({}, current.owner, { name, email: accountEmail || (current.owner && current.owner.email) || '' });
      window.nutripateReplaceState(Object.assign({}, current, { owner }));
    } else if (typeof state !== 'undefined') {
      state.owner = Object.assign({}, state.owner, { name });
      if (typeof save === 'function') save();
    }
    lastPayload = '';
    await pushAccount();
    const updated = await client.auth.updateUser({ data: { display_name: name } });
    if (updated.error) return fail('Имя записано в дневнике. На сервере пока не обновилось — попробуйте ещё раз.');
    if (typeof toast === 'function') toast('Имя сохранено');
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
    if (action === 'open' || action === 'open-login' || action === 'show-login') { showAuth('login'); return; }
    if (action === 'open-signup' || action === 'show-signup') { showAuth('signup'); return; }
    if (action === 'back') { state.authScreen = null; if (typeof render === 'function') render(); return; }
    if (action === 'signup') { sendCode(true).catch((error) => note(explain(error), true)); return; }
    if (action === 'login') { sendCode(false).catch((error) => note(explain(error), true)); return; }
    if (action === 'enter' || action === 'create' || action === 'verify') { verifyCode().catch((error) => note(explain(error), true)); return; }
    if (action === 'logout') { logout().catch((error) => note(explain(error), true)); return; }
    if (action === 'rename') { saveOwnName().catch((error) => note(explain(error), true)); }
  });

  if (typeof window.saveOwner === 'function' && !window.saveOwner.nutripateName) {
    const previousSaveOwner = window.saveOwner;
    const saveOwnerWithName = function () {
      const field = document.getElementById('ownerInputName');
      const typed = field ? field.value.replace(/\s+/g, ' ').trim() : '';
      previousSaveOwner();
      const saved = typeof state !== 'undefined' && state.owner ? state.owner.name : '';
      if (!accountEmail || typed.length < 2 || saved !== typed) return;
      saveOwnName(typed).catch(() => {});
    };
    saveOwnerWithName.nutripateName = true;
    window.saveOwner = saveOwnerWithName;
  }

  client.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') pullAccount().catch(() => {});
    if (event === 'SIGNED_OUT') accountEmail = '';
  });

  if (typeof window.enablePro === 'function' && !window.enablePro.nutripateAccount) {
    const originalEnablePro = window.enablePro;
    const accountEnablePro = function (plan) {
      client.auth.getSession().then(({ data }) => {
        if (!data || !data.session) {
          if (typeof toast === 'function') toast('Сначала войдите по почте. Pro запишется на неё и включится на телефоне, в Windows и в веб-версии.');
          if (typeof modal !== 'undefined' && modal && typeof modal.close === 'function') modal.close();
          showAuth('login');
          return;
        }
        originalEnablePro(plan);
      }).catch(() => {});
    };
    accountEnablePro.nutripateAccount = true;
    window.enablePro = accountEnablePro;
  }

  if (typeof remindersForm === "function" && !remindersForm.nutripateNote) {
    const originalReminders = remindersForm;
    const notedReminders = function () {
      originalReminders();
      const box = document.getElementById("modalContent");
      if (!box || box.querySelector(".web-remind-note")) return;
      const note = document.createElement("p");
      note.className = "muted web-remind-note";
      note.textContent = "Время порций сохраняется в аккаунте. Всплывающие уведомления приходят в приложении на телефоне и компьютере.";
      const title = box.querySelector("h2");
      if (title) title.after(note);
    };
    notedReminders.nutripateNote = true;
    remindersForm = notedReminders;
  }

  if (typeof render === "function") {
    const renderBeforeAccount = render;
    render = function () {
      if (state.authScreen) {
        const nav = document.querySelector(".bottom-nav");
        if (nav) {
          nav.hidden = true;
          nav.style.setProperty("display", "none", "important");
        }
        const main = document.getElementById("appMain");
        if (main) main.innerHTML = authScreen();
        return;
      }
      renderBeforeAccount();
      markAccountNav();
      if (typeof activePet === "function" && !activePet()) {
        const nav = document.querySelector(".bottom-nav");
        if (nav) {
          nav.hidden = true;
          nav.style.setProperty("display", "none", "important");
        }
        decorateWelcome();
      }
    };
    render();
  }
})();
