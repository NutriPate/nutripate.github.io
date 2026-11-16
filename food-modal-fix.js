(function () {
  function addBackButton() {
    const content = document.querySelector('#modal[open] #modalContent');
    if (!content || !content.querySelector('.food-detail') || content.querySelector('.food-detail-back')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'soft-button full food-detail-back';
    button.textContent = '← Назад к кормам';
    button.addEventListener('click', () => document.querySelector('#modal')?.close());
    content.appendChild(button);
  }
  new MutationObserver(addBackButton).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['open']});
  setTimeout(addBackButton, 0);
}());
