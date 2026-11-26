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
  let lastRemoteAt = '';
  let syncing = false;
  let localRev = 0;
  let pendingEmail = '';
  let pendingMode = '';
  let pendingName = '';
  let authMode = 'login';
  const AUTH_FROZEN = false;

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
    .web-auth-start{margin:18px 0 0;padding:14px;border:1px solid #d8e5e1;border-radius:16px;background:#f3fffd}
    .web-auth-start-title{margin:0 0 10px;text-align:center;color:#07383a;font:600 16px Montserrat,sans-serif}
    .account-pointer{display:grid;justify-items:center;gap:2px;margin:4px 0 18px;color:#0a8f8c;text-align:center}
    .account-pointer b{font-size:32px;line-height:1;font-weight:700}
    .account-pointer span{color:#53716f;font-size:14px}
    .nav-item[data-tab="more"] .nav-alert{width:16px;height:16px;border-radius:50%;background:#B42318;color:#fff;font:700 11px/16px Montserrat,sans-serif;text-align:center;pointer-events:none}
    .web-own-name{display:grid;gap:6px;color:#53716f;font:14px Montserrat,sans-serif}
    .web-own-name input{width:100%;box-sizing:border-box;border:1px solid #d8e5e1;border-radius:14px;padding:14px 15px;background:#fff;color:#07383a;font:16px Montserrat,sans-serif}
    #accountAnchor .primary,#accountAnchor .soft-button{width:100%;min-height:48px;margin-top:8px}
    #appMain{padding-bottom:140px}
    #accountAnchor{scroll-margin-bottom:140px}
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
    if (authMode === 'account' && accountEmail) {
      return `<section class="web-auth-screen"><button class="web-auth-back" type="button" data-web-auth="back">‹ Назад</button><h1>Аккаунт</h1><p>Имя, питомцы и дневник открываются на любом устройстве, где вы войдёте по этой почте.</p><div class="web-auth-form">${ownNameForm()}<p>Почта <b>${htmlEscape(accountEmail)}</b></p><button class="soft-button full" type="button" data-web-auth="logout">Выйти</button></div></section>`;
    }
    if (authMode === 'signup') {
      return `<section class="web-auth-screen"><button class="web-auth-back" type="button" data-web-auth="back">‹ Назад</button><h1>Регистрация</h1><p>Аккаунт создаётся только на почту, которую вы укажете. Код придёт письмом.</p><div class="web-auth-form"><label>Имя<input id="webAuthName" type="text" autocomplete="name" placeholder="Как к вам обращаться"></label><label>Почта<input id="webAuthEmail" type="email" autocomplete="email" placeholder="you@example.com"></label><label>Одноразовый код<input id="webAuthCode" class="web-auth-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000"></label><button class="soft-button full" type="button" data-web-auth="signup">Получить код</button><button class="primary full" type="button" data-web-auth="create">Создать аккаунт</button><button class="soft-button full" type="button" data-web-auth="show-login">Уже есть аккаунт — войти</button></div><p class="web-auth-note" id="webAuthNote">Сначала имя и почта, затем код из письма.</p></section>`;
    }
    return `<section class="web-auth-screen"><button class="web-auth-back" type="button" data-web-auth="back">‹ Назад</button><h1>Вход</h1><p>Почта и одноразовый код из письма. Имя указывается только при регистрации.</p><div class="web-auth-form"><label>Почта<input id="webAuthEmail" type="email" autocomplete="email" placeholder="you@example.com"></label><label>Одноразовый код<input id="webAuthCode" class="web-auth-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000"></label><button class="soft-button full" type="button" data-web-auth="login">Получить код</button><div class="web-auth-actions"><button class="primary" type="button" data-web-auth="enter">Войти</button><button class="soft-button" type="button" data-web-auth="show-signup">Зарегистрироваться</button></div></div><p class="web-auth-note" id="webAuthNote">Код приходит письмом от NutriPate.</p></section>`;
  };

  function showAuth(mode) {
    if (AUTH_FROZEN && !accountEmail) {
      if (typeof toast === 'function') toast('Регистрация и вход временно приостановлены.');
      return;
    }
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
    if (!main) return;
    const section = main.querySelector(".welcome-screen");
    if (!AUTH_FROZEN || !section || section.querySelector("[data-web-auth='open-signup']")) return;
  }

  function markAccountNav() {
    const more = document.querySelector(".nav-item[data-tab='more']");
    if (!more) return;
    let badge = more.querySelector(".nav-alert");
    if (AUTH_FROZEN) {
      if (badge) badge.remove();
      return;
    }
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
    return `<section class="more-section" id="accountAnchor"><h2>Аккаунт</h2><p class="muted">Почта и одноразовый код из письма.</p><button class="primary full" type="button" data-web-auth="open-login">Войти</button><button class="soft-button full" type="button" data-web-auth="open-signup">Зарегистрироваться</button></section>`;
  }

  function accountPointer() {
    return "";
  }

  if (typeof viewMore === 'function') {
    const previousViewMore = viewMore;
    viewMore = function () { return accountSection() + previousViewMore(); };
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
    const seconds = message.match(/(\d+)\s*second/i);
    if (lower.includes('rate') || lower.includes('once every') || lower.includes('security purposes')) return 'Вы сможете повторно запросить код через ' + (seconds ? seconds[1] : '60') + ' секунд.';
    if (lower.includes('otp') || lower.includes('token') || lower.includes('invalid') || lower.includes('expired')) return 'Введите правильный код для прохождения верификации.';
    if (lower.includes('email')) return 'Проверьте адрес почты.';
    if (/[А-Яа-яЁё]/.test(message)) return message;
    return 'Не получилось. Попробуйте ещё раз.';
  }

  function sameRow(left, right) {
    return ['date', 'time', 'at', 'kind', 'grams', 'kcal', 'text', 'name', 'weightKg', 'kg'].every((key) => left[key] === right[key]);
  }

  function mealCode(value) {
    const text = String(value || '').trim().toLowerCase();
    if (text === 'morning' || text.startsWith('утр')) return 'morning';
    if (text === 'day' || text.startsWith('дн')) return 'day';
    if (text === 'evening' || text.startsWith('веч')) return 'evening';
    return String(value || '');
  }

  function feedIdentity(row, petId) {
    const kind = (row && row.kind) || 'feed';
    if (kind === 'feed') return [petId, row.date, 'feed', mealCode(row.meal), row.foodId || row.name || ''].join('|');
    return [petId, row.date, kind, row.at || row.time || '', row.grams || '', row.text || row.name || ''].join('|');
  }

  function mirrorHistory(source, prefer) {
    const state = Object.assign({}, source || {});
    const feedDiary = Object.assign({}, state.feedDiary || {});
    let entries = Array.isArray(state.feedEntries) ? state.feedEntries.slice() : [];
    const removed = new Set((state.removedFeedIds || []).map(String));
    void prefer;
    entries.forEach((entry) => {
      if (!entry || !entry.petId) return;
      const row = { id: entry.id || [entry.petId, entry.date, entry.time || entry.at || '', entry.kind || 'feed', entry.meal || '', entry.grams || '', entry.text || ''].join('|'), date: entry.date, at: entry.at || entry.time || '', kind: entry.kind || 'feed', meal: (entry.kind || 'feed') === 'feed' ? mealCode(entry.meal) : (entry.meal || entry.kind || 'feed'), name: entry.name || entry.foodName || '', grams: entry.grams, kcal: entry.kcal, text: entry.text || '', foodId: entry.foodId, batch: entry.batch };
      if (removed.has(String(row.id))) return;
      const bucket = (feedDiary[entry.petId] || []).slice();
      if (!bucket.some((item) => item && feedIdentity(item, entry.petId) === feedIdentity(row, entry.petId))) bucket.push(row);
      feedDiary[entry.petId] = bucket;
    });
    const seen = new Set();
    const mergedEntries = [];
    Object.keys(feedDiary).forEach((petId) => {
      const kept = [];
      (feedDiary[petId] || []).forEach((row) => {
        if (!row) return;
        if ((row.kind || 'feed') === 'feed') row.meal = mealCode(row.meal);
        if (!row.id) row.id = [petId, row.date, row.at || row.time || '', row.kind || 'feed', row.meal || '', row.grams || '', row.text || ''].join('|');
        const slot = feedIdentity(row, petId);
        if (removed.has(String(row.id)) || removed.has(slot) || seen.has(slot)) return;
        seen.add(slot);
        kept.push(row);
        mergedEntries.push({ id: row.id, petId, date: row.date, time: row.at || row.time || '', kind: row.kind || 'feed', meal: row.meal || '', name: row.name || row.text || '', foodName: row.name || '', grams: row.grams, kcal: row.kcal, text: row.text || '', foodId: row.foodId, batch: row.batch });
      });
      if (kept.length) feedDiary[petId] = kept;
      else delete feedDiary[petId];
    });
    state.feedDiary = feedDiary;
    state.feedEntries = mergedEntries;
    return mirrorWeights(state);
  }

  function mirrorWeights(state) {
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

  function catalogBreeds(species) {
    const key = species === "dog" ? "dogs" : "cats";
    const data = typeof breedCatalogData !== "undefined" && breedCatalogData[key];
    if (Array.isArray(data) && data.length) return data.map((item) => ({ id: item.id, name: item.name }));
    if (typeof breedEntries === "function") {
      return breedEntries(species === "dog" ? "dog" : "cat").map((item) => ({ id: item.id, name: item.name }));
    }
    return [];
  }

  function alignBreed(pet) {
    if (!pet || typeof pet !== "object") return pet;
    const list = catalogBreeds(pet.species);
    const id = String(pet.breedId || "");
    const label = String(pet.breedLabel || pet.breed || "").trim();
    const found = list.find((item) => item.name === label) || list.find((item) => item.id === id);
    if (!found) return pet;
    pet.breedId = found.id;
    pet.breed = found.name;
    pet.breedLabel = found.name;
    return pet;
  }

  function alignAllBreeds() {
    if (typeof state === "undefined" || !Array.isArray(state.pets)) return false;
    let changed = false;
    state.pets.forEach((pet) => {
      const before = [pet.breedId, pet.breed, pet.breedLabel].join("|");
      alignBreed(pet);
      if ([pet.breedId, pet.breed, pet.breedLabel].join("|") !== before) changed = true;
    });
    return changed;
  }

  function stampOf(value) {
    const text = value && (value.updatedAt || value.savedAt) || "";
    const time = Date.parse(text);
    return Number.isFinite(time) ? time : 0;
  }

  function realFood(value) {
    const text = String(value || '').trim();
    return text && text !== '__not_selected__' ? text : '';
  }

  function laterStamp(left, right) {
    return String(left || '') >= String(right || '') ? String(left || '') : String(right || '');
  }

  function mergeStates(local, remote, email, proOnAccount) {
    local = local || {};
    remote = remote || {};
    const localEmail = String(local.owner && local.owner.email || '').trim().toLowerCase();
    const sessionEmail = String(email || '').trim().toLowerCase();
    const otherPerson = Boolean(localEmail && sessionEmail && localEmail !== sessionEmail);
    const closed = Boolean(local.sessionClosed && stampOf(remote) > 0);
    const isolated = otherPerson || closed;
    const remoteWins = isolated || (stampOf(remote) > 0 && stampOf(remote) >= stampOf(local));
    const removedPets = new Set([...(local.removedPetIds || []), ...(remote.removedPetIds || [])].map(String));
    const tombs = Object.assign({}, remote.petTombstones || {}, isolated ? {} : (local.petTombstones || {}));
    Object.keys(tombs).forEach((id) => removedPets.add(String(id)));
    const petSource = isolated ? [[remote, remote.savedAt || remote.updatedAt || '']] : [[local, local.savedAt || local.updatedAt || ''], [remote, remote.savedAt || remote.updatedAt || '']];
    const byId = new Map();
    const petSide = new Map();
    for (const pair of petSource) {
      const side = pair[0] || {};
      const sideSaved = pair[1] || '';
      for (const pet of side.pets || []) {
        if (!pet || !pet.id || removedPets.has(String(pet.id))) continue;
        const previous = byId.get(pet.id);
        if (!previous) {
          byId.set(pet.id, Object.assign({}, pet));
          petSide.set(pet.id, sideSaved);
          continue;
        }
        const previousStamp = String(previous.updatedAt || '');
        const incomingStamp = String(pet.updatedAt || '');
        const takeIncoming = incomingStamp !== previousStamp ? incomingStamp > previousStamp : sideSaved >= (petSide.get(pet.id) || '');
        const winner = takeIncoming ? pet : previous;
        const other = takeIncoming ? previous : pet;
        const mergedPet = Object.assign({}, winner, { photo: winner.photo || other.photo || null });
        if (String(other.breedSetAt || "") > String(winner.breedSetAt || "")) {
          mergedPet.breed = other.breed;
          mergedPet.breedId = other.breedId;
          mergedPet.breedLabel = other.breedLabel;
          mergedPet.breedSetAt = other.breedSetAt;
        }
        byId.set(pet.id, mergedPet);
        if (takeIncoming) petSide.set(pet.id, sideSaved);
      }
    }
    const pets = [...byId.values()].map(alignBreed);
    const petIds = new Set(pets.map((pet) => pet.id));
    const owner = Object.assign({ name: '', email: '', privacyConsent: false }, remote.owner || {}, isolated ? {} : (local.owner || {}));
    if (!(local.owner && local.owner.name) && remote.owner && remote.owner.name) owner.name = remote.owner.name;
    if (email) owner.email = email;
    const pro = Boolean(proOnAccount || remote.pro || local.pro);
    const proPlan = pro ? (local.pro ? (local.proPlan || 'account') : (remote.proPlan || 'account')) : null;
    const source = remoteWins ? remote : local;
    const localSaved = local.savedAt || local.updatedAt || '';
    const remoteSaved = remote.savedAt || remote.updatedAt || '';
    const feedDiary = {};
    const weightDiary = {};
    if (!isolated) {
      [local, remote].forEach((side) => {
        Object.keys(side.feedDiary || {}).forEach((id) => { feedDiary[id] = (feedDiary[id] || []).concat(side.feedDiary[id] || []); });
        Object.keys(side.weightDiary || {}).forEach((id) => { weightDiary[id] = (weightDiary[id] || []).concat(side.weightDiary[id] || []); });
      });
    }
    const history = mirrorHistory(isolated ? remote : {
      feedDiary,
      feedEntries: [...(local.feedEntries || []), ...(remote.feedEntries || [])],
      weightDiary,
      weights: [...(local.weights || []), ...(remote.weights || [])],
      removedFeedIds: [...new Set([...(local.removedFeedIds || []), ...(remote.removedFeedIds || [])].map(String))],
    });
    const selectedFoods = {};
    const foodSetAt = {};
    const foodClearedAt = {};
    const ration = {};
    const foodPets = new Set([...petIds, ...Object.keys(local.selectedFoods || {}), ...Object.keys(remote.selectedFoods || {}), ...Object.keys(local.ration || {}), ...Object.keys(remote.ration || {})]);
    foodPets.forEach((petId) => {
      if (!petIds.has(petId)) return;
      const localFood = realFood((local.selectedFoods || {})[petId]);
      const remoteFood = realFood((remote.selectedFoods || {})[petId]);
      const localSet = ((local.foodSetAt || {})[petId]) || (localFood ? localSaved : '');
      const remoteSet = ((remote.foodSetAt || {})[petId]) || (remoteFood ? remoteSaved : '');
      const clearAt = laterStamp((local.foodClearedAt || {})[petId], (remote.foodClearedAt || {})[petId]);
      let chosen = null;
      let chosenAt = '';
      if (isolated) {
        chosen = remoteFood || null;
        chosenAt = remoteSet || remoteSaved;
      } else if (localFood && remoteFood && localFood !== remoteFood) {
        chosen = (remoteSet || localSet) ? (remoteSet >= localSet ? remoteFood : localFood) : (remoteSaved >= localSaved ? remoteFood : localFood);
        chosenAt = laterStamp(laterStamp(localSet, remoteSet), remoteSaved >= localSaved ? remoteSaved : localSaved);
      } else if (localFood || remoteFood) {
        chosen = localFood || remoteFood;
        chosenAt = laterStamp(localSet, remoteSet) || (localFood ? localSaved : remoteSaved);
      }
      if (chosen && clearAt && clearAt >= chosenAt) chosen = null;
      if (chosen) {
        selectedFoods[petId] = chosen;
        if (chosenAt) foodSetAt[petId] = chosenAt;
        const localRation = (local.ration || {})[petId];
        const remoteRation = (remote.ration || {})[petId];
        ration[petId] = Object.assign({}, remoteSaved >= localSaved && remoteRation ? remoteRation : (localRation || remoteRation || {}));
      } else if (clearAt) foodClearedAt[petId] = clearAt;
    });
    const favoritesByPet = {};
    const favoriteOnAt = {};
    const removedFavorites = {};
    if (!isolated) {
      const favPets = new Set([...Object.keys(local.favoritesByPet || {}), ...Object.keys(remote.favoritesByPet || {}), ...Object.keys(local.favoriteOnAt || {}), ...Object.keys(remote.removedFavorites || {})]);
      favPets.forEach((petId) => {
        if (!petIds.has(petId)) return;
        const ids = new Set([...(local.favoritesByPet && local.favoritesByPet[petId] || []), ...(remote.favoritesByPet && remote.favoritesByPet[petId] || [])].map(String));
        Object.keys((local.favoriteOnAt || {})[petId] || {}).forEach((id) => ids.add(id));
        Object.keys((remote.favoriteOnAt || {})[petId] || {}).forEach((id) => ids.add(id));
        Object.keys((local.removedFavorites || {})[petId] || {}).forEach((id) => ids.add(id));
        Object.keys((remote.removedFavorites || {})[petId] || {}).forEach((id) => ids.add(id));
        const kept = [];
        ids.forEach((foodId) => {
          const onTime = laterStamp(((local.favoriteOnAt || {})[petId] || {})[foodId], ((remote.favoriteOnAt || {})[petId] || {})[foodId]);
          const offTime = laterStamp(((local.removedFavorites || {})[petId] || {})[foodId], ((remote.removedFavorites || {})[petId] || {})[foodId]);
          const presentLocal = ((local.favoritesByPet || {})[petId] || []).map(String).includes(foodId);
          const presentRemote = ((remote.favoritesByPet || {})[petId] || []).map(String).includes(foodId);
          const on = laterStamp(laterStamp(onTime, presentLocal ? localSaved : ''), presentRemote ? remoteSaved : '');
          if (on && on >= offTime) {
            kept.push(foodId);
            favoriteOnAt[petId] = Object.assign({}, favoriteOnAt[petId], { [foodId]: on });
          } else if (offTime) {
            removedFavorites[petId] = Object.assign({}, removedFavorites[petId], { [foodId]: offTime });
          }
        });
        if (kept.length) favoritesByPet[petId] = kept;
      });
    } else {
      Object.assign(favoritesByPet, remote.favoritesByPet || {});
    }
    const state = {
      pets,
      activePetId: pets.some((pet) => pet.id === ((String(local.activePetAt || '') >= String(remote.activePetAt || '')) ? local.activePetId : remote.activePetId)) ? ((String(local.activePetAt || '') >= String(remote.activePetAt || '')) ? local.activePetId : remote.activePetId) : (pets.some((pet) => pet.id === source.activePetId) ? source.activePetId : ((pets[0] && pets[0].id) || null)),
      activePetAt: String(local.activePetAt || '') >= String(remote.activePetAt || '') ? (local.activePetAt || '') : (remote.activePetAt || ''),
      onboardingDone: pets.length > 0,
      owner,
      selectedFoods,
      foodSetAt,
      foodClearedAt,
      ration,
      favoritesByPet,
      favoriteOnAt,
      removedFavorites,
      favorites: [],
      removedPetIds: isolated ? (remote.removedPetIds || []) : [...removedPets],
      petTombstones: tombs,
      removedFeedIds: history.removedFeedIds || [],
      feedEntries: (history.feedEntries || []).filter((item) => item && petIds.has(item.petId)),
      weights: (history.weights || []).filter((item) => item && petIds.has(item.petId)),
      feedDiary: history.feedDiary || {},
      weightDiary: history.weightDiary || {},
      diaryDay: source.diaryDay || null,
      reminders: Object.assign({}, source.reminders || {}),
      stock: source.stock || {},
      savedAt: remoteWins ? (remote.updatedAt || remote.savedAt || new Date().toISOString()) : (local.savedAt || new Date().toISOString()),
      sessionClosed: false,
      pro,
      proPlan,
    };
    ["selectedFoods", "ration", "favoritesByPet", "feedDiary", "weightDiary", "stock"].forEach((key) => {
      Object.keys(state[key] || {}).forEach((id) => { if (!petIds.has(id)) delete state[key][id]; });
    });
    const before = JSON.stringify(slim(remote));
    const after = JSON.stringify(slim(state));
    return { state, changed: before !== after };
  }

  async function pushAccount() {
    if (typeof window.nutripateReadState !== 'function') return;
    const { data } = await client.auth.getSession();
    if (!data.session) return;
    if (!lastRemoteAt) return;
    const rev = localRev;
    const fresh = await client.from('app_states').select('state, updated_at').limit(1);
    const serverRow = fresh.data && fresh.data[0];
    const serverAt = serverRow && serverRow.updated_at;
    const serverState = mirrorHistory((serverRow && serverRow.state) || {});
    if (serverAt) serverState.updatedAt = serverAt;
    const payload = slim(mergeStates(window.nutripateReadState(), serverState, accountEmail, false).state);
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
    await client.from('profiles').upsert(profile, { onConflict: 'user_id' });
    lastPayload = serial;
    lastRemoteAt = now;
    if (localRev !== rev) schedulePush();
  }

  function schedulePush() {
    localRev += 1;
    if (syncing) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => { pushAccount().catch(() => {}); }, 400);
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
      const rev = localRev;
      const stored = await client.from('app_states').select('state, updated_at').limit(1);
      const row = stored.data && stored.data[0];
      const remote = mirrorHistory((row && row.state) || (data.user.user_metadata && data.user.user_metadata.nutripate) || {});
      if (row && row.updated_at) remote.updatedAt = row.updated_at;
      lastRemoteAt = remote.updatedAt || remote.savedAt || new Date().toISOString();
      const proOnAccount = Boolean((remote && remote.pro) || (data.user.user_metadata && data.user.user_metadata.nutripate_pro));
      if (typeof window.nutripateReadState !== 'function' || typeof window.nutripateReplaceState !== 'function') return;
      let merged = mergeStates(window.nutripateReadState(), remote || {}, accountEmail, proOnAccount);
      if (localRev !== rev) merged = mergeStates(window.nutripateReadState(), remote || {}, accountEmail, proOnAccount);
      if (pendingMode === 'signup' && pendingName) {
        merged.state.owner = Object.assign({}, merged.state.owner, { name: pendingName, email: accountEmail });
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

  async function sendCode(createUser) {
    const email = (document.getElementById('webAuthEmail').value || '').trim().toLowerCase();
    const again = Math.ceil(60 - (Date.now() - (window.__codeSentAt || 0)) / 1000);
    if (window.__codeSentAt && again > 0) return note('Вы сможете повторно запросить код через ' + again + ' секунд.', true);
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
    window.__codeSentAt = Date.now();
    pendingEmail = email;
    pendingMode = createUser ? 'signup' : 'login';
    if (createUser) note('Код отправлен на ' + email + '. Аккаунт будет создан только для этой почты. Введите код.');
    else note('Код для входа отправлен на ' + email + '.');
  }

  async function verifyCode() {
    const email = (document.getElementById('webAuthEmail').value || '').trim().toLowerCase();
    const token = (document.getElementById('webAuthCode').value || '').replace(/\s/g, '');
    if (authMode === 'signup' && !signupName()) return;
    if (authMode === 'signup') pendingMode = 'signup';
    if (!email.includes('@')) return note('Сначала укажите почту.', true);
    if (pendingEmail && email !== pendingEmail) return note('Код запрошен для ' + pendingEmail, true);
    if (!/^\d{6}$/.test(token)) return note('Введите правильный код для прохождения верификации.', true);
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
        sessionClosed: true,
      });
    } else if (typeof render === 'function') render();
    if (typeof toast === 'function') toast('Вы вышли. Данные остались в аккаунте.');
  }

  document.addEventListener('click', function (event) {
    const button = event.target.closest('[data-web-auth]');
    if (!button) return;
    event.preventDefault();
    const action = button.dataset.webAuth;
    if (action === 'open') { showAuth(accountEmail ? 'account' : 'login'); return; }
    if (action === 'open-login' || action === 'show-login') { showAuth('login'); return; }
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

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") pullAccount().catch(() => {});
  });
  setInterval(() => { pullAccount().catch(() => {}); }, 4000);

  if (typeof window.savePet === "function" && !window.savePet.nutripateBreed) {
    const previousSavePet = window.savePet;
    const savePetWithBreed = function (id) {
      const result = previousSavePet.apply(this, arguments);
      if (alignAllBreeds() && typeof save === "function") save();
      return result;
    };
    savePetWithBreed.nutripateBreed = true;
    window.savePet = savePetWithBreed;
  }

  if (typeof window.deletePetWeb === "function" && !window.deletePetWeb.nutripateSync) {
    const previousDelete = window.deletePetWeb;
    const deleteAndSync = function (id) {
      previousDelete(id);
      if (typeof state !== "undefined" && (!state.pets || !state.pets.length)) {
        state.onboardingDone = false;
        if (typeof save === "function") save();
        if (typeof render === "function") render();
      }
    };
    deleteAndSync.nutripateSync = true;
    window.deletePetWeb = deleteAndSync;
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
      if (alignAllBreeds() && !syncing && typeof save === "function") save();
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
