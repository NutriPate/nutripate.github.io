(function () {
  function downloadNow() {
    if (typeof window.downloadReport === 'function') window.downloadReport();
  }

  const previousActions = window.actions;
  if (typeof previousActions === 'function') {
    window.actions = function (action) {
      if (action === 'report') return downloadNow();
      return previousActions(action);
    };
  }

  window.reportModal = downloadNow;

  document.addEventListener('click', function (event) {
    const trigger = event.target.closest('[data-action="report"]');
    if (!trigger) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    downloadNow();
  }, true);

  const modal = document.getElementById('modal');
  if (modal) {
    new MutationObserver(() => {
      if (!modal.open || !/Скачать JSON|Отчёт готов/.test(modal.textContent || '')) return;
      modal.close();
      downloadNow();
    }).observe(modal, { attributes: true, childList: true, subtree: true });
  }
}());
