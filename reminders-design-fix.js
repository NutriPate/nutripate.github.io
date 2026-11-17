(function () {
  const escValue = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');

  window.remindersForm = function remindersFormDesigned() {
    const r = state.reminders || {};
    openModal(`
      <section class="reminders-screen">
        <div class="reminders-heading">
          <h2>Кормления</h2>
        </div>
        <div class="reminder-time-block">
          <div class="reminder-time-row"><span>Утро</span><strong>${escValue(r.morning || '08:00')}</strong></div>
          <input id="remMorning" class="reminder-time-input" type="time" value="${escValue(r.morning || '08:00')}">
        </div>
        <div class="reminder-time-block">
          <div class="reminder-time-row"><span>День</span><strong>${escValue(r.day || '14:00')}</strong></div>
          <input id="remDay" class="reminder-time-input" type="time" value="${escValue(r.day || '14:00')}">
        </div>
        <div class="reminder-time-block">
          <div class="reminder-time-row"><span>Вечер</span><strong>${escValue(r.evening || '20:00')}</strong></div>
          <input id="remEvening" class="reminder-time-input" type="time" value="${escValue(r.evening || '20:00')}">
        </div>
        <div class="reminder-section-title">Контроль веса</div>
        <div class="reminder-time-block reminder-weight-block">
          <div class="reminder-time-row"><span>Повторять</span><strong>Раз в неделю</strong></div>
          <input id="remWeigh" class="reminder-time-input" type="time" value="${escValue(r.weigh || '09:00')}">
        </div>
        <div class="reminder-status-row">
          <label class="reminder-pill"><input id="remEnabled" type="checkbox" ${r.enabled ? 'checked' : ''}><span>Кормление включено</span></label>
          <label class="reminder-pill"><input id="remWeighEnabled" type="checkbox" ${r.weighEnabled ? 'checked' : ''}><span>Вес включён</span></label>
        </div>
        <p class="reminder-note">Базовые напоминания бесплатны.</p>
        <button class="primary full reminders-save-button" type="button" onclick="saveReminders()">Сохранить напоминания</button>
      </section>
    `);
    document.querySelectorAll('.reminder-time-input').forEach((input) => {
      input.addEventListener('input', () => {
        const row = input.previousElementSibling?.querySelector('strong');
        if (row) row.textContent = input.value;
      });
    });
  };

  const originalViewPets = viewPets;
  viewPets = function viewPetsWithReminderEntry() {
    return `${originalViewPets()}<button class="pet-reminders-entry" data-action="reminders"><span><b>Напоминания</b><small>${state.reminders?.enabled ? 'Кормление включено' : 'Настроить время кормлений'}</small></span><strong>›</strong></button>`;
  };

  const originalViewToday = viewToday;
  viewToday = function viewTodayWithoutReminderEntry() {
    return originalViewToday().replace(/<button class="kv" data-action="reminders">[\s\S]*?<\/button>/, '');
  };

  const originalViewMore = viewMore;
  viewMore = function viewMoreWithoutReminderEntry() {
    return originalViewMore().replace(/<button class="more-row" data-action="reminders">[\s\S]*?<\/button>/, '');
  };
})();
