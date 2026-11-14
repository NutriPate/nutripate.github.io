const plans = document.querySelectorAll('.plan');
const planPrice = document.querySelector('#planPrice');
const planNote = document.querySelector('#planNote');
const planSaving = document.querySelector('#planSaving');
const subscribeButton = document.querySelector('#subscribeButton');
const subscribeNote = document.querySelector('#subscribeNote');
const pricingTitle = document.querySelector('.pricing-card > h3');
if (pricingTitle) pricingTitle.textContent = 'Подключите Pro на нужный период';
const compareSection = document.querySelector('#compare');
const proSection = document.querySelector('#pro');
if (compareSection && proSection) proSection.before(compareSection);
const planData = [
  {label:'1 месяц', price:'299 ₽', note:'за 1 месяц', saving:'Без скидки', discount:''},
  {label:'6 месяцев', price:'1 599 ₽', note:'за 6 месяцев · ≈ 266 ₽ / месяц', saving:'Экономия 11%', discount:'−11%'},
  {label:'12 месяцев', price:'2 999 ₽', note:'за 12 месяцев · ≈ 250 ₽ / месяц', saving:'Экономия 16%', discount:'−16%'}
];
plans.forEach((plan, index) => {
  const data = planData[index];
  if (!data) return;
  plan.dataset.price = data.price;
  plan.dataset.note = data.note;
  plan.dataset.saving = data.saving;
  plan.innerHTML = `<span>${data.label}</span><b>${data.price}</b><small>${data.note}</small>${data.discount ? `<em>${data.discount}</em>` : ''}`;
});
if (planData[0]) {
  planPrice.textContent = planData[0].price;
  planNote.textContent = planData[0].note;
  planSaving.textContent = planData[0].saving;
}
const compareProPrice = document.querySelector('.tier-pro .tier-head strong');
if (compareProPrice) compareProPrice.innerHTML = 'от 250 ₽<small>/ месяц</small>';
document.querySelectorAll('a[href="#pro"]').forEach((link) => { link.textContent = 'Подключить Pro'; });

plans.forEach((plan) => {
  plan.addEventListener('click', () => {
    plans.forEach((item) => item.classList.remove('active'));
    plan.classList.add('active');
    planPrice.textContent = plan.dataset.price;
    planNote.textContent = plan.dataset.note;
    planSaving.textContent = plan.dataset.saving;
    subscribeNote.textContent = 'Оплата пока не подключена. Выбранный период сохранён только для демонстрации будущего сценария.';
  });
});

subscribeButton.addEventListener('click', () => {
  subscribeNote.textContent = 'Скоро здесь появится оформление подписки. Сейчас это демонстрационная кнопка без оплаты.';
});
