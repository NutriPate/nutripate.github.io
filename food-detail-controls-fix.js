(function () {
  function fixFoodControls() {
    const content = document.querySelector('#modal[open] #modalContent');
    const detail = content?.querySelector('.food-detail');
    if (!detail) return;

    [...detail.querySelectorAll('button')].forEach((button) => {
      const label = button.textContent.trim();
      if (label === 'Сравнить') button.remove();
      if (label === 'Этикетка' && !button.dataset.fixed) {
        button.dataset.fixed = '1';
        button.onclick = () => {
          const image = detail.querySelector('.food-detail-hero img');
          if (image?.src) window.open(image.src, '_blank', 'noopener,noreferrer');
          else window.toast?.('Этикетка для этого корма недоступна');
        };
      }
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
