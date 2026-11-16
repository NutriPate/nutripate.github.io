(function () {
  function addBackButton() {
    const content = document.querySelector('#modal[open] #modalContent');
    if (!content || !content.querySelector('.food-detail') || content.querySelector('.food-detail-back')) return;
    const detail = content.querySelector('.food-detail');
    const removeButton = [...detail.querySelectorAll('button')].find((item) => item.textContent.trim().startsWith('Убрать из рациона'));
    const stack = document.createElement('div');
    stack.className = 'food-action-stack';
    if (removeButton && removeButton.parentElement === detail) {
      detail.insertBefore(stack, removeButton);
      stack.appendChild(removeButton);
    } else {
      detail.appendChild(stack);
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'soft-button full food-detail-back';
    button.textContent = '← Назад к кормам';
    button.addEventListener('click', () => document.querySelector('#modal')?.close());
    stack.appendChild(button);
  }
  new MutationObserver(addBackButton).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['open']});
  setTimeout(addBackButton, 0);
}());
