(function () {
  function fixFoodControls() {
    const content = document.querySelector('#modal[open] #modalContent');
    const detail = content?.querySelector('.food-detail');
    if (!detail) return;

    const foodName = detail.querySelector('h2')?.textContent.trim() || '';
    const foodRecord = typeof catalog !== 'undefined' && Array.isArray(catalog) ? catalog.find((food) => food.name === foodName) : null;
    const productUrl = foodRecord?.productUrl || '';
    if (productUrl && !detail.querySelector('.food-page-link')) {
      const link = document.createElement('a');
      link.className = 'food-page-link';
      link.href = productUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.innerHTML = '<span>Страница корма</span><b>→</b>';
      const removeButton = [...detail.querySelectorAll('button')].find((button) => button.textContent.trim().startsWith('Убрать'));
      if (removeButton) removeButton.before(link);
      else detail.appendChild(link);
    }
    [...detail.querySelectorAll('button')].forEach((button) => {
      const label = button.textContent.trim();
      if (label === 'Сравнить') button.remove();
      if (label === 'Убрать из рациона' && !button.dataset.fixed) {
        button.dataset.fixed = '1';
        button.onclick = () => {
          const pet = activePet();
          if (!pet) return;
          delete state.selectedFoods[pet.id];
          if (state.ration?.[pet.id]) delete state.ration[pet.id];
          save();
          document.querySelector('#modal')?.close();
          window.toast?.('Корм убран из рациона');
          render();
        };
      }
    });
    const labelButton = [...detail.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Этикетка');
    const action = [...detail.querySelectorAll('button')].find((button) => {
      const text = button.textContent.trim();
      return text === 'Добавить в рацион' || text === 'Добавить вторым кормом' || text.startsWith('Убрать');
    }) || [...detail.querySelectorAll('button.primary')].pop();
    if (labelButton && action && action.nextElementSibling !== labelButton) action.after(labelButton);
    const back = detail.querySelector('.food-detail-back');
    if (labelButton && back && labelButton.nextElementSibling !== back) labelButton.after(back);
  }
  new MutationObserver(fixFoodControls).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['open']});
  setTimeout(fixFoodControls, 0);
}());
