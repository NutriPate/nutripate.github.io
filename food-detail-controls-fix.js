(function () {
  function fixFoodControls() {
    const content = document.querySelector('#modal[open] #modalContent');
    const detail = content?.querySelector('.food-detail');
    if (!detail) return;

    const foodName = detail.querySelector('h2')?.textContent.trim() || '';
    const foodRecord = typeof catalog !== 'undefined' && Array.isArray(catalog) ? catalog.find((food) => food.name === foodName) : null;
    const productUrl = foodRecord?.productUrl || foodRecord?.buy_url || '';
    if (productUrl && !detail.querySelector('.food-page-link')) {
      const link = document.createElement('a');
      link.className = 'food-page-link';
      link.href = productUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Страница корма';
      const actions = detail.querySelector('.food-detail-actions');
      if (actions) actions.appendChild(link);
      else detail.appendChild(link);
    }
    [...detail.querySelectorAll('button')].forEach((button) => {
      const label = button.textContent.trim();
      if (label === 'Сравнить') button.remove();
      if (label === 'Убрать из рациона' && !button.dataset.fixed) {
        button.dataset.fixed = '1';
        button.onclick = () => window.removePrimaryFoodWeb?.();
      }
    });
    const labelButton = [...detail.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Этикетка' || button.textContent.trim() === 'Этикетка →');
    if (labelButton) labelButton.remove();
  }
  const modalRoot = document.getElementById('modal') || document.body;
  new MutationObserver(fixFoodControls).observe(modalRoot, {childList: true, attributes: true, attributeFilter: ['open']});
  setTimeout(fixFoodControls, 0);
}());
