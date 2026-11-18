(function () {
  window.ownerForm = function () {
    if (typeof window.nutripateOpenAuth === 'function') {
      window.nutripateOpenAuth('login');
      return;
    }
    if (typeof toast === 'function') toast('Вход по почте ещё загружается. Откройте профиль через секунду.');
  };
  try { ownerForm = window.ownerForm; } catch (e) {}
  document.addEventListener('click', function (event) {
    const row = event.target.closest && event.target.closest('.more-parity .owner-row, [data-action="owner"]');
    if (!row) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.ownerForm();
  }, true);
}());
