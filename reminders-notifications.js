(function () {
  const firedKey = 'nutripate-fired-reminders';
  const reminderLabels = { morning: 'Утренняя порция', day: 'Дневная порция', evening: 'Вечерняя порция', weigh: 'Пора взвесить питомца' };

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function getFired() {
    try { return JSON.parse(localStorage.getItem(firedKey) || '{}'); } catch (_) { return {}; }
  }

  function checkReminderNotifications() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const r = state.reminders || {};
    const now = new Date();
    const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const day = todayKey();
    const fired = getFired();
    const checks = [
      ['enabled', 'morning'],
      ['enabled', 'day'],
      ['enabled', 'evening'],
      ['weighEnabled', 'weigh'],
    ];
    checks.forEach(([enabledKey, timeKey]) => {
      if (!r[enabledKey] || r[timeKey] !== current) return;
      const key = `${day}-${timeKey}-${current}`;
      if (fired[key]) return;
      new Notification('NutriPate', {
        body: reminderLabels[timeKey],
        icon: '/assets/nutripate-icon.jpg',
        tag: `nutripate-${key}`,
      });
      fired[key] = Date.now();
    });
    const keys = Object.keys(fired);
    if (keys.length > 30) keys.slice(0, keys.length - 30).forEach((key) => delete fired[key]);
    localStorage.setItem(firedKey, JSON.stringify(fired));
  }

  const originalSaveReminders = window.saveReminders;
  window.saveReminders = function saveRemindersWithNotifications() {
    originalSaveReminders();
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(() => checkReminderNotifications()).catch(() => {});
    } else {
      checkReminderNotifications();
    }
  };

  window.setInterval(checkReminderNotifications, 15000);
  checkReminderNotifications();
})();
