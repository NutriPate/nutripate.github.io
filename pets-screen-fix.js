(function () {
  const originalViewPets = window.viewPets;
  const escText = value => typeof window.esc === 'function' ? window.esc(value) : String(value ?? '');
  const yearsLabel = months => {
    const n = Number(months || 0);
    if (!n) return 'Возраст не указан';
    if (n < 12) return `${n} мес.`;
    const years = Math.floor(n / 12);
    return `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}`;
  };
  const activityLabel = value => ({ low:'Низкая', medium:'Умеренная', high:'Высокая', very_high:'Очень высокая' }[value] || 'Умеренная');
  const diagnosisLabel = value => ({ healthy:'Не указаны', overweight:'Лишний вес', ckd:'Почки', diabetes:'Диабет', allergy:'Аллергия', heart:'Сердце', joints:'Суставы', gi:'ЖКТ', urolithiasis:'МКБ', liver:'Печень' }[value] || value);
  const allergyLabel = value => ({ chicken:'Курица', beef:'Говядина', fish:'Рыба', lamb:'Баранина', turkey:'Индейка', duck:'Утка', dairy:'Молочное', egg:'Яйцо', grain:'Злаки / глютен', soy:'Соя' }[value] || value);
  const petValue = p => {
    const diagnoses = (p.diagnoses || []).filter(x => x && x !== 'healthy').map(diagnosisLabel);
    const allergies = (p.allergens || []).map(allergyLabel);
    return [...diagnoses, ...allergies].join(', ') || 'Не указаны';
  };
  window.viewPets = function () {
    const p = typeof window.activePet === 'function' ? window.activePet() : null;
    if (!p) return originalViewPets();
    const rows = typeof window.mealRows === 'function' ? window.mealRows() : [];
    const logged = typeof window.loggedToday === 'function' ? window.loggedToday() : [];
    const next = rows[Math.min(logged.length, rows.length - 1)] || rows[0] || { name:'Утро', time:'08:00', grams:0 };
    const mealName = ({Утро:'Утренняя',День:'Дневная',Вечер:'Вечерняя'})[next.name] || next.name;
    const food = typeof window.chosenFood === 'function' ? window.chosenFood() : null;
    const grams = typeof window.dailyGrams === 'function' ? window.dailyGrams() : 0;
    const species = p.species === 'dog' ? 'собаки' : 'кошки';
    const breed = p.breedLabel || p.breed || 'Порода не указана';
    const sex = p.sex === 'male' ? 'Самец' : 'Самка';
    const sterilized = p.sterilized ? 'да' : 'нет';
    const rationName = food ? `${food.brand} ${food.name}` : 'Корм не выбран';
    return `<div class="pets-parity">
      <button class="pets-meal-bar" data-tab-go="today"><span>${escText(mealName)} порция · ${escText(next.grams)} г · ${escText(next.time)}</span><b>Открыть</b></button>
      <div class="pets-parity-title"><h1>Моя ${escText(p.name || 'питомец')}</h1></div>
      <section class="pets-hero-card">
        <div><h2>${escText(p.name || 'Питомец')}</h2><p>${p.species === 'dog' ? 'Собака' : 'Кошка'} · ${yearsLabel(p.ageMonths)}</p><p>${escText(breed)}</p><button class="soft-button" data-edit-pet="${escText(p.id)}">Редактировать</button></div>
        <img class="pets-hero-photo" src="${escText(typeof window.petPhoto === 'function' ? window.petPhoto(p) : '')}" alt="${escText(p.name || 'Питомец')}">
      </section>
      <div class="pets-info-list">
        <button class="pets-info-row" type="button" data-edit-pet="${escText(p.id)}"><span>Пол · стерилизация</span><strong>${sex} · ${sterilized} <b>›</b></strong></button>
        <button class="pets-info-row" type="button" data-edit-pet="${escText(p.id)}"><span>Вес · активность</span><strong>${escText(String(p.weight || '—').replace('.', ','))} кг · ${activityLabel(p.activity)} <b>›</b></strong></button>
        <button class="pets-info-row" type="button" data-edit-pet="${escText(p.id)}"><span>Здоровье и аллергии</span><strong>${escText(petValue(p))} <b>›</b></strong></button>
      </div>
      <section class="pets-ration-card"><h3>Рацион ${species}</h3><p>${escText(grams)} г / день · 3 кормления</p><p>${escText(rationName)}</p></section>
      <section class="pets-report-card"><h3>История питомца в одном отчёте</h3><p>График веса, рацион и ваши записи. Отчёт можно сохранить и отправить ветеринару.</p><button class="primary" data-action="report">Скачать отчёт</button></section>
      <button class="more-row" data-action="reminders"><span>Напоминания</span><span>${state.reminders && state.reminders.enabled ? 'Настроены' : 'Настроить'} ›</span></button>
      <button class="pets-add" data-action="add-pet">+ Добавить питомца</button>
      <p class="muted pets-disclaimer">Расчёт — ориентир. При болезни рацион согласовывают с ветеринаром.</p>
    </div>`;
  };
  document.addEventListener('DOMContentLoaded', () => { if (typeof window.render === 'function') window.render(); });
}());
