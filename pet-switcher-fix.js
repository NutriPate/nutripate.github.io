(function(){
  const style=document.createElement('style');
  style.textContent=`
    body.pet-profile-route .app-header,body.pet-profile-route .bottom-nav{display:none!important}
    body.pet-profile-route .app-shell{min-height:100vh}
    body.pet-profile-route #appMain{padding:0;max-width:760px;margin:0 auto}
    .pet-profile-screen{min-height:100vh;background:#fff;padding:18px 24px 36px;color:#092f32}
    .pet-profile-back{display:inline-flex;align-items:center;gap:8px;border:0;background:transparent;padding:0;margin:0 0 16px;color:#13b5b5;font:inherit;font-weight:700;cursor:pointer}
    .pet-profile-back .arrow{font-size:28px;line-height:18px;font-weight:400}
    .pet-profile-screen h1{margin:0 0 22px;font-size:30px;line-height:1.12;color:#092f32}
    .pet-profile-hero{display:flex;align-items:center;justify-content:space-between;gap:18px;background:#d9f3f2;border-radius:22px;padding:22px 24px;margin-bottom:12px;min-height:150px}
    .pet-profile-hero-copy{min-width:0}.pet-profile-hero h2{margin:0 0 8px;font-size:28px;line-height:1.05;color:#092f32;overflow-wrap:anywhere}
    .pet-profile-hero p{margin:4px 0;color:#536e6b;font-size:15px}.pet-profile-photo{width:126px;height:126px;object-fit:contain;flex:0 0 126px;align-self:flex-end}
    .pet-profile-edit,.pet-profile-action{border:0;border-radius:999px;padding:10px 16px;background:#fff;color:#092f32;font:inherit;font-weight:700;cursor:pointer;margin-top:12px}
    .pet-profile-edit:hover,.pet-profile-action:hover{box-shadow:0 0 0 2px #13b5b5 inset}
    .pet-profile-row{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:68px;border-bottom:1px solid #dce8e6;font-size:16px}
    .pet-profile-row .label{color:#536e6b}.pet-profile-row .value{text-align:right;color:#092f32;font-weight:600}
    .pet-profile-ration{margin-top:20px;border:1px solid #dce8e6;border-radius:18px;padding:20px 18px}
    .pet-profile-ration h2{margin:0 0 10px;font-size:28px;line-height:1.1;color:#536e6b;font-weight:400}
    .pet-profile-ration .caption{margin:0 0 6px;color:#536e6b;font-size:13px}.pet-profile-ration .food-name{margin:0;font-size:22px;line-height:1.15;font-weight:700;overflow-wrap:anywhere}
    .pet-profile-ration .food-meta{margin:8px 0 0;color:#536e6b}.pet-profile-ration .empty-food{color:#536e6b;margin:0}
    @media(max-width:520px){.pet-profile-screen{padding:16px 18px 28px}.pet-profile-hero{padding:18px;gap:8px}.pet-profile-photo{width:104px;height:104px;flex-basis:104px}.pet-profile-hero h2{font-size:24px}.pet-profile-row{font-size:14px}}
  `;
  document.head.appendChild(style);
  const text=v=>String(v??'').trim();
  const activityLabel=p=>({low:'Низкая',medium:'Умеренная',high:'Высокая',very_high:'Очень высокая'}[p?.activity]||'Не указана');
  const sexLabel=p=>p?.sex==='male'?'Самец':'Самка';
  const ageLabel=p=>{const months=Math.max(0,Number(p?.ageMonths)||0),years=Math.floor(months/12),rest=months%12;if(!years)return `${rest} мес.`;const word=years%10===1&&years%100!==11?'год':years%10>=2&&years%10<=4&&(years%100<12||years%100>14)?'года':'лет';return `${years} ${word}`};
  const healthLabel=p=>{const labels=Array.isArray(p?.diagnoses)?p.diagnoses.map(id=>({healthy:'Здоров',overweight:'Лишний вес',ckd:'Почки',diabetes:'Диабет',allergy:'Аллергия',heart:'Сердце',joints:'Суставы',gi:'ЖКТ',urolithiasis:'МКБ',liver:'Печень'}[id]||id)).filter(Boolean):[];return labels.length?labels.join(', '):(Array.isArray(p?.allergens)&&p.allergens.length?'Есть аллергии':'Нет жалоб')};
  const rationTitle=p=>p?.species==='dog'?'Рацион собаки':'Рацион кошки';
  function leaveProfile(renderPage=true){document.body.classList.remove('pet-profile-route');window.__petProfileRoute=false;if(renderPage)render()}
  function renderPetProfile(){
    const p=activePet();if(!p)return;const food=chosenFood(),breed=text(p.breedLabel||p.breed)||'Порода не указана',species=p.species==='dog'?'Собака':'Кошка',weight=Number(p.weightKg??p.weight);
    document.body.classList.add('pet-profile-route');window.__petProfileRoute=true;document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
    const main=document.getElementById('appMain');
    main.innerHTML=`<section class="pet-profile-screen" aria-label="Профиль питомца"><button class="pet-profile-back" type="button" data-profile-back><span class="arrow">‹</span><span>NutriPate</span></button><h1>Мой ${esc(p.name||'питомец')}</h1><div class="pet-profile-hero"><div class="pet-profile-hero-copy"><h2>${esc(p.name||'Питомец')}</h2><p>${esc(species)} · ${esc(ageLabel(p))}</p><p>${esc(breed)}</p><button class="pet-profile-edit" type="button" data-profile-edit>Редактировать</button></div><img class="pet-profile-photo" src="${esc(petPhoto(p))}" alt="${esc(p.name||'Питомец')}"></div><div class="pet-profile-row"><span class="label">Пол · стерилизация</span><span class="value">${esc(sexLabel(p))} · ${p.sterilized?'да':'нет'}</span></div><div class="pet-profile-row"><span class="label">Вес · активность</span><span class="value">${Number.isFinite(weight)?`${weight} кг`:'—'} · ${esc(activityLabel(p))}</span></div><div class="pet-profile-row"><span class="label">Здоровье и аллергии</span><span class="value">${esc(healthLabel(p))}</span></div><section class="pet-profile-ration"><h2>${rationTitle(p)}</h2><p class="caption">Корм выбран</p>${food?`<p class="food-name">${esc(food.brand||'')} · ${esc(food.name||'Корм')}</p><p class="food-meta">${esc(food.form||'')} ${Number(food.kcal100)?`· ${Number(food.kcal100)} ккал / 100 г`:''}</p>`:'<p class="empty-food">Корм пока не выбран</p>'}<button class="pet-profile-action" type="button" data-profile-food>Открыть корма</button></section></section>`;
    main.querySelector('[data-profile-back]').onclick=()=>leaveProfile();main.querySelector('[data-profile-edit]').onclick=()=>{leaveProfile(false);petForm(p)};main.querySelector('[data-profile-food]').onclick=()=>{leaveProfile(false);tab='foods';render()};
  }
  function install(){const switcher=document.getElementById('petSwitcher');if(!switcher)return;switcher.onclick=function(event){event.preventDefault();const modal=document.getElementById('modal');if(modal?.open)modal.close();renderPetProfile()}}
  install();document.addEventListener('click',event=>{if(event.target.closest('[data-tab="pets"]')&&!window.__petProfileRoute)leaveProfile(false)});
})();
