(function () {
  function isPro() {
    const until = Date.parse(state.proUntil || '');
    if (Number.isFinite(until)) return until > Date.now();
    return Boolean(state.pro);
  }

  function needPro() {
    if (isPro()) return false;
    if (typeof toast === 'function') toast('Эта функция доступна только с PRO');
    if (typeof proModal === 'function') proModal();
    return true;
  }

  function monthKey() {
    const now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  }

  function freeIds() {
    if (isPro() || typeof recommendedFoods !== 'function') return null;
    const key = monthKey();
    const stored = state.freeFoodShown || {};
    const current = stored[key];
    if (Array.isArray(current) && current.length) return current;
    const pet = typeof activePet === 'function' ? activePet() : null;
    const ranked = pet ? recommendedFoods(pet) : [];
    const ids = [];
    ranked.forEach((row) => {
      const id = row && row.food && row.food.id;
      if (id && ids.indexOf(id) < 0) ids.push(id);
    });
    const locked = ids.slice(0, 3);
    if (!locked.length) return locked;
    state.freeFoodShown = Object.assign({}, stored, { [key]: locked });
    if (typeof save === 'function') save();
    return locked;
  }

  if (typeof viewFoods === 'function') {
    const previousFoods = viewFoods;
    viewFoods = function () {
      const html = previousFoods();
      freeIds();
      const holder = document.createElement('div');
      holder.innerHTML = html;
      if (!holder.querySelector('[data-action="scan"]')) {
        const button = document.createElement('button');
        button.className = 'soft-button full';
        button.type = 'button';
        button.setAttribute('data-action', 'scan');
        button.textContent = 'Сканер упаковки';
        const search = holder.querySelector('.search');
        if (search) search.insertAdjacentElement('afterend', button);
        else holder.insertBefore(button, holder.firstChild);
      }
      return holder.innerHTML;
    };
  }

  if (typeof window.selectFood === 'function') {
    const previousSelect = window.selectFood;
    window.selectFood = function (id) {
      if (state.secondaryPicking && needPro()) {
        state.secondaryPicking = false;
        return;
      }
      const ids = freeIds();
      if (ids && ids.indexOf(id) < 0) {
        needPro();
        return;
      }
      return previousSelect.apply(this, arguments);
    };
  }

  if (typeof actions === 'function') {
    const previousActions = actions;
    actions = function (name) {
      if (name === 'add-pet' && Array.isArray(state.pets) && state.pets.length >= 1 && needPro()) return;
      const gates = ['reminders', 'treat', 'note', 'report', 'stock', 'weight', 'add-weight', 'scan'];
      if (gates.indexOf(name) >= 0 && needPro()) return;
      return previousActions(name);
    };
  }

  document.addEventListener('click', function (event) {
    const day = event.target.closest('[data-day]');
    if (day && needPro()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const weightTab = event.target.closest('[data-diary="weight"]');
    if (weightTab && needPro()) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
})();
