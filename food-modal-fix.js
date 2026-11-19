(function () {
  function addBackButton() {
    const content = document.querySelector('#modal[open] #modalContent');
    if (!content || !content.querySelector('.food-detail') || content.querySelector('.food-detail-back')) return;
    const detail = content.querySelector('.food-detail');
    if (detail.classList.contains('food-label')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'soft-button full food-detail-back';
    button.textContent = '← Назад к кормам';
    button.addEventListener('click', () => document.querySelector('#modal')?.close());
    const label = detail.querySelector('.food-label-button');
    const action = [...detail.querySelectorAll('button')].find((item) => {
      const text = item.textContent.trim();
      return text === 'Добавить в рацион' || text === 'Добавить вторым кормом' || text.startsWith('Убрать');
    });
    const anchor = (label && label.parentElement === detail) ? label : action;
    if (anchor) anchor.after(button);
    else detail.appendChild(button);
  }
  new MutationObserver(addBackButton).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['open']});
  setTimeout(addBackButton, 0);
}());
