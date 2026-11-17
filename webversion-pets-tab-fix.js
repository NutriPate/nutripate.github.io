(function(){
  const style=document.createElement('style');
  style.textContent=`
    .pets-tab-screen{padding:0 0 22px}
    .pets-tab-back{margin:0 0 10px;font:18px Georgia,serif;color:#07383a}
    .pets-tab-screen h1{margin:0 0 4px;font:30px Georgia,serif;color:#07383a}
    .pets-tab-subtitle{margin:0 0 18px;color:#53716f}
    .pets-tab-card{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:180px;padding:22px;border-radius:18px;background:#d9f6f3}
    .pets-tab-card h2{margin:0 0 6px;font:25px Georgia,serif;color:#07383a}
    .pets-tab-card p{margin:3px 0;color:#53716f}
    .pets-tab-card a{display:inline-block;margin-top:9px;color:#12aeb0}
    .pets-tab-card img{width:112px;height:140px;object-fit:contain;flex:0 0 auto}
    .pets-tab-add{margin-top:16px}
    .pets-tab-edit{display:block;width:100%;margin-top:16px;background:#d9f6f3!important;color:#07383a!important}
  `;
  document.head.appendChild(style);
  viewPets=function(){
    const pets=Array.isArray(state.pets)?state.pets:[];
    const cards=pets.map(p=>`<article class="pets-tab-card"><div><h2>${esc(p.name||'Питомец')}</h2><p>${p.species==='dog'?'Собака':'Кошка'} · ${Number(p.weight||0).toLocaleString('ru-RU',{minimumFractionDigits:1,maximumFractionDigits:1})} кг</p><a href="#" data-edit-pet="${esc(p.id)}">${esc(p.breedLabel||p.breed||'Порода не указана')}</a></div><img src="${esc(petPhoto(p))}" alt="${esc(p.name||'Питомец')}"></article>`).join('');
    const first=pets[0];
    return `<section class="pets-tab-screen"><div class="pets-tab-back">‹ <span>NutriPate</span></div><h1>Мои питомцы</h1><p class="pets-tab-subtitle">У каждого свой рацион и дневник.</p>${cards||'<div class="empty">Питомцев пока нет.</div>'}<button class="primary full pets-tab-add" data-action="add-pet">Добавить питомца</button>${first?`<button class="soft-button full pets-tab-edit" data-edit-pet="${esc(first.id)}">Редактировать ${esc(first.name||'питомца')}</button>`:''}</section>`;
  };
}());
