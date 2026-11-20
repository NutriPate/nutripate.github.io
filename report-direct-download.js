(function () {
  document.addEventListener('click', function (event) {
    const trigger = event.target.closest('[data-action="report"]');
    if (!trigger || typeof window.downloadReport !== 'function') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.downloadReport();
  }, true);
}());
