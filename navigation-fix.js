(function () {
  document.addEventListener('click', (event) => {
    const button = event.target.closest('.bottom-nav [data-tab]');
    if (!button || typeof render !== 'function') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    tab = button.dataset.tab;
    render();
  }, true);
}());
