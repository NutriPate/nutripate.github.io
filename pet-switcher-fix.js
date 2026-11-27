(function(){
  const style=document.createElement('style');
  style.textContent=`
    body.pet-picker-route .app-header,body.pet-picker-route .bottom-nav{display:none!important}
    body.pet-picker-route .app-shell{min-height:100vh}
    body.pet-picker-route #appMain{padding:0;max-width:760px;margin:0 auto}
    .pets-picker-screen{min-height:100vh;background:#fff;padding:18px 24px 36px;color:#092f32}
    .pets-picker-back{display:inline-flex;align-items:center;gap:8px;border:0;background:transparent;padding:0;margin:0 0 16px;color:#13b5b5;font:inherit;font-weight:700;cursor:pointer}
    .pets-picker-back .arrow{font-size:28px;line-height:18px;font-weight:400}
    .pets-picker-screen h1{margin:0 0 4px;font-size:30px;line-height:1.12;color:#092f32}
    .pets-picker-subtitle{margin:0 0 22px;color:#667e7e;font-size:15px}
    .pets-picker-card{display:flex;align-items:center;justify-content:space-between;gap:18px;background:#d9f3f2;border-radius:22px;padding:22px 24px;margin-bottom:16px;min-height:140px}
    .pets-picker-card-copy{min-width:0}.pets-picker-card h2{margin:0 0 8px;font-size:25px;line-height:1.05;color:#092f32;overflow-wrap:anywhere}
    .pets-picker-card p{margin:4px 0;color:#536e6b;font-size:15px}.pets-picker-card .selected{margin-top:10px;color:#13b5b5;font-weight:700}
    .pets-picker-photo{width:132px;height:132px;object-fit:contain;flex:0 0 132px;align-self:flex-end}
    .pets-picker-add,.pets-picker-edit{width:100%;border:0;border-radius:13px;padding:15px 18px;font:inherit;font-weight:700;cursor:pointer}
    .pets-picker-add{background:#13b5b5;color:#fff;margin:0 0 14px}.pets-picker-edit{background:#d9f3f2;color:#092f32}
    .pets-picker-note{margin:0 0 16px;color:#667e7e;font-size:15px;line-height:1.4}
    @media(max-width:520px){.pets-picker-screen{padding:16px 18px 28px}.pets-picker-card{padding:18px;gap:8px}.pets-picker-photo{width:112px;height:112px;flex-basis:112px}.pets-picker-card h2{font-size:23px}}
  `;
  document.head.appendChild(style);
  function leavePicker(renderPage=true){document.body.classList.remove('pet-picker-route');window.__petPickerRoute=false;if(renderPage)render()}
  function renderPetPicker(){
    const p=activePet();if(!p)return;
    const species=p.species==='dog'?'Собака':'Кошка',weight=Number(p.weightKg??p.weight),breed=p.breedLabel||p.breed||'';
    document.body.classList.add('pet-picker-route');window.__petPickerRoute=true;document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
    const main=document.getElementById('appMain');
    main.innerHTML=`<section class="pets-picker-screen" aria-label="Мои питомцы"><button class="pets-picker-back" type="button" data-picker-back><span class="arrow">‹</span><span>NutriPate</span></button><h1>Мои питомцы</h1><p class="pets-picker-subtitle">У каждого свой рацион и дневник.</p><div class="pets-picker-card"><div class="pets-picker-card-copy"><h2>${esc(p.name||'Питомец')}</h2><p>${esc(species)} · ${Number.isFinite(weight)?`${weight.toLocaleString('ru-RU',{minimumFractionDigits:1,maximumFractionDigits:1})} кг`:'вес не указан'}</p>${breed?`<p>${esc(breed)}</p>`:''}<p class="selected">Выбран</p></div><img class="pets-picker-photo" src="${esc(petPhoto(p))}" alt="${esc(p.name||'Питомец')}"></div><button class="pets-picker-add" type="button" data-picker-add>Добавить питомца · PRO</button><p class="pets-picker-note">Один питомец бесплатно. Остальные — в PRO,<br>текущий никуда не денется.</p><button class="pets-picker-edit" type="button" data-picker-edit>Редактировать ${esc(p.name||'питомца')}</button></section>`;
    main.querySelector('[data-picker-back]').onclick=()=>leavePicker();
    main.querySelector('[data-picker-add]').onclick=()=>{leavePicker(false);petForm()};
    main.querySelector('[data-picker-edit]').onclick=()=>{leavePicker(false);petForm(p)};
  }
  function install(){const switcher=document.getElementById('petSwitcher');if(!switcher)return;switcher.onclick=function(event){event.preventDefault();const modal=document.getElementById('modal');if(modal?.open)modal.close();renderPetPicker()}}
  install();
  document.addEventListener('click',event=>{if(event.target.closest('[data-tab="pets"]')&&!window.__petPickerRoute)leavePicker(false)});
})();
