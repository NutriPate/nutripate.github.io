(function () {
  function addBackButton() {
    const content = document.querySelector('#modal[open] #modalContent');
    if (!content || !content.querySelector('.food-detail') || content.querySelector('.food-detail-back')) return;
    const detail = content.querySelector('.food-detail');
    if (detail.classList.contains('food-label')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'soft-button full food-detail-back';
    button.textContent = 'Назад к кормам';
    button.addEventListener('click', () => document.querySelector('#modal')?.close());
    const actions = detail.querySelector('.food-detail-actions');
    if (actions) actions.appendChild(button);
    else detail.appendChild(button);
  }
  function updateParameterLabel() {
    const detail = document.querySelector('#modal[open] .food-detail');
    if (!detail) return;
    const heading = [...detail.querySelectorAll('.mint-card h3')].find((item) => /Подойд[её]т ли|Подойдет ли/i.test(item.textContent));
    if (!heading) return;
    heading.textContent = 'Подходит под ваши параметры';
    const description = heading.parentElement.querySelector('p');
    if (description) description.textContent = 'Корм соответствует выбранным параметрам питомца.';
  }
  const refresh = () => { addBackButton(); updateParameterLabel(); };
  const modalRoot = document.getElementById('modal') || document.body;
  new MutationObserver(refresh).observe(modalRoot, {childList: true, attributes: true, attributeFilter: ['open']});
  setTimeout(addBackButton, 0);
  setTimeout(updateParameterLabel, 0);
}());
