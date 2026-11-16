(function () {
  function fixFoodControls() {
    const content = document.querySelector('#modal[open] #modalContent');
    const detail = content?.querySelector('.food-detail');
    if (!detail) return;

    const imageName = detail.querySelector('.food-detail-hero img')?.src.split('/').pop() || '';
    const productPages = {
      'food-011-fixed.jpg': 'https://alphapet.ru/catalog/sterilizovannym-koshkam/anchousy-i-krevetki-myasnye-kusochki-v-souse-dlya-vzroslykh-sterilizovannykh-koshek/'
    };
    if (productPages[imageName] && !detail.querySelector('.food-page-link')) {
      const link = document.createElement('a');
      link.className = 'food-page-link';
      link.href = productPages[imageName];
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.innerHTML = '<span>Страница корма</span><b>→</b>';
      const removeButton = [...detail.querySelectorAll('button')].find((button) => button.textContent.trim().startsWith('Убрать'));
      if (removeButton) removeButton.before(link);
      else detail.appendChild(link);
    }
    [...detail.querySelectorAll('button')].forEach((button) => {
      const label = button.textContent.trim();
      if (label === 'Сравнить' || label === 'Этикетка') button.remove();
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
  }
  new MutationObserver(fixFoodControls).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['open']});
  setTimeout(fixFoodControls, 0);
}());
