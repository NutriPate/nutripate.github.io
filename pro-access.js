(function () {
  function isPro() {
    const until = Date.parse(state.proUntil || '');
    if (Number.isFinite(until)) return until > Date.now();
    return Boolean(state.pro);
  }

  function needPro(text) {
    if (isPro()) return false;
    if (typeof toast === 'function') toast(text);
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
      const ids = freeIds();
      if (!ids) return html;
      const holder = document.createElement('div');
      holder.innerHTML = html;
      holder.querySelectorAll('[data-food]').forEach((button) => {
        const card = button.closest('article, .food-card') || button.parentElement;
        if (card && ids.indexOf(button.getAttribute('data-food')) < 0) card.remove();
      });
      holder.querySelectorAll('[data-action="more-foods"]').forEach((button) => button.remove());
      if (!holder.querySelector('.free-food-note')) {
        const note = document.createElement('p');
        note.className = 'muted free-food-note';
        note.textContent = 'Бесплатно три корма в месяц, со ссылкой в магазин у каждого. Остальной подбор — в PRO.';
        holder.appendChild(note);
      }
      return holder.innerHTML;
    };
  }

  if (typeof window.selectFood === 'function') {
    const previousSelect = window.selectFood;
    window.selectFood = function (id) {
      if (state.secondaryPicking && needPro('Сухой и влажный корм вместе есть в PRO.')) {
        state.secondaryPicking = false;
        return;
      }
      const ids = freeIds();
      if (ids && ids.indexOf(id) < 0) {
        needPro('В этом месяце бесплатно три корма. Следующий подбор — в PRO.');
        return;
      }
      return previousSelect.apply(this, arguments);
    };
  }

  if (typeof actions === 'function') {
    const previousActions = actions;
    actions = function (name) {
      if (name === 'add-pet' && Array.isArray(state.pets) && state.pets.length >= 1 && needPro('Второй питомец есть в PRO.')) return;
      const gates = {
        reminders: 'Напоминания есть в PRO.',
        treat: 'Учёт лакомств есть в PRO.',
        note: 'Записи о самочувствии есть в PRO.',
        report: 'Отчёт для ветеринара есть в PRO.',
        stock: 'Расчёт, на сколько дней хватит пачки, есть в PRO.',
        weight: 'Дневник веса есть в PRO.',
        'add-weight': 'Дневник веса есть в PRO.',
        'more-foods': 'Остальные корма открываются в PRO.',
      };
      if (gates[name] && needPro(gates[name])) return;
      return previousActions(name);
    };
  }

  document.addEventListener('click', function (event) {
    const day = event.target.closest('[data-day]');
    if (day && needPro('История кормления по дням есть в PRO. Сегодняшняя отметка «Покормил» остаётся на главном экране.')) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const weightTab = event.target.closest('[data-diary="weight"]');
    if (weightTab && needPro('Дневник веса с графиком есть в PRO.')) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
})();
