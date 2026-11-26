// Safety switch: accounts and OTP login stay enabled, but account state never
// leaves this device and cloud state is never pulled while this is true.
const SYNC_FROZEN=false;
const stateKey='nutripate-web-state-v1';
const fallbackFoods=[
 {id:'demo-1',name:'Sterilised 37',brand:'Royal Canin',species:'cat',form:'dry',kcalPer100g:367,proteinPer100g:37,fatPer100g:12,tier:'premium',image:'assets/foods_white/catalog-rcat-ajo01.jpg',composition:'Белок, рис, кукуруза, жиры и функциональные добавки.'},
 {id:'demo-2',name:'Indoor 27',brand:'Royal Canin',species:'cat',form:'dry',kcalPer100g:374,proteinPer100g:27,fatPer100g:13,tier:'premium',image:'assets/foods_white/catalog-rcat-ajo-fs.jpg',composition:'Рацион для домашних кошек с умеренной активностью.'},
 {id:'demo-3',name:'Sensitive',brand:'Pro Plan',species:'cat',form:'wet',kcalPer100g:90,proteinPer100g:10,fatPer100g:5,tier:'good',image:'assets/foods_white/catalog-rcat-ajo-kt.jpg',composition:'Влажный рацион для чувствительного пищеварения.'}
];
let catalog=[]; let tab='today'; let diaryTab='feed'; let weightPeriod='week'; let query=''; let foodFilter='all'; let foodLimitWeb=8;
const $=id=>document.getElementById(id);
const loadState=()=>{try{return JSON.parse(localStorage.getItem(stateKey))||{}}catch{return {}}};
let state=Object.assign({pets:[],activePetId:null,owner:{name:'',email:'',privacyConsent:false},selectedFoods:{},favorites:[],feedEntries:[],weights:[],diaryDay:null},loadState());state.pets=Array.isArray(state.pets)?state.pets:[];state.feedEntries=Array.isArray(state.feedEntries)?state.feedEntries:[];state.weights=Array.isArray(state.weights)?state.weights:[];state.favorites=Array.isArray(state.favorites)?state.favorites:[];state.selectedFoods=state.selectedFoods&&typeof state.selectedFoods==='object'?state.selectedFoods:{};
function normalizePet(p){const q=petDefaults(p);q.weight=Number(p?.weightKg??p?.weight??q.weight)||4.2;q.weightKg=q.weight;q.targetWeight=p?.targetWeightKg??p?.targetWeight??null;q.targetWeightKg=q.targetWeight;q.ageMonths=Number(p?.ageMonths??q.ageMonths??24);q.diagnoses=q.diagnoses?.length?q.diagnoses:['healthy'];q.allergens=q.allergens||[];q.activity=q.activity||'medium';q.sterilized=q.sterilized!==false;return q}
state.pets=(state.pets||[]).map(normalizePet);state.owner=Object.assign({name:'',email:'',privacyConsent:false},state.owner||{});if(state.pets.length===1&&state.pets[0].id==='luna'&&state.pets[0].name==='Луна'&&!state.feedEntries.length&&!state.weights.length){state.pets=[];state.activePetId=null;localStorage.setItem(stateKey,JSON.stringify(state));}
const save=()=>{const now=new Date().toISOString();state.pets=(state.pets||[]).map(pet=>{const snap=JSON.stringify(Object.assign({},pet,{updatedAt:null}));const prev=(window.__petSnap||{})[pet.id];if(prev&&prev!==snap)pet.updatedAt=now;if(!pet.updatedAt)pet.updatedAt=now;window.__petSnap=window.__petSnap||{};window.__petSnap[pet.id]=JSON.stringify(Object.assign({},pet,{updatedAt:null}));return pet});const screen=state.authScreen;delete state.authScreen;localStorage.setItem(stateKey,JSON.stringify(state));if(screen)state.authScreen=screen;if(window.nutripateAfterSave)window.nutripateAfterSave()};
window.nutripateReadState=function(){return JSON.parse(JSON.stringify(state));};
window.nutripateReplaceState=function(next){const account=state.account;const screen=state.authScreen;const prevFoods=Object.assign({},state.selectedFoods||{});const prevSet=Object.assign({},state.foodSetAt||{});const tombs=Object.assign({},state.petTombstones||{},(next&&next.petTombstones)||{});const removed=new Set([].concat(state.removedPetIds||[],(next&&next.removedPetIds)||[],Object.keys(tombs)).map(String));state=Object.assign({},next||{});state.account=account||{token:'',email:'',name:''};if(screen)state.authScreen=screen;state.petTombstones=tombs;state.removedPetIds=[...removed];state.pets=(Array.isArray(state.pets)?state.pets:[]).filter((pet)=>pet&&!removed.has(String(pet.id))).map(normalizePet);state.selectedFoods=Object.assign({},state.selectedFoods||{});Object.keys(prevFoods).forEach(id=>{const prev=prevFoods[id];if(!prev||prev==='__not_selected__')return;const incoming=state.selectedFoods[id];const prevAt=String(prevSet[id]||'');const nextAt=String((state.foodSetAt||{})[id]||'');if(!incoming||incoming==='__not_selected__'||(prevAt&&prevAt>=nextAt)){state.selectedFoods[id]=prev;state.foodSetAt=Object.assign({},state.foodSetAt,{[id]:prevAt||new Date().toISOString()});state.foodChoiceSource=Object.assign({},state.foodChoiceSource,{[id]:prev});state.foodChoiceConfirmed=Object.assign({},state.foodChoiceConfirmed,{[id]:prev})}});const keep=window.nutripateAfterSave;window.nutripateAfterSave=null;save();window.nutripateAfterSave=keep;if(!document.getElementById('webAuthCode')&&typeof render==='function')render();};
const activePet=()=>state.pets.find(p=>p.id===state.activePetId)||state.pets[0];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rub=n=>new Intl.NumberFormat('ru-RU').format(Math.round(n||0));
const todayKey=()=>new Date().toISOString().slice(0,10);state.diaryDay=state.diaryDay||todayKey();
const petEmoji=p=>p?.species==='dog'?'Собака':'Кошка';
function breedPhotoId(p){
  const direct=String(p?.breedId||'');
  const normalize=value=>String(value||'').toLowerCase().replace(/ё/g,'е').replace(/[‐‑‒–—-]/g,' ').replace(/[^a-zа-я0-9]+/g,' ').trim();
  const wanted=[p?.breedLabel,p?.breed].map(normalize).filter(Boolean);
  if(typeof breedAssetByName!=='undefined'){
    const found=Object.entries(breedAssetByName).find(([name])=>wanted.includes(normalize(name)));
    if(found)return found[1];
  }
  if(/^(cat|dog)-\d+$/.test(direct))return direct;
  return '';
}
const breedAssetExtension={
  'dog-01':'png','dog-02':'png','dog-03':'png','dog-04':'png','dog-05':'png','dog-06':'png','dog-07':'png','dog-08':'png','dog-09':'png','dog-10':'png','dog-11':'png','dog-12':'png','dog-13':'png','dog-14':'png','dog-15':'png','dog-16':'png','dog-17':'png','dog-19':'png','dog-20':'png','dog-21':'png','dog-22':'png','dog-23':'png','dog-24':'png','dog-25':'png'
};
const breedAssetPath=id=>String(id).startsWith('assets/')?String(id):`assets/breeds/${id}.${breedAssetExtension[id]||'png'}`;
const petPhoto=p=>{
  // Only an explicitly uploaded image wins. Old generated asset paths must
  // not hide the selected breed's canonical photo.
  const uploaded=String(p?.photo||'');
  if(uploaded.startsWith('data:'))return uploaded;
  const id=breedPhotoId(p);
  return id?breedAssetPath(id):(p?.species==='dog'?'assets/dachshund.png':'assets/report_cat.jpg');
};
const foodImage=f=>{const path=String(f?.image||'').replace(/\\/g,'/');return path.startsWith('assets/')?path:''};
function toast(text){const el=$('toast');el.textContent=text;el.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove('show'),2200)}
function foodById(id){return catalog.find(f=>f.id===id)}
function chosenFood(){const p=activePet();return foodById(state.selectedFoods?.[p?.id])}
function pyRound(value){const n=Number(value)||0;if(!Number.isFinite(n))return 0;const sign=n<0?-1:1,x=Math.abs(n),floor=Math.floor(x),fraction=x-floor;if(fraction<.5)return sign*floor;if(fraction>.5)return sign*(floor+1);return sign*(floor%2===0?floor:floor+1)}
function petWeight(p){return Number(p?.weightKg??p?.weight)||4}
function petTargetWeight(p){const raw=p?.targetWeightKg??p?.targetWeight;if(raw===null||raw===undefined||raw==='')return null;const n=Number(raw);return Number.isFinite(n)?n:null}
function ageMonths(p){if(p?.ageMonths!==null&&p?.ageMonths!==undefined&&p?.ageMonths!=='')return Math.max(0,Math.trunc(Number(p.ageMonths)));const raw=String(p?.birthDate||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(raw))return 24;const born=new Date(`${raw}T00:00:00`),now=new Date();let months=(now.getFullYear()-born.getFullYear())*12+now.getMonth()-born.getMonth();if(now.getDate()<born.getDate())months-=1;return Math.max(0,months)}
function rer(p){return window.NutriPateNutrition?window.NutriPateNutrition.rer(petWeight(p)):70*Math.pow(Math.max(petWeight(p),.3),.75)}
function goalWeight(p){const w=petWeight(p),target=petTargetWeight(p);return target!==null&&target>0&&target<w*.95?Math.round(target*100)/100:null}
function isLosing(p){return goalWeight(p)!==null&&ageMonths(p)>=12}
function isSenior(p){const m=ageMonths(p),w=petWeight(p);return p?.species==='cat'?m>=84:(w>40?m>=72:w>25?m>=84:w>10?m>=96:m>=108)}
 function derFactor(p){const m=ageMonths(p),w=petWeight(p),cat=p?.species==='cat',d=p?.diagnoses||[],a=p?.activity||'medium',losing=isLosing(p);let f;if(cat){if(m<4)f=2.5;else if(m<8)f=2;else if(m<12)f=1.8;else if(losing)f=.8;else if(d.includes('overweight'))f=1;else if(p?.sterilized)f=1.2;else f=1.4;if(!losing){if(a==='high')f+=.1;else if(a==='very_high')f+=.2}}else{if(m<4)f=3;else if(m<12)f=2;else if(losing)f=1;else if(d.includes('overweight'))f=1.2;else if(p?.sterilized)f=1.4;else f=1.6;if(!losing){if(a==='high')f+=.15;else if(a==='very_high')f+=.3}if(m>=12&&w>40)f*=.95}if(m>=12&&!losing&&isSenior(p))f*=cat?(m>=144?1.05:.95):.9;return f}
function kcalAdjust(p){const n=pyRound(Number(p?.kcalAdjust)||0);return Math.max(-30,Math.min(30,n))}
 function kcalNeed(p){if(!p)return 0;if(window.NutriPateNutrition)return window.NutriPateNutrition.kcalNeed(p);const goal=goalWeight(p),baseWeight=goal!==null&&ageMonths(p)>=12?goal:petWeight(p);const kcal=rer({...p,weightKg:baseWeight})*derFactor(p);return pyRound(kcal*(1+kcalAdjust(p)/100))}
function foodBudgetKcal(p){const need=kcalNeed(p),treats=(state.feedEntries||[]).filter(x=>x.petId===p?.id&&x.date===todayKey()&&x.kind==='treat').reduce((s,x)=>s+Number(x.kcal||0),0);return pyRound(Math.max(need*.75,need-treats))}
function dailyGrams(p=activePet(),food=chosenFood()){if(!p||!food)return 0;if(window.NutriPateNutrition)return window.NutriPateNutrition.portionGrams(p,food);const raw=foodBudgetKcal(p)/(Number(food.kcalPer100g)||370)*100;return Math.max(0,pyRound(raw/5)*5)}
function mealRows(){const total=dailyGrams(),one=pyRound(total/3),two=pyRound(total/3),three=Math.max(0,total-one-two),r=state.reminders||{};return [{name:'Утро',time:r.morning||'08:00',grams:one},{name:'День',time:r.day||'13:00',grams:two},{name:'Вечер',time:r.evening||'19:00',grams:three}]}
function loggedToday(){return state.feedEntries.filter(x=>x.petId===activePet()?.id&&x.date===todayKey()&&(x.kind||'feed')==='feed')}
function startOnboarding(){petForm();}
function viewWelcome(){return `<section class="welcome-screen"><div class="welcome-brand">Nutri<span>Pate</span></div><h1>Добро пожаловать!</h1><img class="welcome-art" src="assets/welcome_pets.png" alt="Питомцы рядом"><h2>Здесь будет день<br>вашего питомца</h2><p class="welcome-lead">Всего один профиль — и важное всегда под рукой: корм, порция и время кормления.</p><button class="primary" data-action="start-onboarding">Добавить первого питомца</button><div class="welcome-example"><b>Что понадобится</b><p>Возраст, вес, активность и особенности здоровья.</p></div><p class="welcome-note">Один питомец и основной дневник — бесплатно.</p></section>`}
function mealBar(){const p=activePet(),rows=mealRows(),next=rows[loggedToday().length]||rows[2];return `<div class="meal-bar"><span>${next.name} порция · ${next.grams} г · ${next.time}</span><button type="button" onclick="tab='today';render()">Открыть</button></div>`}
function render(){const p=activePet();const nav=document.querySelector('.bottom-nav');const switcher=$('petSwitcher');if(!p){nav.hidden=false;nav.style.setProperty('display','grid','important');nav.style.setProperty('visibility','visible','important');switcher.style.display='none';document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));if(!tab||tab==='today'){$('appMain').innerHTML=viewWelcome();bind();return}$('appMain').innerHTML=({today:viewToday,foods:viewFoods,diary:viewDiary,pets:viewPets,more:viewMore}[tab]||viewWelcome)();bind();return}nav.style.display='grid';switcher.style.display='flex';$('petName').textContent=p.name||'Питомец';$('petAvatar').innerHTML=`<img class="pet-inline-photo" src="${petPhoto(p)}" alt="">`;document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));$('appMain').innerHTML=mealBar()+({today:viewToday,foods:viewFoods,diary:viewDiary,pets:viewPets,more:viewMore}[tab])();bind();}
function title(kicker,title,sub=''){return `<div class="screen-title"><p class="eyebrow">${kicker||''}</p><h1>${title}</h1>${sub?`<p>${sub}</p>`:''}</div>`}
function viewToday(){const p=activePet(),f=chosenFood(),rows=mealRows(),logged=loggedToday(),given=logged.reduce((a,x)=>a+(x.grams||0),0),total=dailyGrams();if(!p)return `<div class="empty">Добавьте питомца, чтобы начать.</div>`;return `${title('ВТОРНИК, 10 НОЯБРЯ','Сегодня','Демо-профиль · данные хранятся на устройстве')}${f?`<section class="card mint-card hero-card"><div class="hero-row"><div><div class="meal-top">СЛЕДУЮЩЕЕ · ${rows[logged.length]?.time||'19:00'}</div><h2>${rows[logged.length]?.name||'Вечерняя порция'}</h2><div class="grams">${rows[logged.length]?.grams||0}<small>г</small></div><p class="food-line">${esc(f.brand)} · ${esc(f.name)}</p></div><div class="pack"><img class="hero-food-photo" src="${foodImage(f)}" alt=""></div></div><button class="primary full" data-action="feed">Покормил</button></section>`:`<section class="card mint-card hero-card"><h2>Выберите корм для ${esc(p.name)}</h2><p class="muted">Подберите рацион в каталоге, чтобы получить суточную норму.</p><button class="primary" data-tab-go="foods">Выбрать корм</button></section>`}<section><div class="progress-head"><span>Питание сегодня</span><strong>${given} из ${total} г</strong></div><div class="progress"><i style="width:${total?Math.min(100,given/total*100):0}%"></i></div><div class="meal-slots">${rows.map((r,i)=>`<div class="meal-slot ${i<logged.length?'done':'pending'}"><b>${i<logged.length?'✓':'○'} ${r.name}</b><small>${r.time} · ${r.grams} г</small></div>`).join('')}</div></section><button class="kv" data-action="weight"><span>Взвешивание</span><strong>${lastWeightLabel()}</strong><span>›</span></button><button class="kv" data-action="stock"><span>Запас корма</span><strong>${f?'≈ 12 дней':'Нет корма'}</strong><span>›</span></button><div class="card norm"><strong>Норма ${total||'—'} г / день</strong><button class="link-button" data-action="calc">Как рассчитана порция&nbsp; ›</button></div>`}
function lastWeightLabel(){const rows=state.weights.filter(x=>x.petId===activePet()?.id);return rows.length?`${rows[rows.length-1].kg} кг`:'Нет записей'}
function foodHasAllergen(f,code){const words={chicken:['курин','куриц','цыпл','chicken'],beef:['говя','beef'],fish:['рыб','лосос','тунец','треск','форел','fish'],lamb:['баран','ягнен','lamb'],turkey:['индей','turkey'],duck:['утк','duck'],dairy:['молок','сыр','dairy'],egg:['яйц','egg'],grain:['пшениц','кукуруз','ячмен','овес','овёс','глютен','злак'],soy:['соя','соев','soy']}[code]||[];const text=`${f.brand||''} ${f.name||''} ${f.composition||''}`.toLowerCase().replace(/без\s+[^,.]+/g,' ');return words.some(w=>text.includes(w))}
function foodRecommendation(f,p=activePet()){if(!p||f.species!==p.species)return null;const tags=new Set(f.tags||[]),medical=[...(f.tags||[])].filter(t=>String(t).startsWith('medical:')).map(t=>t.split(':')[1]),diags=p.diagnoses||['healthy'];if(medical.length&&!tags.has('healthy')&&!medical.some(x=>diags.includes(x)))return null;if((p.allergens||[]).some(a=>foodHasAllergen(f,a)))return null;const adult=(Number(p.ageMonths)||24)>=12;if(adult&&(tags.has('kitten')||tags.has('puppy')||/котён|котен|щенок|щенк|kitten|puppy/i.test(f.name||'')))return null;if(!adult&&!tags.has('kitten')&&!tags.has('puppy')&&!/котён|котен|щенок|щенк|kitten|puppy/i.test(f.name||''))return null;let score=50,reasons=[];const sterilized=p.sterilized!==false;const activityFactor={low:.9,medium:1,high:1.1,very_high:1.2}[p.activity]||1;if(sterilized&&!medical.length){if(tags.has('sterilised')){score+=25;reasons.push('линейка для стерилизованных')}else if((Number(f.fatPer100g)||20)<=13){score+=9;reasons.push('умеренная жирность')}else if((Number(f.fatPer100g)||20)>=18)score-=20}const protein=Number(f.proteinPer100g)||0;const targetProtein=p.species==='cat'?34:27;if(protein){const diff=Math.abs(protein-targetProtein);score+=Math.max(0,16-diff*1.6);if(diff<=3)reasons.push('белок подходит профилю')}const kcal=Number(f.kcalPer100g)||0;const baseK=p.species==='cat'?380:365;const want=baseK*activityFactor*(sterilized?.92:1);if(kcal){const diff=Math.abs(kcal-want);score+=Math.max(0,20-diff*.12);if(diff<=35)reasons.push('калорийность подходит')}if(diags.includes('overweight')){if(tags.has('overweight')||/sterilis|light|weight|slim|лишн/i.test(f.name||''))score+=18;else if(kcal>410)score-=20;reasons.push('учтён контроль веса')}if(tags.has('medical:allergy')&&!diags.includes('allergy'))score-=30;if(tags.has('healthy')&&diags.includes('healthy'))score+=4;if(f.compositionVerified)score+=4;if(f.tier==='premium')score+=3;else if(f.tier==='mid')score+=1;if(f.form==='wet')score+=2;if(medical.length&&medical.some(x=>diags.includes(x))){score+=35;reasons.push('лечебный корм по диагнозу')}const group=medical.length&&!tags.has('healthy')&&medical.some(x=>diags.includes(x))?'medical':diags.includes('overweight')?'weight':f.tier==='premium'?'best':f.tier==='mid'?'good':'budget';return score>0?{score,group,badge:score>=78?'Лучше подходит':score>=60?'Подходит':'Можно рассмотреть',reason:reasons[0]||'проверен по профилю'}:null}
function recommendedFoods(p=activePet()){return catalog.map(f=>({food:f,rec:foodRecommendation(f,p)})).filter(x=>x.rec).sort((a,b)=>b.rec.score-a.rec.score)}
function viewFoods(){const p=activePet();const ranked=recommendedFoods(p);let rows=ranked.filter(x=>{const f=x.food;return(!query||`${f.brand} ${f.name} ${f.composition||''}`.toLowerCase().includes(query.toLowerCase()))&&(foodFilter==='all'||(foodFilter==='fav'?state.favorites.includes(f.id):f.form===foodFilter))});rows=rows.slice(0,foodLimitWeb);const sections=[['medical','Лечебные','Только под указанные особенности и по назначению врача.'],['weight','Для контроля веса','Меньше калорий и более подходящие линейки.'],['best','Лучшие','Лучше всего подходят по профилю.'],['good','Хорошие','Тоже подходят профилю питомца.'],['budget','Бюджетные','Цена ниже, но профиль всё равно учитывается.']];const content=sections.map(([key,heading,sub])=>{const group=rows.filter(x=>(x.rec.group||'good')===key);return group.length?`<section class="recommendation-section"><h2>${heading}</h2><p class="muted">${sub}</p><div class="food-list">${group.map(x=>foodCard(x.food)).join('')}</div></section>`:''}).join('');return `${title('КАТАЛОГ','Корма',p?`Подбор по профилю ${p.name}`:'Выберите питомца')}<input class="search" id="foodSearch" value="${esc(query)}" placeholder="Название, бренд или состав"><div class="chips"><button class="chip ${foodFilter==='all'?'active':''}" data-filter="all">Все</button><button class="chip ${foodFilter==='dry'?'active':''}" data-filter="dry">Сухой</button><button class="chip ${foodFilter==='wet'?'active':''}" data-filter="wet">Влажный</button><button class="chip ${foodFilter==='fav'?'active':''}" data-filter="fav">♡ Избранное</button></div><p class="muted">В базе ${catalog.length} кормов. Сначала показываем подходящие группы по профилю ${esc(p?.name||'питомца')}.</p>${content||'<div class="empty">Подходящих вариантов не найдено. Измените профиль или фильтр.</div>'}`}
function foodCard(f){const saved=state.favorites.includes(f.id);const image=foodImage(f);const rec=foodRecommendation(f,activePet());return `<article class="food-card"><div class="food-thumb">${image?`<img src="${esc(image)}" alt="">`:'<span class="food-placeholder-icon" aria-hidden="true">▱</span>'}</div><div><span class="badge">${rec?.badge||'Подходит'}</span><h3>${esc(f.brand)}<br>${esc(f.name)}</h3><p>${f.form==='wet'?'Влажный':'Сухой'} · ${f.kcalPer100g||'—'} ккал / 100 г</p><p>${activePet()?'≈ '+dailyGrams(activePet(),f)+' г / день':'Нужен профиль'}</p></div><div class="food-actions"><button class="soft-button" data-food="${f.id}">Подробнее</button><button class="heart" data-fav="${f.id}" aria-label="Избранное">${saved?'♥':'♡'}</button></div></article>`}
function fmtDiaryDay(key){const d=new Date(`${key}T00:00:00`);return d.toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'})}
function shiftDiary(delta){const d=new Date(`${state.diaryDay}T00:00:00`);d.setDate(d.getDate()+delta);const next=d.toISOString().slice(0,10);if(next>todayKey())return;state.diaryDay=next;save();render()}
function treatForm(){openModal(`<h2>Новое лакомство</h2><div class="form"><label>Название<input id="treatName" placeholder="Например, лакомство"></label><label>Вес, г<input id="treatGrams" inputmode="decimal"></label><label>Калорийность, ккал<input id="treatKcal" inputmode="decimal" placeholder="Необязательно"></label><div class="form-actions"><button class="soft-button" onclick="modal.close()">Отмена</button><button class="primary" onclick="saveTreat()">Сохранить</button></div></div>`)}
window.saveTreat=()=>{const p=activePet();const grams=Number(($('treatGrams').value||'').replace(',','.'));if(!grams||grams<=0)return toast('Укажите вес лакомства');state.feedEntries.push({petId:p.id,date:state.diaryDay,kind:'treat',name:$('treatName').value.trim()||'Лакомство',grams,kcal:Number(($('treatKcal').value||'').replace(',','.'))||null});save();$('modal').close();toast('Лакомство добавлено');render()}
function noteForm(){openModal(`<h2>Новое наблюдение</h2><div class="form"><label>Что заметили<textarea id="noteText" rows="4" placeholder="Например, хороший аппетит"></textarea></label><div class="form-actions"><button class="soft-button" onclick="modal.close()">Отмена</button><button class="primary" onclick="saveNote()">Сохранить</button></div></div>`)}
window.saveNote=()=>{const text=$('noteText').value.trim();if(!text)return toast('Напишите наблюдение');state.feedEntries.push({petId:activePet().id,date:state.diaryDay,kind:'note',text});save();$('modal').close();toast('Наблюдение добавлено');render()}
function weightChartSvg(rows,period=weightPeriod){const days={week:7,month:30,quarter:90,year:365,all:null}[period]??7;const today=new Date();today.setHours(0,0,0,0);const cutoff=days?new Date(today.getTime()-(days-1)*86400000):null;const pts=rows.map(x=>({date:String(x.date||''),kg:Number(x.kg)})).filter(x=>x.date&&Number.isFinite(x.kg)&&x.kg>0&&(!cutoff||new Date(`${x.date}T00:00:00`)>=(cutoff))).sort((a,b)=>a.date.localeCompare(b.date));if(!pts.length)return '<div class="chart chart-empty">Нет записей за этот период</div>';const w=360,h=176,l=42,r=12,t=14,b=28,lo=Math.min(...pts.map(x=>x.kg)),hi=Math.max(...pts.map(x=>x.kg)),pad=Math.max(.15,(hi-lo)*.3),min=lo-pad,max=hi+pad,plotW=w-l-r,plotH=h-t-b,x=i=>l+(pts.length===1?plotW/2:i/(pts.length-1)*plotW),y=v=>t+(max-v)/(max-min)*plotH,points=pts.map((p,i)=>`${x(i).toFixed(1)},${y(p.kg).toFixed(1)}`).join(' '),grid=[0,1,2,3,4].map(i=>{const yy=t+i*plotH/4,val=max-(max-min)*i/4;return `<line x1="${l}" y1="${yy}" x2="${w-r}" y2="${yy}"/><text x="2" y="${yy+4}">${val.toFixed(1).replace('.',',')}</text>`}).join(''),labels=pts.length===1?`<text x="${l}" y="${h-7}">${esc(pts[0].date)}</text>`:`<text x="${l}" y="${h-7}">${esc(pts[0].date)}</text><text x="${w-r-48}" y="${h-7}">${esc(pts[pts.length-1].date)}</text>`,dots=pts.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.kg)}" r="3.5"/>`).join('');return `<div class="chart chart-svg"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="График веса">${grid}<polyline points="${points}"/><line class="last-guide" x1="${x(pts.length-1)}" y1="${t}" x2="${x(pts.length-1)}" y2="${h-b}"/>${dots}<text class="last-value" x="${Math.min(w-r-34,Math.max(l,x(pts.length-1)-10))}" y="${Math.max(12,y(pts[pts.length-1].kg)-10)}">${pts[pts.length-1].kg.toFixed(1).replace('.',',')} кг</text>${labels}</svg></div>`}
function viewWeightDiary(p){const rows=state.weights.filter(x=>x.petId===p.id);const latest=rows[rows.length-1];const periods=[['week','Неделя'],['month','Месяц'],['quarter','3 мес.'],['year','Год'],['all','Всё время']];return `<div class="chips">${periods.map(([key,label])=>`<button class="chip ${weightPeriod===key?'active':''}" data-weight-period="${key}">${label}</button>`).join('')}</div><div class="weight-summary"><div><small>Последнее</small><strong>${latest?esc(latest.kg)+' кг':'Нет веса'}</strong></div><span>${latest?esc(latest.date):'ещё не взвешивали'}</span></div>${weightChartSvg(rows)}<div class="section-head"><h2>Измерения</h2><button class="link-button" data-action="add-weight">Добавить</button></div><div class="diary-list">${rows.slice().reverse().map(x=>`<div class="diary-item"><b>${esc(x.kg)} кг</b><small>${esc(x.date)}</small></div>`).join('')||'<div class="empty">Когда появится пара взвешиваний, здесь будет история.</div>'}</div><button class="more-row" data-action="report"><span>Отчёт для ветеринара</span><span>›</span></button>`}
function viewDiary(){const p=activePet();if(!p)return `<div class="empty">Добавьте питомца, чтобы открыть дневник.</div>`;if(diaryTab==='weight')return `${title('ДНЕВНИК',`Вес ${esc(p.name)}`,`Измерения и изменения веса`)}<div class="tabs"><button data-diary="feed">Питание</button><button class="active" data-diary="weight">Вес</button></div>${viewWeightDiary(p)}`;const day=state.diaryDay||todayKey();const entries=state.feedEntries.filter(x=>x.petId===p.id&&x.date===day);const feeds=entries.filter(x=>(x.kind||'feed')==='feed');const given=feeds.reduce((a,x)=>a+Number(x.grams||0),0);const target=dailyGrams();const mealNames=['Утро','День','Вечер'];return `${title('ДНЕВНИК','Питание',`История ${p.name}`)}<div class="tabs"><button class="active" data-diary="feed">Питание</button><button data-diary="weight">Вес</button></div><div class="day-switch"><button class="icon-button" data-day="-1">‹</button><strong>${fmtDiaryDay(day)}</strong><button class="icon-button" data-day="1">›</button></div><section class="card mint-card diary-progress"><small>Выдано сегодня</small><strong>${given} / ${target} г</strong><div class="progress"><i style="width:${target?Math.min(100,given/target*100):0}%"></i></div><small>${feeds.length} из 3 кормлений</small></section><h2 class="diary-heading">История кормлений</h2><div class="diary-list">${mealNames.map((meal,i)=>{const row=feeds.find(x=>x.meal===meal);return `<div class="diary-meal"><small>${row?.time||['08:00','13:00','19:00'][i]}</small><div><b>${row?'✓ ':''}${meal} · ${row?.grams||Math.round(target*[.28,.36,.36][i])} г</b><span>${row?esc(row.foodName||'Корм'):'Ожидается'}</span></div></div>`}).join('')}${entries.filter(x=>(x.kind||'feed')!=='feed').map(x=>`<div class="diary-meal"><small>${x.kind==='treat'?'Лакомство':'Наблюдение'}</small><div><b>${esc(x.name||x.text)}</b><span>${x.grams?esc(x.grams)+' г':''}</span></div></div>`).join('')}</div><div class="diary-actions"><button class="soft-button" data-action="treat">+ Лакомство</button><button class="soft-button" data-action="note">+ Наблюдение</button></div><button class="more-row" data-action="report"><span>Сформировать отчёт</span><span>›</span></button>`}
function viewPets(){const p=activePet();const pets=state.pets.map(x=>`<article class="pet-card ${x.id===state.activePetId?'selected':''}"><div class="pet-avatar"><img src="${petPhoto(x)}" alt=""></div><div><h3>${esc(x.name)}</h3><p>${x.species==='dog'?'Собака':'Кошка'} · ${x.weight||'—'} кг</p></div><button class="icon-button" data-edit-pet="${x.id}">⋯</button></article>`).join('');return `${title('ПРОФИЛИ','Питомцы','У каждого свой рацион и дневник.')}<div class="pet-grid">${pets}</div>${p?`<section class="card pet-details"><div class="row-between"><h2>${esc(p.name)}</h2><button class="soft-button" data-edit-pet="${p.id}">Изменить</button></div><p class="muted">${p.species==='dog'?'Собака':'Кошка'} · ${p.breed?esc(p.breed):'Порода не указана'}</p><div class="pet-detail-grid"><span>Возраст<strong>${p.ageMonths} мес.</strong></span><span>Пол<strong>${p.sex==='male'?'Самец':'Самка'}</strong></span><span>Вес<strong>${p.weight} кг</strong></span><span>Активность<strong>${({low:'Низкая',medium:'Умеренная',high:'Высокая',very_high:'Очень высокая'})[p.activity]||'Умеренная'}</strong></span><span>Стерилизация<strong>${p.sterilized?'Да':'Нет'}</strong></span><span>Здоровье<strong>${(p.diagnoses||['healthy']).map(x=>({healthy:'Здоров',overweight:'Лишний вес',ckd:'Почки',diabetes:'Диабет',allergy:'Аллергия',heart:'Сердце',joints:'Суставы',gi:'ЖКТ',urolithiasis:'МКБ',liver:'Печень'})[x]||x).join(', ')}</strong></span></div></section>`:''}<button class="primary full" style="margin-top:14px" data-action="add-pet">Добавить питомца</button>`}
const guideData=[['Как читать состав корма','Ингредиенты идут по убыванию доли. Смотрите на конкретные источники белка, белок, жир и клетчатку под профиль питомца.'],['Зачем считать норму','Таблица на упаковке усреднена. Приложение учитывает вес, активность, стерилизацию и диагнозы.'],['Стерилизация и обмен','После стерилизации расход энергии обычно ниже, поэтому важны умеренная калорийность и контроль веса.'],['Лишний вес','Снижать вес нужно постепенно. Резко урезать калории кошке опасно для печени.'],['Что такое лечебный корм','Лечебный рацион дают под подтверждённый диагноз и согласуют с ветеринаром.'],['Как переходить на новый корм','Заменяйте старый рацион новым постепенно, примерно за 7–10 дней.'],['Как приложение подбирает корм','Сначала убираются чужой вид, аллерген и корм не под диагноз. Затем учитываются вес, возраст, активность, стерилизация, белок и калории.']];
function ownerForm(){const o=state.owner||{};openModal(`<h2>Профиль владельца</h2><p class="muted">Данные хранятся только на этом устройстве.</p><div class="form"><label>Имя<input id="ownerInputName" value="${esc(o.name||'')}" placeholder="Как к вам обращаться"></label><label>Электронная почта<input id="ownerInputEmail" type="email" value="${esc(o.email||'')}" placeholder="Необязательно"></label><label class="consent-row"><input id="ownerConsent" type="checkbox" ${o.privacyConsent?'checked':''}><span>Я согласен(на) на обработку персональных данных</span></label><a class="policy-link" href="privacy-policy.pdf" target="_blank" rel="noopener">Открыть политику обработки данных</a><p id="ownerFormError" class="form-error" role="alert"></p><div class="form-actions"><button class="soft-button" onclick="modal.close()">Отмена</button><button class="primary" onclick="saveOwner()">Сохранить</button></div></div>`)}
window.saveOwner=()=>{const name=$('ownerInputName').value.trim();const email=$('ownerInputEmail').value.trim();if(email&&(!email.includes('@')||!email.includes('.')))return formError('Проверьте электронную почту.');if(!$('ownerConsent').checked)return formError('Подтвердите согласие на обработку персональных данных.');state.owner={name,email,privacyConsent:true,privacyConsentAt:new Date().toISOString()};save();$('modal').close();toast('Профиль владельца сохранён');render()}
function viewMore(){const owner=state.owner||{};return `${title('ПРОЧЕЕ','Подписка и справки.')}<button class="kv" data-action="owner"><span>Профиль владельца</span><strong>${esc(owner.name||'Настроить')}</strong><span>›</span></button><section class="card mint-card more-pro"><b>NutriPate Pro</b><p>Несколько питомцев и подбор корма без лимита</p><ul><li>Сканер упаковки и свой корм</li><li>График веса и отчёт ветеринару</li><li>Напоминания и расчёт запаса</li></ul><button class="primary" data-action="pro">Подробнее</button></section><section class="more-section"><h2>О корме</h2>${guideData.slice(0,6).map(g=>`<details class="guide-card"><summary>${esc(g[0])}</summary><p>${esc(g[1])}</p></details>`).join('')}</section><section class="more-section"><h2>О приложении</h2><details class="guide-card" open><summary>${esc(guideData[6][0])}</summary><p>${esc(guideData[6][1])}</p></details></section><section class="credits-card"><b>NutriPate</b><span>made in Russia · НИУ ВШЭ</span></section><p class="muted more-disclaimer">NutriPate считает норму и подбирает корм по открытым формулам. Состав на пачке может измениться — сверяйте его перед покупкой.</p>`}
function openModal(html){$('modalContent').innerHTML=html;$('modal').showModal()}
function bind(){document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render()});document.querySelectorAll('[data-tab-go]').forEach(b=>b.onclick=()=>{tab=b.dataset.tabGo;render()});document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{foodFilter=b.dataset.filter;render()});document.querySelectorAll('[data-diary]').forEach(b=>b.onclick=()=>{diaryTab=b.dataset.diary;render()});document.querySelectorAll('[data-weight-period]').forEach(b=>b.onclick=()=>{weightPeriod=b.dataset.weightPeriod;render()});const s=$('foodSearch');if(s)s.oninput=e=>{query=e.target.value;render()};document.querySelectorAll('[data-food]').forEach(b=>b.onclick=()=>foodDetails(b.dataset.food));document.querySelectorAll('[data-fav]').forEach(b=>b.onclick=()=>{const id=b.dataset.fav;state.favorites=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id];save();render()});document.querySelectorAll('[data-edit-pet]').forEach(b=>b.onclick=()=>petForm(state.pets.find(p=>p.id===b.dataset.editPet)));document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>actions(b.dataset.action));document.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>shiftDiary(Number(b.dataset.day)))}
function actions(a){if(a==='start-onboarding'){startOnboarding()}if(a==='owner'){ownerForm()}if(a==='treat'){treatForm()}if(a==='note'){noteForm()}if(a==='feed'){const f=chosenFood(),logged=loggedToday();if(!f){toast('Сначала выберите корм');tab='foods';render();return}if(logged.length>=3){toast('Все три кормления уже записаны');return}const r=mealRows()[logged.length];state.feedEntries.push({id:'feed-'+Date.now(),batch:'batch-'+Date.now(),petId:activePet().id,date:todayKey(),kind:'feed',meal:r.name,grams:r.grams,foodName:`${f.brand} · ${f.name}`});save();toast('Порция отмечена');render()}if(a==='add-weight')weightForm();if(a==='add-pet')petForm();if(a==='weight'){diaryTab='weight';tab='diary';render()}if(a==='stock')toast('Запас считается по текущему расходу');if(a==='calc')toast('Расчёт: вес питомца, активность и калорийность корма');if(a==='backup'){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='nutripate-backup.json';a.click()}if(a==='privacy')window.open('privacy-policy.pdf','_blank');if(a==='about'||a==='pro')toast('Раздел будет расширяться в следующей версии')}
function foodDetails(id){const f=foodById(id);if(!f)return;openModal(`<h2>${esc(f.name)}</h2><p class="muted">${esc(f.brand)} · ${f.form==='wet'?'Влажный':'Сухой'} корм</p><p>${esc(f.composition||'Состав пока не внесён.')}</p><p><b>${f.proteinPer100g||'—'}%</b> белка · <b>${f.fatPer100g||'—'}%</b> жира · <b>${f.kcalPer100g||'—'}</b> ккал / 100 г</p><div class="form-actions"><button class="soft-button" onclick="modal.close()">Закрыть</button><button class="primary" onclick="selectFood('${f.id}')">В рацион</button></div>`)}
window.selectFood=id=>{const p=activePet();state.selectedFoods[p.id]=id;save();$('modal').close();tab='today';toast('Корм добавлен в рацион');render()}
function weightForm(){openModal(`<h2>Новое измерение</h2><div class="form"><label>Вес, кг<input id="weightInput" inputmode="decimal" value="${activePet()?.weight||''}"></label><div class="form-actions"><button class="soft-button" onclick="modal.close()">Отмена</button><button class="primary" onclick="saveWeight()">Сохранить</button></div></div>`)}
window.saveWeight=()=>{const kg=parseFloat($('weightInput').value.replace(',','.'));if(!kg||kg<.1){toast('Введите вес');return}const p=activePet();p.weight=kg;state.weights.push({petId:p.id,kg,date:todayKey()});save();$('modal').close();toast('Вес сохранён');render()}
function petDefaults(p){return Object.assign({id:'',name:'',species:'cat',breedId:'',breed:'',sex:'female',ageMonths:24,birthDate:'',weight:4.2,targetWeight:null,sterilized:true,activity:'medium',diagnoses:['healthy'],allergens:[]},p||{})}
const diagOptions=[['healthy','Здоров'],['overweight','Лишний вес'],['ckd','Почки'],['diabetes','Диабет'],['allergy','Аллергия'],['heart','Сердце'],['joints','Суставы'],['gi','ЖКТ'],['urolithiasis','МКБ'],['liver','Печень']];
const allergenOptions=[['chicken','Курица'],['beef','Говядина'],['fish','Рыба'],['lamb','Баранина'],['turkey','Индейка'],['duck','Утка'],['dairy','Молочное'],['egg','Яйцо'],['grain','Злаки / глютен'],['soy','Соя']];
const activityOptions=[['low','Низкая'],['medium','Умеренная'],['high','Высокая'],['very_high','Очень высокая']];
const breedOptionsRequired={cat:[['Abyssinian','Абиссинская'],['American Shorthair','Американская короткошёрстная'],['American Curl','Американский кёрл'],['Bengal','Бенгальская'],['Bombay','Бомбейская'],['British Shorthair','Британская короткошёрстная'],['Burmese','Бурманская'],['Devon Rex','Девон-рекс'],['Don Sphynx','Донской сфинкс'],['European Shorthair','Европейская короткошёрстная'],['Sphynx','Канадский сфинкс'],['Cornish Rex','Корниш-рекс'],['Kurilian Bobtail','Курильский бобтейл'],['Munchkin','Манчкин'],['Maine Coon','Мейн-кун'],['Norwegian Forest Cat','Норвежская лесная'],['Oriental Shorthair','Ориентальная короткошёрстная'],['Ocicat','Оцикет'],['Persian','Персидская'],['Peterbald','Петерболд'],['Russian Blue','Русская голубая'],['Ragdoll','Рэгдолл'],['Savannah','Саванна'],['Birman','Священная бирманская'],['Selkirk Rex','Селкирк-рекс'],['Siamese','Сиамская'],['Siberian','Сибирская'],['Snowshoe','Сноу-шу'],['Thai','Тайская'],['Turkish Angora','Турецкая ангора'],['Turkish Van','Турецкий ван'],['Chartreux','Шартрез'],['Scottish Fold','Шотландская вислоухая'],['Scottish Straight','Шотландская прямоухая'],['Japanese Bobtail','Японский бобтейл']],dog:[['Alaskan Malamute','Аляскинский маламут'],['American Bully','Американский булли'],['English Bulldog','Английский бульдог'],['English Cocker Spaniel','Английский кокер-спаниель'],['Bernese Mountain Dog','Бернский зенненхунд'],['Beagle','Бигль'],['Boxer','Боксёр'],['Border Collie','Бордер-колли'],['Pembroke Welsh Corgi','Вельш-корги пемброк'],['Jack Russell Terrier','Джек-рассел-терьер'],['Dobermann','Доберман'],['Golden Retriever','Золотистый ретривер'],['Yorkshire Terrier','Йоркширский терьер'],['Cavalier King Charles Spaniel','Кавалер-кинг-чарльз-спаниель'],['Caucasian Shepherd Dog','Кавказская овчарка'],['Cane Corso','Кане-корсо'],['Labrador Retriever','Лабрадор-ретривер'],['Maltese','Мальтийская болонка'],['Pug','Мопс'],['German Shepherd Dog','Немецкая овчарка'],['Pekingese','Пекинес'],['Pomeranian','Померанский шпиц'],['Poodle','Пудель'],['Rottweiler','Ротвейлер'],['Russian Toy','Русский той'],['Samoyed','Самоедская собака'],['Siberian Husky','Сибирский хаски'],['Central Asian Shepherd Dog','Среднеазиатская овчарка'],['Staffordshire Bull Terrier','Стаффордширский бультерьер'],['Bull Terrier','Бультерьер'],['Dachshund','Такса'],['French Bulldog','Французский бульдог'],['Miniature Schnauzer','Цвергшнауцер'],['Chihuahua','Чихуахуа'],['Shar Pei','Шарпей'],['Shih Tzu','Ши-тцу']]};
function breedChoices(species,current){const list=breedOptionsRequired[species]||breedOptionsRequired.cat;const values=list.map(x=>x[0]);const custom=current&&!values.includes(current)?`<option value="${esc(current)}" selected>${esc(current)}</option>`:'';return `<option value="">Выберите породу</option>${custom}${list.map(([value,label])=>`<option value="${value}" ${current===value?'selected':''}>${label}</option>`).join('')}`}
function petForm(raw){const p=petDefaults(raw);const diag=p.diagnoses||['healthy'];const allergens=p.allergens||[];const chips=(items,selected,name)=>items.map(([value,label])=>`<label class="choice-chip"><input type="checkbox" name="${name}" value="${value}" ${selected.includes(value)?'checked':''}><span>${label}</span></label>`).join('');openModal(`<h2>${p.id?'Питомец':'Новый питомец'}</h2><div class="form pet-form"><div class="form-section"><b>Основные данные</b><label>Имя<input id="petInputName" value="${esc(p.name)}" placeholder="Например, Луна"></label><label>Вид<select id="petInputSpecies"><option value="cat" ${p.species==='cat'?'selected':''}>Кошка</option><option value="dog" ${p.species==='dog'?'selected':''}>Собака</option></select></label><label>Порода<input id="petInputBreed" value="${esc(p.breed||'')}" placeholder="Можно оставить пустым"></label><div class="form-grid"><label>Возраст, месяцев<input id="petInputAge" inputmode="numeric" value="${p.ageMonths??''}"></label><label>Пол<select id="petInputSex"><option value="female" ${p.sex!=='male'?'selected':''}>Самка</option><option value="male" ${p.sex==='male'?'selected':''}>Самец</option></select></label><label>Вес, кг<input id="petInputWeight" inputmode="decimal" value="${p.weight??''}"></label><label>Целевой вес, кг<input id="petInputTarget" inputmode="decimal" value="${p.targetWeight??''}" placeholder="Необязательно"></label></div></div><div class="form-section"><b>Активность</b><div class="choice-grid">${chips(activityOptions,[p.activity],'activity')}</div></div><div class="form-section"><b>Стерилизация</b><div class="choice-grid">${chips([['no','Нет'],['yes','Да']], [p.sterilized?'yes':'no'],'sterilized')}</div></div><div class="form-section"><b>Здоровье и аллергии</b><div class="choice-grid">${chips(diagOptions,diag,'diagnosis')}</div><p class="form-hint">Отметьте диагнозы и аллергены — они исключат несовместимые корма из рекомендаций.</p><div class="choice-grid">${chips(allergenOptions,allergens,'allergen')}</div></div><p id="petFormError" class="form-error" role="alert"></p><div class="form-actions"><button class="soft-button" onclick="modal.close()">Отмена</button><button class="primary" onclick="savePet('${p.id}')">Сохранить</button></div></div>`)}
function readNumber(id){const raw=($(id)?.value||'').trim().replace(',','.');return raw===''?null:Number(raw)}
function formError(message){const el=$('petFormError');if(el){el.textContent=message;el.classList.add('show')}else toast(message)}
window.savePet=id=>{const name=$('petInputName').value.trim();const species=$('petInputSpecies').value;const age=readNumber('petInputAge');const weight=readNumber('petInputWeight');const target=readNumber('petInputTarget');const sex=$('petInputSex').value;const breed=$('petInputBreed').value.trim();const activity=document.querySelector('input[name="activity"]:checked')?.value||'medium';const sterilized=document.querySelector('input[name="sterilized"]:checked')?.value==='yes';const diagnoses=[...document.querySelectorAll('input[name="diagnosis"]:checked')].map(x=>x.value);const allergens=[...document.querySelectorAll('input[name="allergen"]:checked')].map(x=>x.value);if(diagnoses.length>1&&diagnoses.includes('healthy'))diagnoses.splice(diagnoses.indexOf('healthy'),1);if(!diagnoses.length)diagnoses.push('healthy');if(!name)return formError('Укажите имя питомца.');if(!Number.isFinite(weight)||weight<=0||weight>120)return formError('Вес должен быть от 0,1 до 120 кг.');if(!Number.isFinite(age)||age<0||age>360)return formError('Возраст должен быть от 0 до 360 месяцев.');if(target!==null&&(!Number.isFinite(target)||target<=0||target>120))return formError('Проверьте целевой вес.');if(target!==null&&Math.abs(target-weight)>80)return formError('Целевой вес слишком сильно отличается от текущего.');if(!diagnoses.length)return formError('Выберите состояние здоровья.');if(!diagnoses.includes('allergy')&&allergens.length)return formError('Чтобы указать аллерген, отметьте диагноз «Аллергия».');const normalized={name,species,breedId:breed?`custom-${breed.toLowerCase().replace(/[^a-zа-я0-9]+/gi,'-')}`:'',breed,sex,ageMonths:Math.round(age),weight,targetWeight:target,sterilized,activity,diagnoses,allergens};let p=id?state.pets.find(x=>x.id===id):null;if(p)Object.assign(p,normalized);else{p=Object.assign({id:'pet-'+Date.now()},normalized);state.pets.push(p);state.activePetId=p.id}save();$('modal').close();toast('Профиль сохранён');render()}
function petMenu(){openModal(`<h2>Выбрать питомца</h2><div class="pet-grid">${state.pets.map(p=>`<button class="more-row" onclick="choosePet('${p.id}')"><span><img class="pet-inline-photo" src="${petPhoto(p)}" alt=""> ${esc(p.name)}</span><span>${p.id===state.activePetId?'✓':'›'}</span></button>`).join('')}</div><button class="primary full" style="margin-top:12px" onclick="modal.close()">Закрыть</button>`)}
window.choosePet=id=>{state.activePetId=id;save();$('modal').close();render()};$('petSwitcher').onclick=petMenu;document.addEventListener('DOMContentLoaded',()=>{catalog=fallbackFoods;render();fetch('data/nutripate-catalog.json?v=composition-2').then(r=>r.json()).then(data=>{if(Array.isArray(data.foods)&&data.foods.length){catalog=data.foods;render()}}).catch(()=>{})});












const breedOptions=breedOptionsRequired;
function breedChoices(species,current){const list=breedOptions[species]||breedOptions.cat;const values=list.map(x=>x[0]);const custom=current&&!values.includes(current)?`<option value="${esc(current)}" selected>${esc(current)}</option>`:'';return `<option value="">Выберите породу</option>${custom}${list.map(([value,label])=>`<option value="${value}" ${current===value?'selected':''}>${label}</option>`).join('')}`}
function petForm(raw){const p=petDefaults(raw);const diag=p.diagnoses||['healthy'];const allergens=p.allergens||[];const chips=(items,selected,name,type='checkbox')=>items.map(([value,label])=>`<label class="choice-chip"><input type="${type}" name="${name}" value="${value}" ${selected.includes(value)?'checked':''}><span>${label}</span></label>`).join('');openModal(`<h2>${p.id?'Питомец':'Новый питомец'}</h2><div class="form pet-form"><div class="form-section"><b>Основные данные</b><label>Имя<input id="petInputName" value="${esc(p.name)}" placeholder="Например, Луна"></label><label>Вид<select id="petInputSpecies"><option value="cat" ${p.species==='cat'?'selected':''}>Кошка</option><option value="dog" ${p.species==='dog'?'selected':''}>Собака</option></select></label><label>Порода<select id="petInputBreed" required>${breedChoices(p.species,p.breed||p.breedId)}</select></label><div class="form-grid"><label>Возраст, месяцев<input id="petInputAge" inputmode="numeric" value="${p.ageMonths??''}"></label><label>Пол<select id="petInputSex"><option value="female" ${p.sex!=='male'?'selected':''}>Самка</option><option value="male" ${p.sex==='male'?'selected':''}>Самец</option></select></label><label>Вес, кг<input id="petInputWeight" inputmode="decimal" value="${p.weight??''}"></label><label>Целевой вес, кг<input id="petInputTarget" inputmode="decimal" value="${p.targetWeight??''}" placeholder="Необязательно"></label></div></div><div class="form-section"><b>Активность</b><div class="choice-grid">${chips(activityOptions,[p.activity],'activity','radio')}</div></div><div class="form-section"><b>Стерилизация</b><div class="choice-grid">${chips([['no','Нет'],['yes','Да']], [p.sterilized?'yes':'no'],'sterilized','radio')}</div></div><div class="form-section"><b>Здоровье и аллергии</b><div class="choice-grid">${chips(diagOptions,diag,'diagnosis')}</div><p class="form-hint">Отметьте диагнозы и аллергены — они исключат несовместимые корма из рекомендаций.</p><div class="choice-grid">${chips(allergenOptions,allergens,'allergen')}</div></div><p id="petFormError" class="form-error" role="alert"></p><div class="form-actions"><button class="soft-button" onclick="modal.close()">Отмена</button><button class="primary" onclick="savePet('${p.id}')">Сохранить</button></div></div>`)}
const savePetOriginal=savePet;window.savePet=id=>{if(!$('petInputBreed')?.value)return formError('Выберите породу питомца.');return savePetOriginal(id)};
const petFormWithConditionalAllergens=petForm;petForm=function(raw){petFormWithConditionalAllergens(raw);const section=[...document.querySelectorAll('.form-section')].find(x=>x.textContent.includes('Здоровье и аллергии'));if(!section)return;const diagnosisInputs=[...section.querySelectorAll('input[name="diagnosis"]')];const allergyInput=diagnosisInputs.find(x=>x.value==='allergy');const grids=section.querySelectorAll('.choice-grid');const allergenGrid=grids[1];const hint=section.querySelector('.form-hint');const sync=()=>{const visible=Boolean(allergyInput?.checked);if(allergenGrid)allergenGrid.style.display=visible?'flex':'none';if(hint)hint.style.display=visible?'block':'none'};diagnosisInputs.forEach(input=>input.addEventListener('change',sync));sync()};
let breedCatalogData={};let breedInfoData={};let breedDraft=null;let breedCatalogPromise=null;
function loadBreedCatalog(){
  if(breedCatalogPromise)return breedCatalogPromise;
  breedCatalogPromise=fetch('data/breed-catalog.json?v=breed-guide1').then(r=>r.json()).then(d=>{
    breedCatalogData=d||{};
    breedOptionsRequired.cat=(d.cats||[]).map(x=>[x.name,x.name]);
    breedOptionsRequired.dog=(d.dogs||[]).map(x=>[x.name,x.name]);
    if(!document.getElementById('modal')?.open)render();
    return breedCatalogData;
  }).catch(()=>({}));
  fetch('data/breed-info.json?v=breed-guide1').then(r=>r.json()).then(d=>{breedInfoData=d||{} }).catch(()=>{});
  return breedCatalogPromise;
}
setTimeout(loadBreedCatalog,1200);
const breedAssetByName={'Абиссинская':'cat-14','Американская короткошёрстная':'cat-28','Американский кёрл':'cat-31','Бенгальская':'cat-13','Бомбейская':'cat-33','Британская':'cat-01','Британская короткошёрстная':'cat-01','Бурманская':'cat-21','Девон-рекс':'cat-20','Донской сфинкс':'cat-07','Европейская короткошёрстная':'cat-27','Канадский сфинкс':'cat-06','Корниш-рекс':'cat-19','Курильский бобтейл':'cat-18','Манчкин':'cat-23','Мейн-кун':'cat-04','Норвежская лесная':'cat-17','Ориентальная короткошёрстная':'cat-12','Оцикет':'cat-29','Персидская':'cat-09','Петерболд':'cat-08','Русская голубая':'cat-15','Рэгдолл':'cat-16','Саванна':'cat-24','Священная бирманская':'cat-22','Селкирк-рекс':'cat-30','Сиамская':'cat-10','Сибирская':'cat-05','Сноу-шу':'cat-35','Тайская':'cat-11','Турецкая ангора':'cat-25','Турецкий ван':'cat-26','Шартрез':'cat-32','Шотландская вислоухая':'cat-02','Шотландская прямоухая':'cat-03','Японский бобтейл':'cat-34'};
Object.assign(breedAssetByName,{'Аляскинский маламут':'assets/breeds/аляскинский маламут.png','Американский булли':'assets/breeds/американский булли.png','Английский бульдог':'assets/breeds/английский бульдог.png','Английский кокер-спаниель':'assets/breeds/английский кокер спаниель.png','Бернский зенненхунд':'assets/breeds/бернский зенненхунд.png','Бигль':'assets/breeds/бигль.png','Боксёр':'assets/breeds/боксер.png','Бордер-колли':'assets/breeds/бордер колли.png','Вельш-корги пемброк':'assets/breeds/вельш-корги пемброк.png','Джек-рассел-терьер':'assets/breeds/джек рассел терьер.png','Доберман':'assets/breeds/доберман.png','Золотистый ретривер':'assets/breeds/золотистый ретривер.png','Йоркширский терьер':'assets/breeds/йоркширский терьер.png','Кавалер-кинг-чарльз-спаниель':'assets/breeds/кавалер кинг чарльз спаниель.png','Кавказская овчарка':'assets/breeds/кавказская овчарка.png','Кане-корсо':'assets/breeds/кане корсо.png','Лабрадор-ретривер':'assets/breeds/лабрадор ретривер.png','Мальтийская болонка':'assets/breeds/мальтийская болонка.png','Мопс':'assets/breeds/мопс.png','Немецкая овчарка':'assets/breeds/немецкая овчарка.png','Пекинес':'assets/breeds/пекинес.png','Померанский шпиц':'assets/breeds/померанский шпиц.png','Пудель':'assets/breeds/пудель.png','Ротвейлер':'assets/breeds/ротвейлер.png','Русский той':'assets/breeds/русский той.png','Самоедская собака':'assets/breeds/самоедская.png','Сиба-ину':'assets/breeds/сиба-ину.png','Сибирский хаски':'assets/breeds/сибирский хаски.png','Среднеазиатская овчарка':'assets/breeds/среднеазиатская овчарка.png','Стаффордширский бультерьер':'assets/breeds/стаффордширский терьер.png','Такса':'assets/breeds/такса.png','Французский бульдог':'assets/breeds/французский бульдог.png','Чау-чау':'assets/breeds/чау-чау.png','Цвергшнауцер':'assets/breeds/швергшнауцер.png','Чихуахуа':'assets/breeds/чихуахуа.png','Шарпей':'assets/breeds/шарпей.png','Ши-тцу':'assets/breeds/ши тцу.png','Эрдельтерьер':'assets/breeds/эрдельтерьер.png'});
Object.assign(breedAssetByName,{'Бультерьер':'assets/breeds/dog-21.png'});
function breedEntries(species){return (breedOptionsRequired[species]||[]).map(([value,name],i)=>{const source=(breedCatalogData[species==='cat'?'cats':'dogs']||[]).find(x=>x.name===name);const fallback=`${species==='cat'?'cat':'dog'}-${String(i+1).padStart(2,'0')}`;const direct=species==='dog'?breedPhotoId({species:'dog',breedLabel:name}):'';const id=direct||breedAssetByName[name]||source?.id||fallback;return {value,name,id,image:breedAssetPath(id)}})}
function breedData(entry){const list=entry.id.startsWith('cat-')?(breedCatalogData.cats||[]):(breedCatalogData.dogs||[]);return list.find(x=>x.id===entry.id)||list.find(x=>x.name===entry.name)||{}}
function captureBreedDraft(){const p=petDefaults({id:petFormDraftId});p.name=$('petInputName')?.value||'';p.species=$('petInputSpecies')?.value||'cat';p.breed=$('petInputBreed')?.value||'';p.ageMonths=readNumber('petInputAge');p.sex=$('petInputSex')?.value||'female';p.weight=readNumber('petInputWeight');p.targetWeight=readNumber('petInputTarget');p.activity=document.querySelector('input[name="activity"]:checked')?.value||'medium';p.sterilized=document.querySelector('input[name="sterilized"]:checked')?.value==='yes';p.diagnoses=[...document.querySelectorAll('input[name="diagnosis"]:checked')].map(x=>x.value);p.allergens=[...document.querySelectorAll('input[name="allergen"]:checked')].map(x=>x.value);p.photo=petPhotoDraft||'';return p}
function openBreedPicker(){loadBreedCatalog();breedDraft=captureBreedDraft();const entries=breedEntries(breedDraft.species);openModal(`<div class="breed-guide-head"><button class="back-button" onclick="petForm(breedDraft)">‹</button><div><h2>Порода питомца</h2><p class="muted">${breedDraft.species==='cat'?'Кошки':'Собаки'} · справочник</p></div></div><input class="search breed-search" id="breedSearch" placeholder="Поиск породы"><div class="breed-guide-list">${entries.map((e,i)=>{const d=breedData(e);return `<button class="breed-guide-card" onclick="openBreedDetail('${breedDraft.species}',${i})"><img src="assets/paw-reference.png" data-breed-src="${e.image}" alt="" loading="lazy" decoding="async"><span><b>${e.name}</b><small>${d.coatText||'Короткая или длинная шерсть'}</small></span><strong>›</strong></button>`}).join('')}</div>`);const loadVisibleBreedImages=()=>{const imgs=[...document.querySelectorAll('.breed-guide-card img[data-breed-src]')];const load=img=>{if(img.dataset.loaded)return;img.src=img.dataset.breedSrc;img.dataset.loaded='1'};if('IntersectionObserver' in window){const observer=new IntersectionObserver(items=>items.forEach(item=>{if(item.isIntersecting){load(item.target);observer.unobserve(item.target)}}),{root:document.querySelector('#modal'),rootMargin:'240px'});imgs.forEach(img=>observer.observe(img))}else{imgs.slice(0,8).forEach(load)}};requestAnimationFrame(loadVisibleBreedImages);const s=$('breedSearch');if(s)s.oninput=()=>{const q=s.value.toLowerCase();document.querySelectorAll('.breed-guide-card').forEach(card=>card.style.display=card.textContent.toLowerCase().includes(q)?'grid':'none')}}
function openBreedDetail(species,index){const entry=breedEntries(species)[index];const d=breedData(entry);openModal(`<div class="breed-detail-head"><button class="back-button" onclick="openBreedPicker()">‹</button><span>NutriPate</span></div><h2>${entry.name}</h2><div class="breed-detail-image"><img src="${entry.image}" alt="${entry.name}"></div><section class="breed-facts"><h3>Основные характеристики</h3><div><span>Вес взрослых</span><b>${d.weightText||'Зависит от пола и телосложения'}</b></div><div><span>Шерсть и уход</span><b>${d.coatText||'Короткая или длинная'}</b></div><div><span>Ориентир питания</span><b>${d.kcalRefText||'Уточняется по профилю питомца'}</b></div></section><section class="breed-note"><h3>Что важно знать для питомца</h3><p>${d.diseasesText||d.distinctive||'Учитывайте возраст, вес и состояние здоровья питомца.'}</p><p>${d.funFact||'Порода не заменяет индивидуальные особенности питомца.'}</p></section><button class="primary full" onclick="chooseBreed('${entry.value}')">Выбрать породу</button>`)}
function chooseBreed(value){const entry=breedEntries(breedDraft.species).find(x=>x.value===value||x.id===value||x.name===value);if(!entry)return;breedDraft=Object.assign({},breedDraft,{breedId:entry.id,breed:entry.name,breedLabel:entry.name});petForm(breedDraft)}
const petFormWithBreedGuide=petForm;petForm=function(raw){petFormWithBreedGuide(raw);const select=$('petInputBreed');if(!select)return;const label=select.options[select.selectedIndex]?.text||'Выберите породу';select.style.display='none';select.insertAdjacentHTML('beforebegin',`<button type="button" class="breed-picker-button" onclick="openBreedPicker()"><span>${label}</span><strong>›</strong></button>`)};
const petFormWithSingleChoice=petForm;petForm=function(raw){petFormWithSingleChoice(raw);document.querySelectorAll('input[name="activity"],input[name="sterilized"]').forEach(input=>{input.type='radio'});};
const savePetWithBreedRequired=window.savePet;window.savePet=function(id){const breed=document.querySelector('#petInputBreed')?.value.trim();if(!breed){return formError('Выберите породу питомца.')}return savePetWithBreedRequired(id)};
const savePetWithBreedLabel=window.savePet;window.savePet=function(id){const select=document.querySelector('#petInputBreed');const label=select?.selectedOptions?.[0]?.textContent?.trim()||'';savePetWithBreedLabel(id);const saved=id?state.pets.find(x=>x.id===id):state.pets[state.pets.length-1];if(saved&&label){saved.breedLabel=label;save();render()}};
const petFormWithCatalogBreedLabel=petForm;petForm=function(raw){petFormWithCatalogBreedLabel(raw);const select=document.querySelector('#petInputBreed');const desired=raw?.breedLabel||'';const option=desired&&[...(select?.options||[])].find(x=>x.textContent.trim()===desired);if(option){select.value=option.value;const button=document.querySelector('.breed-picker-button span');if(button)button.textContent=desired}};
const petFormWithHealthyExclusive=petForm;petForm=function(raw){petFormWithHealthyExclusive(raw);const section=[...document.querySelectorAll('.form-section')].find(x=>x.textContent.includes('Здоровье и аллергии'));if(!section)return;const inputs=[...section.querySelectorAll('input[name="diagnosis"]')];const healthy=inputs.find(x=>x.value==='healthy');inputs.forEach(input=>input.addEventListener('change',()=>{if(input===healthy&&input.checked)inputs.filter(x=>x!==healthy).forEach(x=>x.checked=false);if(input!==healthy&&input.checked&&healthy)healthy.checked=false;}))};
const viewNoPetScreen=()=>`<section class="welcome-screen"><div class="welcome-brand">Nutri<span>Pate</span></div><h1>Добро пожаловать!</h1><img class="welcome-art" src="assets/welcome_pets.png" alt="Питомцы рядом"><h2>Здесь будет день<br>вашего питомца</h2><p class="welcome-lead">Всего один профиль — и важное всегда под рукой: корм, порция и время кормления.</p><button class="primary" data-action="start-onboarding">Добавить первого питомца</button><div class="web-auth-form welcome-login-form"><label>Почта<input id="webAuthEmail" type="email" autocomplete="email" placeholder="you@example.com"></label><label>Одноразовый код<input id="webAuthCode" class="web-auth-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000"></label><button class="soft-button full" type="button" data-web-auth="login">Получить код</button><button class="primary full" type="button" data-web-auth="enter">Войти</button><p class="web-auth-note" id="webAuthNote">Код приходит письмом от NutriPate.</p></div><div class="welcome-example"><b>Что понадобится</b><p>Возраст, вес, активность и особенности здоровья.</p></div></section>`;
const viewFirstLaunch=()=>viewNoPetScreen();
const renderWithoutPet=render;render=function(){const shell=document.querySelector('.app-shell');if(!activePet()){const nav=document.querySelector('.bottom-nav');const switcher=$('petSwitcher');shell?.classList.add('no-pet');if(nav){nav.hidden=false;nav.style.setProperty('display','grid','important');nav.style.setProperty('visibility','visible','important')}switcher.style.display='none';if(tab&&tab!=='today'){renderWithoutPet();return}const focused=document.activeElement;if(focused&&(focused.id==='webAuthEmail'||focused.id==='webAuthCode'))return;const keepEmail=document.getElementById('webAuthEmail')?.value||'';const keepCode=document.getElementById('webAuthCode')?.value||'';$('appMain').innerHTML=state.onboardingDone?viewNoPetScreen():viewFirstLaunch();const emailBox=document.getElementById('webAuthEmail');const codeBox=document.getElementById('webAuthCode');if(emailBox&&keepEmail)emailBox.value=keepEmail;if(codeBox&&keepCode)codeBox.value=keepCode;bind();return}shell?.classList.remove('no-pet');renderWithoutPet()};
const startOnboardingOriginal=startOnboarding;startOnboarding=function(){state.onboardingDone=true;save();petForm()};
state.reminders=Object.assign({enabled:false,morning:'08:00',day:'13:00',evening:'19:00',weighEnabled:false,weigh:'09:00'},state.reminders||{});
function reportModal(){const p=activePet();if(!p)return;const weights=state.weights.filter(x=>x.petId===p.id);const entries=state.feedEntries.filter(x=>x.petId===p.id);openModal(`<h2>Отчёт для ветеринара</h2><div class="card"><b>История ${esc(p.name||'питомца')}</b><p class="muted">Вес, кормления и наблюдения собраны вместе.</p><p>Порода: ${esc(p.breedLabel||p.breed||'не указана')}<br>Вес: ${esc(p.weight)} кг<br>Измерений веса: ${weights.length}<br>Записей дневника: ${entries.length}</p></div><div class="form-actions"><button class="soft-button" onclick="modal.close()">Назад</button><button class="primary" onclick="downloadReport()">Скачать отчёт</button></div>`)}
window.downloadReport=()=>{const p=activePet();const payload={app:'NutriPate',pet:p,weights:state.weights.filter(x=>x.petId===p?.id),diary:state.feedEntries.filter(x=>x.petId===p?.id),createdAt:new Date().toISOString()};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));a.download=`nutripate-report-${(p?.name||'pet').replace(/\s+/g,'-')}.json`;a.click();toast('Отчёт сохранён')};
function backupModal(){const last=state.lastBackup?new Date(state.lastBackup).toLocaleString('ru-RU',{dateStyle:'medium',timeStyle:'short'}):'Ещё не создана';openModal(`<h2>Резервная копия</h2><div class="card mint-card"><b>Забота не теряется</b><p class="muted">Профили питомцев, рацион, дневник, вес, кормления, заметки и настройки сохраняются в JSON-файле.</p></div><div class="kv"><span>Последняя копия</span><strong>${esc(last)}</strong></div><div class="form-actions"><button class="primary" onclick="downloadBackup()">Создать резервную копию</button><button class="soft-button" onclick="document.querySelector('#backupFile').click()">Восстановить данные</button></div><input id="backupFile" type="file" accept="application/json" hidden onchange="restoreBackup(this.files[0])"><p class="form-hint">Восстановление требует подтверждения и не заменяет текущие записи автоматически.</p>`)}
window.downloadBackup=()=>{state.lastBackup=new Date().toISOString();save();const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));a.download='nutripate-backup.json';a.click();toast('Резервная копия создана');backupModal()};
window.restoreBackup=file=>{if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);if(!Array.isArray(data.pets))throw new Error();if(!confirm('Заменить текущие данные копией?'))return;state=Object.assign(state,data);save();modal.close();render();toast('Данные восстановлены')}catch{toast('Не удалось прочитать копию')}};reader.readAsText(file)};
function remindersForm(){const r=state.reminders;openModal(`<h2>Напоминания</h2><div class="mint-card card"><b>Расписание ${esc(activePet()?.name||'питомца')}</b><p class="muted">Настройте время кормлений и контроля веса.</p></div><div class="form"><label><input id="remEnabled" type="checkbox" ${r.enabled?'checked':''}> Напоминания о кормлении</label><label>Утро<input id="remMorning" value="${esc(r.morning)}"></label><label>День<input id="remDay" value="${esc(r.day)}"></label><label>Вечер<input id="remEvening" value="${esc(r.evening)}"></label><label><input id="remWeighEnabled" type="checkbox" ${r.weighEnabled?'checked':''}> Контроль веса</label><label>Взвешивание<input id="remWeigh" value="${esc(r.weigh)}"></label><div class="form-actions"><button class="soft-button" onclick="modal.close()">Отмена</button><button class="primary" onclick="saveReminders()">Сохранить</button></div></div>`)}
const validClock=value=>{const m=String(value||'').trim().match(/^(\d{1,2}):(\d{2})$/);return Boolean(m&&Number(m[1])>=0&&Number(m[1])<=23&&Number(m[2])>=0&&Number(m[2])<=59)};
window.saveReminders=()=>{const values={morning:$('remMorning').value.trim(),day:$('remDay').value.trim(),evening:$('remEvening').value.trim(),weigh:$('remWeigh').value.trim()};if(Object.values(values).some(x=>!validClock(x)))return toast('Введите время в формате ЧЧ:ММ');state.reminders={enabled:$('remEnabled').checked,morning:values.morning,day:values.day,evening:values.evening,weighEnabled:$('remWeighEnabled').checked,weigh:values.weigh};save();modal.close();toast('Напоминания сохранены');render()};
const actionsWithExtras=actions;actions=function(a){if(a==='report')return reportModal();if(a==='backup')return backupModal();if(a==='reminders')return remindersForm();return actionsWithExtras(a)};
const viewMoreWithExtras=viewMore;viewMore=function(){return viewMoreWithExtras()+`<section class="more-section"><h2>Настройки</h2><button class="more-row" data-action="backup"><span>Резервная копия</span><span>›</span></button><button class="more-row" data-action="reminders"><span>Напоминания</span><span>${state.reminders.enabled?'Включены':'Выключены'} ›</span></button><button class="more-row" data-action="privacy"><span>Политика обработки данных</span><span>›</span></button></section>`};
const viewPetsWithReminders=viewPets;viewPets=function(){return viewPetsWithReminders()+`<button class="more-row" style="margin-top:10px" data-action="reminders"><span>Напоминания</span><span>›</span></button>`};
function compareModal(){const ids=state.favorites||[];const foods=ids.map(foodById).filter(Boolean).slice(0,3);if(foods.length<2)return toast('Добавьте в избранное хотя бы два корма');openModal(`<h2>Сравнить избранные корма</h2><div class="food-list">${foods.map(f=>`<div class="food-card"><div class="food-thumb">${foodImage(f)?`<img src="${esc(foodImage(f))}" alt="">`:'<span class="food-placeholder-icon" aria-hidden="true">▱</span>'}</div><div><h3>${esc(f.brand)}<br>${esc(f.name)}</h3><p>${f.form==='wet'?'Влажный':'Сухой'} · ${f.kcalPer100g||'—'} ккал / 100 г</p><p>Белок ${f.proteinPer100g||'—'}% · жир ${f.fatPer100g||'—'}%</p></div></div>`).join('')}</div><button class="primary full" onclick="modal.close()">Готово</button>`)}
function manualFoodForm(){openModal(`<h2>Свой корм</h2><p class="muted">Если корма нет в базе, внесите данные с упаковки.</p><div class="form"><label>Название<input id="manualName" placeholder="Название корма"></label><label>Бренд<input id="manualBrand" placeholder="Производитель"></label><label>Вид<select id="manualForm"><option value="dry">Сухой</option><option value="wet">Влажный</option></select></label><label>Калорийность, ккал / 100 г<input id="manualKcal" inputmode="decimal"></label><label>Белок, %<input id="manualProtein" inputmode="decimal"></label><label>Жир, %<input id="manualFat" inputmode="decimal"></label><div class="form-actions"><button class="soft-button" onclick="modal.close()">Отмена</button><button class="primary" onclick="saveManualFood()">Сохранить и выбрать</button></div></div>`)}
window.saveManualFood=()=>{const name=$('manualName').value.trim();const kcal=readNumber('manualKcal');if(!name)return toast('Укажите название корма');if(!kcal||kcal<=0)return toast('Укажите калорийность');const f={id:`custom-${Date.now()}`,name,brand:$('manualBrand').value.trim()||'Свой корм',species:activePet()?.species||'cat',form:$('manualForm').value,kcalPer100g:kcal,proteinPer100g:readNumber('manualProtein')||null,fatPer100g:readNumber('manualFat')||null,tier:'custom',custom:true,composition:'Данные внесены пользователем.'};state.customFoods=[...(state.customFoods||[]),f];catalog=[...catalog.filter(x=>!x.custom),...state.customFoods];if(activePet())state.selectedFoods[activePet().id]=f.id;save();modal.close();tab='today';toast('Свой корм добавлен');render()};
const viewFoodsWithTools=viewFoods;viewFoods=function(){return viewFoodsWithTools()+`<div class="more-section"><button class="more-row" data-action="filters"><span>Фильтры</span><span>›</span></button><button class="more-row" data-action="manual"><span>Своего корма нет в базе</span><span>›</span></button><button class="more-row" data-action="compare"><span>Сравнить избранные</span><span>›</span></button></div>`};
const actionsWithFoodTools=actions;actions=function(a){if(a==='manual')return manualFoodForm();if(a==='compare')return compareModal();return actionsWithFoodTools(a)};
const renderWithCustomFoods=render;render=function(){if(Array.isArray(state.customFoods)){const known=new Set(catalog.map(x=>x.id));catalog=[...catalog,...state.customFoods.filter(x=>!known.has(x.id))]}renderWithCustomFoods()};
const todayLabel=()=>new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long'}).format(new Date()).toUpperCase();const viewTodayWithDate=viewToday;viewToday=function(){return viewTodayWithDate().replace('ВТОРНИК, 10 НОЯБРЯ',todayLabel())};
const todayHeaderDate=()=>{const s=new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long'}).format(new Date());return s.charAt(0).toUpperCase()+s.slice(1)};const viewTodayWithAppHeader=viewToday;viewToday=function(){return viewTodayWithAppHeader().replace(/<p class="eyebrow">[^<]*<\/p><h1>Сегодня<\/h1><p>Демо-профиль · данные хранятся на устройстве<\/p>/,`<p class="eyebrow"></p><h1>Сегодня</h1><p>${todayHeaderDate()} · Демо-профиль</p>`) };
function stockRecord(){const p=activePet(),f=chosenFood();return p&&f?(state.stock?.[p.id]?.[f.id]||{}):{}}
function stockDaysLabel(){const r=stockRecord(),f=chosenFood(),day=dailyGrams();if(!r.left||!day)return f?'Нет данных':'Нет корма';return `≈ ${Math.max(0,Math.round(Number(r.left)/day))} дней`}
function stockModal(){const p=activePet(),f=chosenFood(),r=stockRecord();if(!p||!f)return toast('Сначала выберите корм');openModal(`<h2>Запас корма</h2><p class="muted">Считаем по текущему расходу и тому, что указано на пачке.</p><div class="card mint-card"><b>${esc(f.brand)} · ${esc(f.name)}</b><p>Расход: ${dailyGrams()} г / день</p></div><div class="form"><label>Вес упаковки, г<input id="stockPack" inputmode="decimal" value="${r.pack||''}"></label><label>Осталось в упаковке, г<input id="stockLeft" inputmode="decimal" value="${r.left||''}"></label><label>Цена упаковки, ₽<input id="stockPrice" inputmode="decimal" value="${r.price||''}"></label><div class="form-actions"><button class="soft-button" onclick="modal.close()">Отмена</button><button class="primary" onclick="saveStockWeb()">Сохранить</button></div></div>`)}
window.saveStockWeb=()=>{const p=activePet(),f=chosenFood(),pack=readNumber('stockPack'),left=readNumber('stockLeft'),price=readNumber('stockPrice');if(!left||left<0)return toast('Укажите остаток в граммах');state.stock=state.stock||{};state.stock[p.id]=state.stock[p.id]||{};state.stock[p.id][f.id]={pack,left,price,updatedAt:new Date().toISOString()};save();modal.close();toast('Запас сохранён');render()};
function calcModal(){const p=activePet(),f=chosenFood();if(!p||!f)return toast('Сначала выберите корм');openModal(`<h2>Как рассчитана порция</h2><div class="card mint-card"><b>${dailyGrams()} г / день</b><p>${kcalNeed(p)} ккал в сутки · ${esc(f.brand)} ${esc(f.name)}</p></div><div class="more-section"><p>Учитываются вес питомца, возраст, активность, стерилизация, целевой вес и калорийность корма.</p><p class="muted">Это ориентир, а не назначение врача. При заболеваниях рацион согласуйте с ветеринаром.</p></div><button class="primary full" onclick="modal.close()">Понятно</button>`)}
const viewTodayWithStock=viewToday;viewToday=function(){return viewTodayWithStock().replace(/≈ 12 дней/g,stockDaysLabel())};
const actionsWithStock=actions;actions=function(a){if(a==='stock')return stockModal();if(a==='calc')return calcModal();return actionsWithStock(a)};
function filtersModal(){const f=state.foodFilters||{},brands=[...new Set(catalog.map(x=>x.brand).filter(Boolean))].sort();openModal(`<h2>Фильтры</h2><div class="form"><label>Тип корма<select id="filterForm"><option value="all" ${!f.form||f.form==='all'?'selected':''}>Любой</option><option value="dry" ${f.form==='dry'?'selected':''}>Сухой</option><option value="wet" ${f.form==='wet'?'selected':''}>Влажный</option></select></label><label><input id="filterBudget" type="checkbox" ${f.budget?'checked':''}> Бюджетные корма</label><label><input id="filterSterilized" type="checkbox" ${f.sterilized?'checked':''}> Для стерилизованных</label><label><input id="filterSensitive" type="checkbox" ${f.sensitive?'checked':''}> Для чувствительного пищеварения</label><label>Бренд<select id="filterBrand"><option value="">Любой</option>${brands.map(b=>`<option value="${esc(b)}" ${f.brand===b?'selected':''}>${esc(b)}</option>`).join('')}</select></label><div class="form-actions"><button class="soft-button" onclick="modal.close()">Отмена</button><button class="primary" onclick="saveFoodFilters()">Применить</button></div></div>`)}
window.saveFoodFilters=()=>{state.foodFilters={form:$('filterForm').value,budget:$('filterBudget').checked,sterilized:$('filterSterilized').checked,sensitive:$('filterSensitive').checked,brand:$('filterBrand').value};save();modal.close();toast('Фильтры применены');render()};
const actionsWithFilters=actions;actions=function(a){if(a==='filters')return filtersModal();return actionsWithFilters(a)};
function exampleModal(){openModal(`<h2>Сегодня</h2><p class="muted">Пример экрана. Данные не сохраняются.</p><section class="card mint-card hero-card"><div class="meal-top">СЛЕДУЮЩЕЕ · 19:00</div><h2>Вечерняя порция</h2><div class="grams">25<small>г</small></div><p class="food-line">Royal Canin · Sterilised 37</p><button class="primary full" onclick="toast('Это пример, запись не сохраняется')">Покормил</button></section><button class="primary full" onclick="modal.close();startOnboarding()">Добавить своего питомца</button>`)}
const actionsWithExample=actions;actions=function(a){if(a==='example')return exampleModal();return actionsWithExample(a)};
const viewFoodsWithFilterState=viewFoods;viewFoods=function(){const html=viewFoodsWithFilterState();const f=state.foodFilters||{};const hidden=catalog.filter(x=>(f.form&&f.form!=='all'&&x.form!==f.form)||(f.budget&&x.tier!=='budget')||(f.sterilized&&!((x.tags||[]).includes('sterilised')||/sterilis/i.test(x.name||'')))||(f.sensitive&&!((x.tags||[]).includes('sensitive')||/sensitive|digestive|gastro/i.test(`${x.name} ${x.composition||''}`)))||(f.brand&&String(x.brand||'')!==String(f.brand))).map(x=>x.id).filter(Boolean);if(!hidden.length)return html;return `${html}<style>${hidden.map(id=>`.food-card:has([data-food="${id}"]){display:none!important}`).join('')}</style>`};
const foodDetailsOriginal=foodDetails;foodDetails=function(id){const f=foodById(id);if(!f)return;const p=activePet(),ok=Boolean(foodRecommendation(f,p)),image=foodImage(f);openModal(`<div class="food-detail"><h2>${esc(f.name)}</h2><div class="food-detail-hero">${image?`<img src="${esc(image)}" alt="${esc(f.name)}">`:'<div class="food-placeholder">🥫</div>'}</div><p class="eyebrow">${esc(f.brand)} · производитель ${esc(f.brand)}</p><h3>${f.form==='wet'?'Влажный корм':'Сухой корм'}</h3><p class="muted">${f.form==='wet'?'Влажный':'Сухой'} · упаковка с этикетки</p><div class="food-detail-rows"><div><span>Стоимость упаковки</span><b>${f.price?'≈ '+esc(f.price)+' ₽':'Не указана'}</b></div><div><span>Стоимость дня</span><b>${p&&f.kcalPer100g?'≈ '+dailyGrams(p,f)+' г / день':'Нужны данные'}</b></div></div>${ok?`<div class="mint-card card"><h3>Подойдёт ли ${esc(p?.name||'питомцу')}?</h3><p>Подходит по выбранному профилю. Не заменяет назначение ветеринара.</p></div>`:`<div class="warning-card card"><h3>Состав требует проверки</h3><p>Совместимость корма ещё не подтверждена. Сверьте состав и ограничения питомца.</p><button class="link-button" onclick="toast('Проверьте состав на упаковке')">Проверить этикетку →</button></div>`}<h3>Состав и питательные показатели</h3><p class="muted">Белки: ${f.proteinPer100g||'—'}% · жиры: ${f.fatPer100g||'—'}% · калорийность: ${f.kcalPer100g||'—'} ккал / 100 г</p><p>${esc(f.composition||'Состав пока не внесён.')}</p><div class="form-actions"><button class="soft-button" onclick="toast('Сравнение добавлено')">Сравнить</button><button class="soft-button" onclick="toast('Проверьте этикетку на упаковке')">Этикетка →</button></div><button class="primary full" onclick="selectFood('${esc(f.id)}')">${ok?'Добавить в рацион':'Проверить этикетку'}</button></div>`) };
const selectFoodOriginal=window.selectFood;window.selectFood=id=>{const f=foodById(id);const p=activePet();if(!p){toast('Сначала добавьте питомца');petForm();return}if(!foodRecommendation(f,p))toast('Сверьте состав на упаковке');return selectFoodOriginal(id)};
state.ration=state.ration&&typeof state.ration==='object'?state.ration:{};
const dailyGramsSingle=dailyGrams;const rationConfig=p=>{const r=state.ration?.[p?.id]||{};const secondary=foodById(r.secondaryId);const share=secondary?Math.max(0,Math.min(100,Number(r.share)||70)):100;return {secondary,share}};const rationItems=()=>{const p=activePet(),primary=chosenFood();if(!p||!primary)return[];const r=rationConfig(p),items=[{food:primary,share:r.secondary?r.share:100}];if(r.secondary&&r.share<100)items.push({food:r.secondary,share:100-r.share});return items.map(x=>Object.assign(x,{grams:Math.max(0,Math.round(dailyGramsSingle(p,x.food)*x.share/100/5)*5)}))};
// Match the native app: the daily norm card and meal schedule use the
// primary food item. The secondary food is shown separately in the ration.
dailyGrams=function(p,food){if(arguments.length>1)return dailyGramsSingle(p,food);return rationItems()[0]?.grams||0};
window.setRationShare=share=>{const p=activePet();if(!p)return;state.ration[p.id]=Object.assign({},state.ration[p.id]||{},{share:Number(share)});save();modal.close();toast('Доля рациона сохранена');render()};window.startSecondaryFood=()=>{const p=activePet();if(!p)return;state.secondaryPicking=true;save();modal.close();tab='foods';render()};window.removeSecondaryFood=()=>{const p=activePet();if(!p)return;state.ration[p.id]={secondaryId:null,share:100};save();modal.close();toast('Второй корм убран');render()};
const selectFoodWithSecondary=window.selectFood;window.selectFood=id=>{const f=foodById(id);if(state.secondaryPicking){const p=activePet();if(!p){toast('Сначала добавьте питомца');petForm();return}if(!foodRecommendation(f,p))toast('Сверьте состав на упаковке');state.ration[p.id]={secondaryId:id,share:70};state.secondaryPicking=false;save();modal.close();tab='today';toast('Второй корм добавлен');render();return}return selectFoodWithSecondary(id)};
const calcModalOriginal=calcModal;calcModal=function(){const p=activePet(),f=chosenFood(),items=rationItems(),r=rationConfig(p);if(!p||!f)return toast('Сначала выберите корм');openModal(`<h2>Как рассчитана порция</h2><div class="card mint-card"><b>${dailyGrams()} г / день</b><p>${kcalNeed(p)} ккал в сутки</p></div><div class="more-section"><h3>Рацион</h3>${items.map(x=>`<div class="kv"><span>${esc(x.food.brand)} · ${esc(x.food.name)}</span><strong>${x.grams} г · ${x.share}%</strong></div>`).join('')}<div class="chips"><button class="chip ${r.share===100?'active':''}" onclick="setRationShare(100)">100%</button>${r.secondary?`<><button class="chip ${r.share===70?'active':''}" onclick="setRationShare(70)">70 / 30</button><button class="chip ${r.share===50?'active':''}" onclick="setRationShare(50)">50 / 50</button><button class="chip ${r.share===30?'active':''}" onclick="setRationShare(30)">30 / 70</button></>`:''}</div>${r.secondary?`<button class="soft-button full" onclick="removeSecondaryFood()">Убрать второй корм</button>`:`<button class="soft-button full" onclick="startSecondaryFood()">Добавить второй корм</button>`}</div><p class="muted">Учитываются вес, возраст, активность, стерилизация, целевой вес и калорийность корма. Это ориентир, а не назначение врача.</p><button class="primary full" onclick="modal.close()">Понятно</button>`) };
function proModal(){const isPro=Boolean(state.pro);openModal(`<h2>Больше заботы с PRO</h2><div class="pro-hero"><b>NutriPate PRO</b><p>Для большой семьи и более подробной истории заботы.</p></div><div class="pro-table"><div><b>Возможности</b><b>Бесплатно</b><b>PRO</b></div>${[['Питомцы','1','2+'],['Расчёт и выбранный корм','✓','✓'],['Дневник и история веса','Базовые','Полные'],['Сравнение кормов','—','✓'],['Сканер упаковок','—','✓'],['Отчёты и анализ','—','Расшир.'],['Напоминания','Базовые','Больше']].map(r=>`<div><span>${r[0]}</span><span>${r[1]}</span><strong>${r[2]}</strong></div>`).join('')}</div><p class="muted">Без подписки остаются расчёт нормы, один питомец и основной дневник.</p><div class="pro-plan"><b>Месяц</b><strong>299 ₽</strong><button class="primary" type="button" onclick="enablePro('month')">Оплатить</button></div><div class="pro-plan"><b>6 месяцев</b><strong>1 599 ₽</strong><button class="primary" type="button" onclick="enablePro('half_year')">Оплатить</button></div><div class="pro-plan"><b>Год</b><strong>2 999 ₽</strong><button class="primary" type="button" onclick="enablePro('year')">Оплатить</button></div>${isPro?`<div class="mint-card card"><b>PRO включён на этом устройстве</b><p>Это местный переключатель, не покупка.</p><button class="soft-button" onclick="disablePro()">Выключить PRO</button></div>`:''}<button class="soft-button full" onclick="modal.close()">Продолжить бесплатно</button>`)}
window.enablePro=plan=>{const code={month:'month',half:'half_year',half_year:'half_year',year:'year'}[plan]||'month';location.href='/payment.html?plan='+encodeURIComponent(code);};window.disablePro=()=>{toast('Отмена PRO не предусмотрена');};
const actionsWithPro=actions;actions=function(a){if(a==='pro')return proModal();return actionsWithPro(a)};
const viewFoodsWithSecondFood=viewFoods;viewFoods=function(){const html=viewFoodsWithSecondFood();return state.secondaryPicking?`<div class="card mint-card"><b>Второй корм</b><p class="muted">Выберите корм, который закроет оставшуюся долю рациона.</p><button class="soft-button" data-action="cancel-secondary">Отмена</button></div>${html}`:html};const actionsWithSecondary=actions;actions=function(a){if(a==='cancel-secondary'){state.secondaryPicking=false;save();render();return}return actionsWithSecondary(a)};
const viewTodayWithAppRows=viewToday;viewToday=function(){let html=viewTodayWithAppRows();html=html.replace('</section><button class="kv" data-action="weight">',`</section><button class="kv" data-action="reminders"><span>Напоминания о кормлении</span><strong>${state.reminders.enabled?'Настроены':'Настроить'}</strong><span>›</span></button><button class="kv" data-action="weight">`);if(loggedToday().length)html=html.replace('</div>`}',`</div><button class="kv danger-row" data-action="undo-feed"><span>Отменить последнюю порцию</span><span>›</span></button>`);return html};
function reportPreviewText(p,flags){const weights=state.weights.filter(x=>x.petId===p.id),entries=state.feedEntries.filter(x=>x.petId===p.id),feeds=entries.filter(x=>(x.kind||'feed')==='feed'),notes=entries.filter(x=>x.kind==='note');return `<div class="report-paper"><b>NutriPate</b><h3>История ${esc(p.name||'питомца')}</h3><p class="muted">${new Date().toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'})}</p><p>${esc(p.species==='dog'?'Собака':'Кошка')} · ${esc(p.breedLabel||p.breed||'Порода не указана')} · ${esc(p.weight)} кг</p>${flags.weight?`<h4>История веса</h4><p>${weights.length?weights.map(x=>`${esc(x.date)} — ${esc(x.kg)} кг`).join('<br>'):'Записей нет'}</p>`:''}${flags.feed?`<h4>Кормления и рацион</h4><p>${feeds.length?`${feeds.length} записей · ${feeds.reduce((a,x)=>a+Number(x.grams||0),0)} г выдано`:'Записей нет'}</p>`:''}${flags.notes?`<h4>Наблюдения</h4><p>${notes.length?notes.map(x=>esc(x.text||x.name||'Наблюдение')).join('<br>'):'Записей нет'}</p>`:''}<small>Автоматических диагнозов в отчёте нет. Передайте документ ветеринару для обсуждения.</small></div>`}
function reportPreviewModal(){const p=activePet();if(!p)return;const flags=Object.assign({weight:true,feed:true,notes:true},state.reportFlags||{});const open=()=>{openModal(`<h2>Отчёт готов</h2><div class="card mint-card"><b>${esc(p.name||'Питомец')} · ${p.species==='dog'?'собака':'кошка'}</b><p class="muted">Вес, рацион и заметки собраны вместе. Проверьте документ перед передачей ветеринару.</p></div><div class="form report-options"><label><input type="checkbox" id="reportWeight" ${flags.weight?'checked':''}> История веса</label><label><input type="checkbox" id="reportFeed" ${flags.feed?'checked':''}> Кормления и рацион</label><label><input type="checkbox" id="reportNotes" ${flags.notes?'checked':''}> Наблюдения</label></div><div id="reportPreview">${reportPreviewText(p,flags)}</div><div class="form-actions"><button class="soft-button" onclick="printReport()">Печать / PDF</button><button class="primary" onclick="downloadReport()">Скачать JSON</button></div><button class="soft-button full" onclick="modal.close()">Готово</button>`);['reportWeight','reportFeed','reportNotes'].forEach(id=>$(id)?.addEventListener('change',()=>{state.reportFlags={weight:$('reportWeight').checked,feed:$('reportFeed').checked,notes:$('reportNotes').checked};save();$('reportPreview').innerHTML=reportPreviewText(p,state.reportFlags)}));};open()}
function printReport(){const p=activePet();if(!p)return;const flags=Object.assign({weight:true,feed:true,notes:true},state.reportFlags||{}),w=window.open('','_blank','noopener,noreferrer');if(!w)return toast('Разрешите всплывающие окна для печати');w.document.write(`<html lang="ru"><head><meta charset="utf-8"><title>NutriPate — отчёт</title><style>body{font:16px Arial;color:#000;max-width:760px;margin:40px auto;line-height:1.5}h1,h2,h3{color:#07383a}.paper{border:1px solid #dce7e2;border-radius:18px;padding:28px}small{color:#536e6b}</style></head><body><div class="paper"><h1>NutriPate</h1>${reportPreviewText(p,flags)}</div><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close()}
const reportModalOriginal=reportModal;reportModal=reportPreviewModal;
function calcModalDetailed(){const p=activePet(),f=chosenFood(),items=rationItems(),r=rationConfig(p);if(!p||!f)return toast('Сначала выберите корм');const grams=dailyGrams(),treats=state.feedEntries.filter(x=>x.petId===p.id&&x.date===todayKey()&&x.kind==='treat').reduce((sum,x)=>sum+Number(x.kcal||0),0),protein=f.proteinPer100g?Math.round(grams*Number(f.proteinPer100g)/100*10)/10:null,fat=f.fatPer100g?Math.round(grams*Number(f.fatPer100g)/100*10)/10:null,activity=({low:'Низкая',medium:'Умеренная',high:'Высокая',very_high:'Очень высокая'})[p.activity]||'Умеренная';openModal(`<h2>Как рассчитана порция</h2><div class="card mint-card"><b>${grams} г / день</b><p>${kcalNeed(p)} ккал в сутки · ${esc(f.brand)} ${esc(f.name)}</p></div><div class="more-section"><h3>На чём основан расчёт</h3><div class="kv"><span>Питомец</span><strong>${esc(p.name||'Питомец')} · ${esc(p.weight)} кг</strong></div><div class="kv"><span>Активность</span><strong>${activity}</strong></div><div class="kv"><span>Энергия</span><strong>${kcalNeed(p)} ккал</strong></div><div class="kv"><span>Белок / жир</span><strong>${protein===null?'—':protein+' г'} / ${fat===null?'—':fat+' г'}</strong></div>${treats?`<div class="kv"><span>Лакомства сегодня</span><strong>${treats} ккал</strong></div>`:''}<p class="muted">RER = 70 × вес<sup>0,75</sup>; затем учитываются возраст, активность, стерилизация и цель по весу. Граммы зависят от калорийности выбранного корма.</p><h3>Рацион</h3>${items.map(x=>`<div class="kv"><span>${esc(x.food.brand)} · ${esc(x.food.name)}</span><strong>${x.grams} г · ${x.share}%</strong></div>`).join('')}<div class="chips"><button class="chip ${r.share===100?'active':''}" onclick="setRationShare(100)">100%</button>${r.secondary?`<><button class="chip ${r.share===70?'active':''}" onclick="setRationShare(70)">70 / 30</button><button class="chip ${r.share===50?'active':''}" onclick="setRationShare(50)">50 / 50</button><button class="chip ${r.share===30?'active':''}" onclick="setRationShare(30)">30 / 70</button></>`:''}</div>${r.secondary?`<button class="soft-button full" onclick="removeSecondaryFood()">Убрать второй корм</button>`:`<button class="soft-button full" onclick="startSecondaryFood()">Добавить второй корм</button>`}</div><p class="muted">Это ориентир, а не назначение врача. При заболеваниях рацион согласуйте с ветеринаром.</p><button class="primary full" onclick="modal.close()">Понятно</button>`) }
calcModal=calcModalDetailed;
const petFormWithDelete=petForm;petForm=function(raw){petFormWithDelete(raw);if(!raw?.id)return;const actionsBox=document.querySelector('#modalContent .form-actions');if(actionsBox)actionsBox.insertAdjacentHTML('afterend','<button type="button" class="danger-button" onclick="deletePetWeb(\''+esc(raw.id)+'\')">Удалить питомца</button>')};
const petFormWithTopSpecies=petForm;petForm=function(raw){petFormWithTopSpecies(raw);const content=document.querySelector('#modalContent');const first=content?.querySelector('.form-section');if(!content||!first)return;/* keep pet photo field and its file input */const title=content.querySelector(':scope > h2');if(title&&!content.querySelector('.pet-form-header'))title.insertAdjacentHTML('beforebegin','<div class="pet-form-header"><button type="button" class="back-button" onclick="modal.close()">‹</button><span>NutriPate</span></div>');const chips=first.querySelector('.pet-species-chips');if(chips){first.insertBefore(chips,first.firstElementChild);if(!first.querySelector('.pet-photo-row'))chips.insertAdjacentHTML('afterend','<div class="pet-photo-row"><span class="pet-paw-placeholder" aria-hidden="true"><img class="pet-paw-reference" src="assets/paw-reference-transparent.png" alt=""></span><button type="button" class="link-button">Фото</button></div>')}};
window.deletePetWeb=id=>{const p=state.pets.find(x=>x.id===id);if(!p||!confirm(`Удалить профиль «${p.name||'Питомец'}» и его дневник?`))return;const stamp=new Date().toISOString();state.petTombstones=Object.assign({},state.petTombstones,{[id]:stamp});state.removedPetIds=Array.from(new Set([].concat(state.removedPetIds||[],[id])));state.pets=state.pets.filter(x=>x.id!==id);state.feedEntries=state.feedEntries.filter(x=>x.petId!==id);state.weights=state.weights.filter(x=>x.petId!==id);delete state.selectedFoods[id];if(state.activePetId===id)state.activePetId=state.pets[0]?.id||null;save();modal.close();toast('Питомец удалён');render()};
let petPhotoDraft=null;let petFormDraftId='';let petPhotoRemoved=false;
	function handlePetPhoto(file){if(!file)return;petPhotoRemoved=false;const reader=new FileReader();reader.onload=()=>{petPhotoDraft=String(reader.result||'');const preview=$('petPhotoPreview');if(preview)preview.src=petPhotoDraft;if(typeof updatePetPhotoVisual==='function')updatePetPhotoVisual()};reader.readAsDataURL(file)}
const petFormWithPhoto=petForm;petForm=function(raw){petFormDraftId=raw?.id||'';petPhotoDraft=raw?.photo||null;petPhotoRemoved=false;window.__nutripatePhotoRemoved=false;petFormWithPhoto(raw);const first=document.querySelector('#modalContent .form-section');if(!first)return;first.insertAdjacentHTML('afterbegin',`<input id="petPhotoInput" type="file" accept="image/*" hidden>`);const input=$('petPhotoInput');if(input)input.onchange=()=>handlePetPhoto(input.files?.[0])};
window.switchPetSpeciesWeb=species=>{const draft=captureBreedDraft();draft.species=species;draft.breed='';draft.breedId='';draft.breedLabel='';petForm(draft)};
const petFormWithSpecies=petForm;petForm=function(raw){petFormWithSpecies(raw);const select=$('petInputSpecies');const label=select?.parentElement;if(!select||!label)return;label.style.display='none';label.insertAdjacentHTML('beforebegin',`<div class="pet-species-chips"><button type="button" class="choice-chip-button ${select.value==='cat'?'active':''}" onclick="switchPetSpeciesWeb('cat')">Кошка</button><button type="button" class="choice-chip-button ${select.value==='dog'?'active':''}" onclick="switchPetSpeciesWeb('dog')">Собака</button></div>`)};
const savePetWithPhoto=window.savePet;window.savePet=function(id){savePetWithPhoto(id);const dialog=$('modal');const saved=id?state.pets.find(x=>x.id===id):state.pets[state.pets.length-1];if(saved&&!dialog?.open){saved.photo=petPhotoDraft||null;save();render();petPhotoDraft=null}};
const actionsWithTodayParity=actions;actions=function(a){if(a==='undo-feed'){const rows=loggedToday();const last=rows[rows.length-1];if(last){const i=state.feedEntries.indexOf(last);if(i>=0)state.feedEntries.splice(i,1);save();toast('Последняя порция отменена');render()}return}return actionsWithTodayParity(a)};
window.toggleFoodFavoriteWeb=id=>{state.favorites=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id];save();if($('modal')?.open)foodDetails(id);else render()};
window.compareFoodWeb=id=>{if(!state.favorites.includes(id)){if(state.favorites.length>=3)return toast('В сравнении может быть до трёх кормов');state.favorites=[...state.favorites,id];save()}if($('modal')?.open)modal.close();compareModal()};
window.removePrimaryFoodWeb=()=>{const p=activePet();if(!p)return;state.selectedFoods[p.id]='__not_selected__';delete state.foodSetAt?.[p.id];delete state.foodChoiceSource?.[p.id];delete state.foodChoiceConfirmed?.[p.id];if(state.ration?.[p.id])delete state.ration[p.id];save();modal.close();toast('Корм убран из рациона');render()};
window.addSecondaryFoodWeb=id=>{const p=activePet(),f=foodById(id);if(!p||!f)return;if(!foodRecommendation(f,p))return toast('Проверьте состав на упаковке');state.ration=state.ration||{};state.ration[p.id]={secondaryId:id,share:70};save();modal.close();toast('Второй корм добавлен');render()};
const foodDetailsDesktopParity=foodDetails;foodDetails=function(id){const f=foodById(id);if(!f)return;const p=activePet(),ok=Boolean(foodRecommendation(f,p)),image=foodImage(f),primaryId=p&&state.selectedFoods?.[p.id],secondaryId=p&&state.ration?.[p.id]?.secondaryId,isPrimary=primaryId===f.id,isSecondary=secondaryId===f.id;openModal(`<div class="food-detail"><div class="row-between"><h2>${esc(f.name)}</h2><button class="heart" onclick="toggleFoodFavoriteWeb('${esc(f.id)}')">${state.favorites.includes(f.id)?'♥':'♡'}</button></div><div class="food-detail-hero">${image?`<img src="${esc(image)}" alt="${esc(f.name)}">`:'<div class="food-placeholder">🥫</div>'}</div><p class="eyebrow">${esc(f.brand)} · производитель ${esc(f.brand)}</p><h3>${f.form==='wet'?'Влажный корм':'Сухой корм'}</h3><p class="muted">${f.form==='wet'?'Влажный':'Сухой'} · упаковка с этикетки</p><div class="food-detail-rows"><div><span>Стоимость упаковки</span><b>${f.price?'≈ '+esc(f.price)+' ₽':'Не указана'}</b></div><div><span>Стоимость дня</span><b>${p&&f.kcalPer100g?'≈ '+dailyGrams(p,f)+' г / день':'Нужны данные'}</b></div></div>${ok?`<div class="mint-card card"><h3>Подойдёт ли ${esc(p?.name||'питомцу')}?</h3><p>Подходит по выбранному профилю. Не заменяет назначение ветеринара.</p></div>`:`<div class="warning-card card"><h3>Состав требует проверки</h3><p>Совместимость корма ещё не подтверждена. Сверьте состав и ограничения питомца.</p></div>`}<h3>Состав и питательные показатели</h3><p class="muted">Белки: ${f.proteinPer100g||'—'}% · жиры: ${f.fatPer100g||'—'}% · калорийность: ${f.kcalPer100g||'—'} ккал / 100 г</p><p>${esc(f.composition||'Состав пока не внесён.')}</p><div class="form-actions"><button class="soft-button" onclick="compareFoodWeb('${esc(f.id)}')">Сравнить</button><button class="soft-button" onclick="toast('Проверьте этикетку на упаковке')">Этикетка →</button></div>${isPrimary?`<button class="soft-button full" onclick="removePrimaryFoodWeb()">Убрать из рациона</button>`:isSecondary?`<button class="soft-button full" onclick="removeSecondaryFood()">Убрать второй корм</button>`:`<button class="primary full" onclick="${p&&primaryId&&f.form!==foodById(primaryId)?.form?`addSecondaryFoodWeb('${esc(f.id)}')`:`selectFood('${esc(f.id)}')`}">${p&&primaryId&&f.form!==foodById(primaryId)?.form?'Добавить вторым кормом':ok?'Добавить в рацион':'Проверить этикетку'}</button>`}</div>`) };
window.showMoreFoodsWeb=()=>{foodLimitWeb+=8;render()};
const viewFoodsWithPagination=viewFoods;viewFoods=function(){const html=viewFoodsWithPagination();const p=activePet();const all=recommendedFoods(p).filter(x=>{const f=x.food;return(!query||`${f.brand} ${f.name} ${f.composition||''}`.toLowerCase().includes(query.toLowerCase()))&&(foodFilter==='all'||(foodFilter==='fav'?state.favorites.includes(f.id):f.form===foodFilter))});return `${html}${all.length>foodLimitWeb?`<button class="soft-button full" data-action="more-foods">Ещё ${Math.min(8,all.length-foodLimitWeb)}</button>`:''}`};
const actionsWithFoodPagination=actions;actions=function(a){if(a==='more-foods')return showMoreFoodsWeb();return actionsWithFoodPagination(a)};
const viewFoodsWithEmptyFilterCleanup=viewFoods;viewFoods=function(){const html=viewFoodsWithEmptyFilterCleanup(),f=state.foodFilters||{},pass=x=>{const q=x.food,blob=`${q.name||''} ${q.brand||''} ${q.composition||''}`.toLowerCase();return(!query||blob.includes(query.toLowerCase()))&&(foodFilter==='all'||(foodFilter==='fav'?state.favorites.includes(q.id):q.form===foodFilter))&&(!f.form||f.form==='all'||q.form===f.form)&&(!f.budget||q.tier==='budget')&&(!f.sterilized||((q.tags||[]).includes('sterilised')||/sterilis/i.test(q.name||'')))&&(!f.sensitive||((q.tags||[]).includes('sensitive')||/sensitive|digestive|gastro/i.test(blob)))&&(!f.brand||String(q.brand||'')===String(f.brand))};const all=recommendedFoods(activePet()),visible=all.filter(pass),groupKeys=['medical','weight','best','good','budget'],hideGroups=groupKeys.filter(k=>{const original=all.filter(x=>(x.rec.group||'good')===k);return original.length&&!visible.some(x=>(x.rec.group||'good')===k)}),hideStyles=hideGroups.map(k=>{const first=all.find(x=>(x.rec.group||'good')===k);return first?`.recommendation-section:has(button[data-food="${first.food.id}"]){display:none!important}`:''}).join('');return `${html}<style>${hideStyles}${visible.length<=foodLimitWeb?'button[data-action="more-foods"]{display:none!important}':''}</style>`};
const viewFoodsWithFilterForm=viewFoods;viewFoods=function(){const f=state.foodFilters||{},priorFilter=foodFilter;if(f.form&&f.form!=='all')foodFilter=f.form;const html=viewFoodsWithFilterForm();foodFilter=priorFilter;return html};
const petFormReferenceFinal=petForm;petForm=function(raw){petFormReferenceFinal(raw);const content=document.querySelector('#modalContent'),form=content?.querySelector('.pet-form'),first=form?.querySelector('.form-section');if(!content||!form||!first)return;first.querySelector(':scope > b')?.remove();const nameInput=first.querySelector('#petInputName');if(nameInput){nameInput.placeholder='Имя';const label=nameInput.parentElement;if(label?.firstChild?.nodeType===3)label.firstChild.nodeValue=''}const species=first.querySelector('.pet-species-chips');if(species){first.insertBefore(species,first.firstElementChild);species.nextElementSibling?.classList.contains('pet-photo-row')||species.insertAdjacentHTML('afterend','<div class="pet-photo-row"><span class="pet-paw-placeholder" aria-hidden="true"><img class="pet-paw-reference" src="assets/paw-reference-transparent.png" alt=""></span><button type="button" class="link-button">Фото</button></div>')};const breed=first.querySelector('#petInputBreed'),breedLabel=breed?.parentElement;if(breed&&breedLabel){breedLabel.style.display='none';const picker=first.querySelector('.breed-picker-button');if(picker){picker.className='breed-reference-row';picker.innerHTML='<span>Порода · справочник</span><strong>'+((breed.selectedOptions?.[0]?.textContent||'Не выбрана')==='Выберите породу'?'Не выбрана':breed.selectedOptions[0].textContent)+' ›</strong>'}}const grid=first.querySelector('.form-grid');if(grid)grid.classList.add('pet-reference-grid');const photoButton=first.querySelector('.pet-photo-row .link-button');if(photoButton)photoButton.onclick=()=>document.getElementById('petPhotoInput')?.click()};
const foodFilterPassWeb=x=>{const f=x.food,ff=state.foodFilters||{},blob=`${f.name||''} ${f.brand||''} ${f.composition||''}`.toLowerCase();return(!query||blob.includes(query.toLowerCase()))&&(foodFilter==='all'||(foodFilter==='fav'?state.favorites.includes(f.id):f.form===foodFilter))&&(!ff.form||ff.form==='all'||f.form===ff.form)&&(!ff.budget||f.tier==='budget')&&(!ff.sterilized||((f.tags||[]).includes('sterilised')||/sterilis/i.test(f.name||'')))&&(!ff.sensitive||((f.tags||[]).includes('sensitive')||/sensitive|digestive|gastro/i.test(blob)))&&(!ff.brand||String(f.brand||'')===String(ff.brand))};
viewFoods=function(){const p=activePet(),all=recommendedFoods(p).filter(foodFilterPassWeb),rows=all.slice(0,foodLimitWeb),sections=[['medical','Лечебные','Только под указанные особенности и по назначению врача.'],['weight','Для контроля веса','Меньше калорий и более подходящие линейки.'],['best','Лучшие','Лучше всего подходят по профилю.'],['good','Хорошие','Тоже подходят профилю.'],['budget','Бюджетные','Цена ниже, но профиль всё равно учитывается.']],content=sections.map(([key,heading,sub])=>{const group=rows.filter(x=>(x.rec.group||'good')===key);return group.length?`<section class="recommendation-section"><h2>${heading}</h2><p class="muted">${sub}</p><div class="food-list">${group.map(x=>foodCard(x.food)).join('')}</div></section>`:''}).join('');return `${title('КАТАЛОГ','Корма',p?`Подбор по профилю ${p.name}`:'Выберите питомца')}<input class="search" id="foodSearch" value="${esc(query)}" placeholder="Название, бренд или состав"><div class="chips"><button class="chip ${foodFilter==='all'?'active':''}" data-filter="all">Все</button><button class="chip ${foodFilter==='dry'?'active':''}" data-filter="dry">Сухой</button><button class="chip ${foodFilter==='wet'?'active':''}" data-filter="wet">Влажный</button><button class="chip ${foodFilter==='fav'?'active':''}" data-filter="fav">♡ Избранное</button></div><p class="muted">В базе ${catalog.length} кормов. Сначала показываем подходящие группы по профилю ${esc(p?.name||'питомца')}.</p>${content||'<div class="empty">Подходящих вариантов не найдено. Измените профиль или фильтр.</div>'}<div class="more-section"><button class="more-row" data-action="filters"><span>Фильтры</span><span>›</span></button><button class="more-row" data-action="manual"><span>Своего корма нет в базе</span><span>›</span></button><button class="more-row" data-action="compare"><span>Сравнить избранные</span><span>›</span></button></div>${all.length>foodLimitWeb?`<button class="soft-button full" data-action="more-foods">Ещё ${Math.min(8,all.length-foodLimitWeb)}</button>`:''}`};
const petFormReferenceVisualFix=petForm;petForm=function(raw){petFormReferenceVisualFix(raw);const form=document.querySelector('#modalContent .pet-form'),first=form?.querySelector('.form-section');if(!form||!first)return;/* keep pet photo field and its file input */const breed=document.querySelector('#petInputBreed'),label=breed?.parentElement,picker=first.querySelector('.breed-picker-button');if(label){label.style.display='block';label.className='breed-reference-label';if(label.firstChild?.nodeType===3)label.firstChild.nodeValue='';}if(picker){picker.className='breed-reference-row';picker.innerHTML='<span>Порода · справочник</span><strong>'+((breed?.selectedOptions?.[0]?.textContent||'Выберите породу')==='Выберите породу'?'Не выбрана':breed.selectedOptions[0].textContent)+' ›</strong>'}};
function readableBreedNote(text,name){let s=String(text||'').trim();const specific={'Шотландская вислоухая':'У этой породы форма ушей связана с особенностью хрящевой ткани. При выборе питомца важно проверить походку, хвост и подвижность суставов. Двух вислоухих кошек между собой не скрещивают.','Шотландская прямоухая':'У этой породы обычная форма ушей. Следите за весом и уточните у заводчика, были ли в линии сердечные заболевания.','Мейн-кун':'Порода крупная и растёт дольше других кошек. Важно следить за сердцем, суставами и весом, особенно в первые годы жизни.','Персидская':'Из-за формы морды могут возникать проблемы с дыханием и слезотечением. Также важно регулярно проверять зубы и следить за весом.','Канадский сфинкс':'Кожа нуждается в регулярном уходе. Следите за температурой: кошка быстрее мёрзнет и перегревается. Полезно также контролировать сердце и зубы.'};if(specific[name])return specific[name];s=s.replace(/ГКМП/g,'гипертрофическая кардиомиопатия').replace(/дисплазия/g,'дисплазия суставов').replace(/Сердце/g,'сердце').replace(/Отдельной тяжёлой породной болезни нет/g,'Специфических тяжёлых наследственных проблем для породы не выделяют').replace(/Отдельной породной болезни нет/g,'Специфических наследственных проблем для породы не выделяют').replace(/В целом крепкая/g,'В целом порода считается крепкой').replace(/Легко толстеет/g,'порода может быстро набирать вес').replace(/Легко набирает вес/g,'порода может быстро набирать вес').replace(/Зубы/g,'состояние зубов').replace(/Кожа/g,'состояние кожи').replace(/Дыхание/g,'дыхание').replace(/Сетчатка/g,'сетчатка глаза');if(!/[.!?]$/.test(s))s+='.';return 'Для этой породы важно учитывать: '+s.charAt(0).toLowerCase()+s.slice(1)}
const openBreedDetailReadable=openBreedDetail;openBreedDetail=function(species,index){openBreedDetailReadable(species,index);const entry=breedEntries(species)[index],d=breedData(entry),note=document.querySelector('.breed-note p');if(note)note.textContent=readableBreedNote(d.diseasesText||d.distinctive,entry.name)};
const clearBreedFacts={'Британская':'Спокойная и плотная кошка с короткой шерстью. Может быстро набрать вес, поэтому важны движение и подходящая порция.','Шотландская вислоухая':'Форма ушей связана с особенностью хрящевой ткани. Не скрещивают двух вислоухих кошек; при выборе котёнка проверяют походку и хвост.','Шотландская прямоухая':'Уши имеют обычную форму, а характер обычно спокойный и дружелюбный. Следите за весом и уточните у заводчика историю здоровья родителей.','Мейн-кун':'Крупная кошка, которая растёт дольше большинства пород. Следите за сердцем, суставами и весом; котёнку нужно достаточно места для движения.','Сибирская':'Активная кошка с густой шерстью. Ей нужен регулярный уход за шерстью и контроль веса, особенно при домашнем образе жизни.','Канадский сфинкс':'Шерсти почти нет, поэтому кожа нуждается в уходе. Кошку важно защищать от холода и перегрева; также регулярно проверяют зубы и сердце.','Донской сфинкс':'Кожа требует регулярного ухода, а зимой кошке может быть холодно. Следите за зубами, сердцем и температурой в помещении.','Петерболд':'Очень общительная и активная кошка с разным количеством шерсти. Следите за кожей, зубами и тем, чтобы кошка не мёрзла.','Персидская':'Из-за короткой морды могут появляться слезотечение и затруднённое дыхание. Нужны уход за глазами, зубами и шерстью, а также контроль веса.','Сиамская':'Разговорчивая и очень привязанная к человеку кошка. Ей нужны общение и активные игры; регулярно проверяйте зубы и дёсны.','Тайская':'Активная и контактная кошка с короткой шерстью. Ей нужны игры и внимание, а также обычный уход за зубами.','Ориентальная':'Стройная, энергичная и очень общительная кошка. Ей важно много играть и общаться; худощавое телосложение для породы нормально.','Бенгальская':'Активная кошка с сильным интересом к играм и воде. Ей нужны вертикальные поверхности и ежедневная нагрузка; следите за сердцем и зрением.','Абиссинская':'Подвижная и любопытная кошка, которой нужны игры и места для лазания. Следите за почками, зрением и коленными суставами.','Русская голубая':'Спокойная, но достаточно активная кошка с короткой шерстью. При малой активности легко набирает вес, поэтому важны игры и режим питания.','Рэгдолл':'Крупная спокойная кошка, которая любит находиться рядом с человеком. Следите за сердцем и весом, потому что порода не всегда много двигается.','Норвежская лесная':'Крупная кошка с густой шерстью и хорошими навыками лазания. Нужны расчёсывание, движение и контроль сердца и суставов.','Курильский бобтейл':'Активная и выносливая кошка с коротким хвостом, который является особенностью породы. Ей нужны игры и возможность двигаться.','Корниш-рекс':'Очень активная кошка с короткой волнистой шерстью. Она легко мёрзнет, поэтому ей нужно тёплое место и регулярные игры.','Девон-рекс':'Игривый и общительный компаньон с тонкой волнистой шерстью. Следите за кожей, мышцами и суставами; кошке нужен комфортный тёплый дом.','Бурманская':'Контактная и энергичная кошка, которая плохо переносит одиночество. Ей нужны общение, игры и контроль веса.','Священная бирма':'Спокойная домашняя кошка с мягким характером и белыми лапами. Нужны обычный уход за шерстью, зубами и контроль веса.','Манчкин':'Короткие лапы не мешают играть, но увеличивают нагрузку на спину. Не допускайте лишнего веса и ограничьте опасные высокие прыжки.','Саванна':'Очень активная и крупная кошка с сильным интересом к играм. Ей нужны пространство, ежедневная нагрузка и внимательный контроль суставов и сердца.','Турецкая ангора':'Подвижная кошка с лёгкой длинной шерстью. Белые кошки с голубыми глазами могут иметь проблемы со слухом, поэтому слух проверяют с детства.','Турецкий ван':'Активная кошка, которая часто любит воду. Ей нужны игры и движение; шерсть обычно не требует сложного ухода.','Европейская короткошёрстная':'Неприхотливая и обычно крепкая кошка. Главный риск при жизни в квартире — лишний вес, поэтому важны игры и режим питания.','Американская короткошёрстная':'Спокойная крепкая кошка, хорошо приспосабливающаяся к дому. Следите за весом и давайте возможность ежедневно двигаться.','Оцикет':'Активная пятнистая кошка, которой нужны игры и общение. При выборе котёнка обращают внимание на зрение, зубы и общее состояние здоровья.','Селкирк-рекс':'Дружелюбная кошка с кудрявой шерстью. Шерсть требует регулярного ухода; при покупке уточните историю здоровья почек и сердца.','Американский керл':'Уши загнуты назад из-за особенности хряща и не требуют разгибания. Кошка обычно активная и контактная, ей нужны игры и внимание.','Шартрез':'Тихая спокойная кошка с плотной шерстью. Следите за весом и сердцем, особенно если кошка мало двигается.','Бомбей':'Общительная короткошёрстная кошка с высокой потребностью в играх. Ей важно не переедать и получать достаточно движения.','Японский бобтейл':'Активная кошка с коротким хвостом, который является природной особенностью. Обычно ей подходят игры, общение и обычный уход.','Сноу-шу':'Общительная кошка с белыми отметинами на лапах. Ей нужны игры и внимание; при уходе отдельно следят за зубами.','Немецкий шпиц (померанский)':'Маленькая активная собака с густой шерстью. Нужны уход за зубами и шерстью, ежедневные прогулки и контроль коленных суставов.','Чихуахуа':'Очень маленькая, но активная собака. Щенкам важно регулярное питание, а взрослой собаке — беречь трахею, колени и зубы.','Вельш-корги пемброк':'Активная собака с длинной спиной и склонностью к набору веса. Следите за весом, спиной и суставами, не перегружайте прыжками.','Пудель (все размеры)':'Умная активная собака, которой нужны занятия и регулярный уход за шерстью. Риски зависят от размера, поэтому важны контроль коленей, зрения и общего здоровья.','Немецкая овчарка':'Крупная активная собака, которой нужны движение и обучение. Следите за тазобедренными и локтевыми суставами, кожей и пищеварением.','Кавалер-кинг-чарльз-спаниель':'Мягкая общительная собака-компаньон. Регулярно проверяйте сердце, глаза, уши и коленные суставы.','Йоркширский терьер':'Маленькая активная собака с длинной шерстью. Нужны уход за зубами и шерстью, аккуратные игры и контроль коленей и дыхания.','Лабрадор-ретривер':'Дружелюбная активная собака, которая любит есть. Ей нужны прогулки и контроль веса, суставов и глаз.','Среднеазиатская овчарка (алабай)':'Очень крупная спокойная собака, которой нужны пространство и правильная нагрузка. Следите за ростом, суставами и весом.','Джек-рассел-терьер':'Очень энергичная собака с сильным охотничьим инстинктом. Ей нужны длительные прогулки, игры и контроль зрения, слуха и коленей.','Французский бульдог':'Собака с короткой мордой, которой трудно переносить жару и сильные нагрузки. Следите за дыханием, кожными складками и спиной.','Золотистый ретривер':'Дружелюбная активная собака, которой нужны прогулки и общение. Следите за весом, суставами, кожей и регулярно показывайте собаку врачу.','Такса':'Собака с длинной спиной, поэтому особенно важно не допускать лишний вес и прыжки с высоты. Следите за спиной, коленями и уровнем сахара.','Мопс':'Спокойная собака с короткой мордой. Она быстро перегревается и может тяжело дышать, поэтому важны прохлада, умеренная нагрузка и уход за складками.','Бигль':'Любопытная активная собака с хорошим аппетитом. Ей нужны прогулки и контроль веса, ушей и суставов.','Боксёр':'Энергичная крупная собака, которой нужны движение и занятия. Следите за сердцем, суставами и дыханием; после еды избегайте активных игр.','Доберман':'Спортивная собака, которой нужны регулярные нагрузки и обучение. Важно контролировать сердце, щитовидную железу и суставы.','Хаски (сибирский)':'Очень активная собака с густой шерстью. Ей нужны длительные прогулки и прохлада; следите за глазами, кожей и суставами.','Далматин':'Активная собака с характерным окрасом. Ей нужно много движения и воды; при выборе щенка проверяют слух и работу мочевыделительной системы.','Бультерьер':'Сильная активная собака, которой нужны воспитание и безопасная нагрузка. Следите за почками, кожей, слухом и коленными суставами.','Эрдельтерьер':'Крупная активная собака, которой нужны прогулки, игры и уход за шерстью. Следите за суставами, щитовидной железой и желудком.','Ротвейлер':'Крупная сильная собака, которой нужны воспитание и умеренная нагрузка. Следите за суставами, сердцем и весом; после еды избегайте активных игр.','Сиба-ину':'Самостоятельная активная собака с густой шерстью. Ей нужны прогулки и спокойное обучение; следите за кожей, глазами и коленями.','Чау-чау':'Спокойная собака с густой шерстью и складками кожи. Она плохо переносит жару, поэтому важны прохлада, уход за глазами и контроль веса.'};
document.addEventListener('click',event=>{const breedButton=event.target.closest('.breed-picker-button,.breed-reference-row');if(breedButton&&document.getElementById('modal')?.open){event.preventDefault();event.stopImmediatePropagation();openBreedPicker();return}const photoButton=event.target.closest('.pet-photo-row .link-button');if(photoButton){const input=document.getElementById('petPhotoInput');if(input){event.preventDefault();event.stopImmediatePropagation();input.click()}}},true);
const readableBreedNoteBase=readableBreedNote;readableBreedNote=function(text,name){return clearBreedFacts[name]||readableBreedNoteBase(text,name)};
const petFormTargetOptional=petForm;petForm=function(raw){petFormTargetOptional(raw);const input=document.querySelector('#petInputTarget');if(input){input.required=false;input.placeholder='Необязательно'}};
// Целевой вес необязателен: проверяем его только если пользователь заполнил поле.
const renderWithPrePetNav=render;render=function(){renderWithPrePetNav();const nav=document.querySelector('.bottom-nav');if(nav){nav.hidden=false;nav.style.setProperty('display','grid','important');nav.style.setProperty('visibility','visible','important')}};render();
const savePetWithoutDemoFood=window.savePet;window.savePet=function(id){const isNew=!id;savePetWithoutDemoFood(id);if(isNew){const p=state.pets[state.pets.length-1];if(p){state.selectedFoods[p.id]='__not_selected__';save();render()}}};
const viewTodayReferenceOriginal=viewToday;viewToday=function(){const p=activePet();if(!p||chosenFood())return viewTodayReferenceOriginal();const day=new Date().toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'});const date=day.charAt(0).toUpperCase()+day.slice(1);return `${title('', 'Сегодня', date)}<section class="card mint-card hero-card"><h2>Выберите корм для питомца</h2><p class="muted">Нажмите кнопку ниже — приложение подберёт варианты по профилю питомца.</p><button class="primary full" data-tab-go="foods">Выбрать корм</button></section><button class="kv" data-action="weight"><span>Взвешивание</span><strong>${lastWeightLabel()}</strong><span>›</span></button><button class="kv" data-action="stock"><span>Запас корма</span><strong>Нет корма</strong><span>›</span></button><div class="card norm"><strong>Норма ${dailyGrams()||'—'} ккал / день</strong><button class="link-button" data-action="calc">Как рассчитана порция <span>→</span></button></div><button class="kv" data-action="reminders"><span>Напоминания о кормлении</span><span>→</span></button>`};
const renderTodayReferenceOriginal=render;render=function(){renderTodayReferenceOriginal();if(activePet()&&!chosenFood()&&tab==='today')document.querySelector('.meal-bar')?.remove()};render();
const viewTodayNoFoodFinal=viewToday;viewToday=function(){const p=activePet();if(!p||chosenFood())return viewTodayNoFoodFinal();const day=new Date().toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'}),date=day.charAt(0).toUpperCase()+day.slice(1);return `${title('','Сегодня',date)}<section class="card mint-card hero-card"><h2>Выберите корм для питомца</h2><p class="muted">Нажмите кнопку ниже — приложение подберёт варианты по профилю питомца.</p><button class="primary full" data-tab-go="foods">Выбрать корм</button></section><button class="kv" data-action="weight"><span>Взвешивание</span><strong>${lastWeightLabel()}</strong><span>›</span></button><button class="kv" data-action="stock"><span>Запас корма</span><strong>Нет корма</strong><span>›</span></button><div class="card norm"><strong>Норма ${kcalNeed(p)} ккал / день</strong><button class="link-button" data-action="calc">Как рассчитана порция <span>→</span></button></div><button class="kv" data-action="reminders"><span>Напоминания о кормлении</span><span>→</span></button>`};render();
state.foodChoiceConfirmed=state.foodChoiceConfirmed&&typeof state.foodChoiceConfirmed==='object'?state.foodChoiceConfirmed:{};Object.keys(state.selectedFoods||{}).forEach(id=>{if(state.selectedFoods[id]&&state.selectedFoods[id]!=='__not_selected__'&&!state.foodChoiceConfirmed[id])state.selectedFoods[id]='__not_selected__'});save();
const selectFoodConfirm=window.selectFood;window.selectFood=function(id){const p=activePet();if(p){state.foodChoiceConfirmed[p.id]=true;save()}return selectFoodConfirm(id)};
const foodDetailsNoPrimaryFix=foodDetails;foodDetails=function(id){const noPrimary=!chosenFood();foodDetailsNoPrimaryFix(id);if(noPrimary){const button=document.querySelector('#modalContent .primary');if(button){button.textContent='Добавить в рацион';button.onclick=()=>window.selectFood(id)}}};
const foodDetailsNoPrimaryFinal=foodDetails;foodDetails=function(id){const noPrimary=!chosenFood();foodDetailsNoPrimaryFinal(id);if(noPrimary){const button=document.querySelector('#modalContent .primary');if(button){button.textContent=foodRecommendation(foodById(id),activePet())?'Добавить в рацион':'Проверить этикетку';button.onclick=()=>window.selectFood(id)}}};
const viewTodayHideNormWithoutFood=viewToday;viewToday=function(){const p=activePet(),html=viewTodayHideNormWithoutFood();if(!p||chosenFood())return html;return html.replace(/<div class="card norm">[\s\S]*?<\/div>/,'')};render();
const foodDetailsAppParity=foodDetails;foodDetails=function(id){
  const f=foodById(id);if(!f)return;
  const p=activePet(),ok=Boolean(foodRecommendation(f,p)),image=foodImage(f),tags=f.tags||[];
  const audience=tags.includes('sterilised')?'Для стерилизованных':tags.includes('kitten')?'Для котят':tags.includes('puppy')?'Для щенков':tags.includes('senior')?'Для пожилых питомцев':'Для взрослых питомцев';
  const nutrition=[f.proteinPer100g!=null?`белок ${f.proteinPer100g}%`:null,f.fatPer100g!=null?`жир ${f.fatPer100g}%`:null,f.kcalPer100g!=null?`${f.kcalPer100g} ккал / 100 г`:null,f.fiberPer100g!=null?`клетчатка ${f.fiberPer100g}%`:null].filter(Boolean).join(', ');
  const breed=p?.breed||'вашего питомца';
  const primaryId=p&&state.selectedFoods?.[p.id],primary=foodById(primaryId),secondaryId=p&&state.ration?.[p.id]?.secondaryId,isPrimary=primaryId===f.id,isSecondary=secondaryId===f.id;
  openModal(`<div class="food-detail app-parity-food"><h2>${esc(f.name)}</h2><div class="food-detail-hero">${image?`<img src="${esc(image)}" alt="${esc(f.name)}">`:'<div class="food-placeholder">🥫</div>'}</div><p class="eyebrow">${esc(audience)}</p><p class="muted">${f.form==='wet'?'Влажный корм':'Сухой корм'}</p><div class="food-detail-rows"><div><span>Ориентир цены</span><b>${f.pricePerKg?'≈ '+esc(f.pricePerKg)+' ₽ / кг':'Не указана'}</b></div><div><span>Стоимость дня</span><b>${p&&f.kcalPer100g?'≈ '+dailyGrams(p,f)+' ₽':'Нужны данные'}</b></div></div>${ok?`<div class="mint-card card"><h3>Подойдёт ли ${p?.species==='cat'?'вашей кошке':'вашему питомцу'}?</h3><p>Подходит породе «${esc(breed)}»</p></div>`:`<div class="warning-card card"><h3>Состав требует проверки</h3><p>Сверьте состав корма с ограничениями питомца.</p></div>`}<h3>Состав и питательные показатели</h3><p class="food-nutrition">${esc(nutrition||'Данные не указаны')}</p><p>${esc(f.composition||'Состав пока не внесён.')}</p><p class="muted">Обновление состава: ноябрь 2026.</p><div class="form-actions"><button class="soft-button" onclick="compareFoodWeb('${esc(f.id)}')">Сравнить</button><button class="soft-button" onclick="toast('Проверьте этикетку на упаковке')">Этикетка</button></div>${isPrimary?`<button class="soft-button full" onclick="removePrimaryFoodWeb()">Убрать из рациона</button>`:isSecondary?`<button class="soft-button full" onclick="removeSecondaryFood()">Убрать второй корм</button>`:`<button class="primary full" onclick="${p&&primary&&f.form!==primary.form?`addSecondaryFoodWeb('${esc(f.id)}')`:`selectFood('${esc(f.id)}')`}" data-add-ration="${esc(f.id)}" type="button">${p&&primary&&f.form!==primary.form?'Добавить вторым кормом':'Добавить в рацион'}</button>`}</div>`)
};
// A food is considered selected only after the user explicitly confirms that exact food.
// This also clears stale selections left by older builds or demo data.
state.foodChoiceSource=state.foodChoiceSource&&typeof state.foodChoiceSource==='object'?state.foodChoiceSource:{};
state.foodChoiceConfirmed=state.foodChoiceConfirmed&&typeof state.foodChoiceConfirmed==='object'?state.foodChoiceConfirmed:{};
Object.keys(state.selectedFoods||{}).forEach(petId=>{
  const selected=state.selectedFoods[petId];
  if(selected&&selected!=='__not_selected__'&&state.foodChoiceSource[petId]!==selected){
    state.selectedFoods[petId]='__not_selected__';
    delete state.foodChoiceConfirmed[petId];
  }
});
save();
window.selectFood=function(id){
  const p=activePet();
  if(!p){toast('Сначала добавьте питомца');petForm();return}
  const f=foodById(id);
  if(!f){toast('Корм не найден в базе');return}
  const now=new Date().toISOString();
  state.selectedFoods=Object.assign({},state.selectedFoods,{[p.id]:id});
  state.foodChoiceConfirmed=Object.assign({},state.foodChoiceConfirmed,{[p.id]:id});
  state.foodChoiceSource=Object.assign({},state.foodChoiceSource,{[p.id]:id});
  state.foodSetAt=Object.assign({},state.foodSetAt,{[p.id]:now});
  save();
  const dialog=$('modal');
  if(dialog&&dialog.open)dialog.close();
  tab='today';
  toast('Корм добавлен в рацион: '+f.brand+' '+f.name);
  render();
};
document.addEventListener('click',function(event){
  const button=event.target.closest&&event.target.closest('[data-add-ration]');
  if(!button)return;
  event.preventDefault();
  event.stopPropagation();
  window.selectFood(button.getAttribute('data-add-ration'));
},true);
let parityFilterDraft={form:'all',budget:'all',brand:''};
window.toggleParityFilter=(kind,value)=>{parityFilterDraft[kind]=value;document.querySelectorAll(`[data-pfilter="${kind}"]`).forEach(x=>x.classList.toggle('active',x.dataset.value===value))};
window.applyParityFilters=()=>{state.foodFilters={form:parityFilterDraft.form,budget:parityFilterDraft.budget!=='all',brand:parityFilterDraft.brand};save();modal.close();render()};
function filtersModalAppParity(){
  const f=state.foodFilters||{};parityFilterDraft={form:f.form||'all',budget:f.budget?'budget':'all',brand:f.brand||''};
  const brands=[...new Set(catalog.map(x=>x.brand).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ru'));
  const chip=(kind,value,label,active)=>`<button class="chip ${active?'active':''}" data-pfilter="${kind}" data-value="${esc(value)}" onclick="toggleParityFilter('${kind}','${esc(value)}')">${esc(label)}</button>`;
  openModal(`<div class="filter-parity"><div class="pet-menu-back" onclick="modal.close()">‹ <span>NutriPate</span></div><h2>Фильтры</h2><h3>Тип корма</h3><div class="chips">${chip('form','all','Все',parityFilterDraft.form==='all')}${chip('form','dry','Сухой',parityFilterDraft.form==='dry')}${chip('form','wet','Влажный',parityFilterDraft.form==='wet')}</div><h3>Бюджет в день</h3><div class="chips">${chip('budget','all','Любой',parityFilterDraft.budget==='all')}${chip('budget','40','до 40 ₽',false)}${chip('budget','70','до 70 ₽',false)}${chip('budget','120','до 120 ₽',false)}</div><h3>Бренд</h3><div class="chips brand-filter-chips">${chip('brand','','Любой',!parityFilterDraft.brand)}${brands.map(b=>chip('brand',b,b,parityFilterDraft.brand===b)).join('')}</div><p class="muted filter-note">Бюджет ограничивает цену, а не качество. Подбор учитывает профиль питомца.</p><button class="primary full" onclick="applyParityFilters()">Применить фильтры</button></div>`)
}
filtersModal=filtersModalAppParity;
function compareModalAppParity(){
  const foods=(state.favorites||[]).map(foodById).filter(Boolean).slice(0,2);
  if(foods.length<2)return toast('Добавьте в избранное хотя бы два корма');
  const metric=(label,key,unit='')=>`<div class="compare-metric"><span>${label}</span>${foods.map(f=>`<b>${f[key]!=null?esc(f[key]):'—'}${unit}</b>`).join('')}</div>`;
  openModal(`<div class="compare-parity"><div class="pet-menu-back" onclick="modal.close();tab='foods';render()">‹ <span>NutriPate</span></div><p class="muted">${foods.length} корма · одна и та же порция по профилю</p><div class="compare-foods">${foods.map(f=>`<article><div class="compare-food-image">${foodImage(f)?`<img src="${esc(foodImage(f))}" alt="">`:'🥫'}</div><h3>${esc(f.name)}</h3><p>${esc(f.brand)}</p></article>`).join('')}</div>${metric('Белок','proteinPer100g','%')}${metric('Жир','fatPer100g','%')}${metric('Ккал / 100 г','kcalPer100g')}${metric('Состав сверeн','verifiedAt')||''}<div class="card mint-card compare-note"><b>Цена не ставит корм выше</b><p>Порядок в подборе зависит от профиля. Здесь только сравнение избранных кормов.</p></div><button class="primary full" onclick="modal.close()">Готово</button><button class="soft-button full" onclick="modal.close();tab='foods';render()">Назад к кормам</button></div>`)
}
compareModal=compareModalAppParity;
function viewDiaryAppParity(){
  const p=activePet();if(!p)return '<div class="empty">Добавьте питомца, чтобы открыть дневник.</div>';
  if(diaryTab==='weight')return `${title('','Дневник','')}<div class="tabs"><button data-diary="feed">Питание</button><button class="active" data-diary="weight">Вес</button></div>${viewWeightDiary(p)}`;
  const day=state.diaryDay&&state.diaryDay<todayKey()?todayKey():state.diaryDay||todayKey(),dateObj=new Date(`${day}T00:00:00`),dateLabel=`${dateObj.toLocaleDateString('ru-RU',{day:'numeric',month:'long'})}, ${dateObj.toLocaleDateString('ru-RU',{weekday:'long'})}`,entries=state.feedEntries.filter(x=>x.petId===p.id&&x.date===day),feeds=entries.filter(x=>(x.kind||'feed')==='feed'),given=feeds.reduce((a,x)=>a+Number(x.grams||0),0),target=dailyGrams(),history=feeds.length?`<div class="diary-list">${feeds.map(x=>`<div class="diary-meal"><small>${esc(x.time||x.meal||'')}</small><div><b>${esc(x.meal||'Корм')} · ${esc(x.grams||0)} г</b><span>${esc(x.foodName||'Корм')}</span></div></div>`).join('')}</div>`:'<p class="muted diary-empty-text">За этот день записей нет.</p>';
  return `<div class="diary-parity"><div class="screen-title"><p class="eyebrow"></p><h1>Дневник</h1></div><div class="tabs"><button class="active" data-diary="feed">Питание</button><button data-diary="weight">Вес</button></div><div class="day-switch"><button class="icon-button" data-day="-1">‹</button><strong>${dateLabel}</strong><button class="icon-button" data-day="1">›</button></div><section class="card mint-card diary-progress"><small>Выдано сегодня</small><strong>${given} г</strong><div class="progress"><i style="width:${target?Math.min(100,given/target*100):0}%"></i></div><small>${feeds.length} из 3 кормлений</small></section><h2 class="diary-heading">История кормлений</h2>${history}<div class="diary-actions"><button class="soft-button diary-mint-action" data-action="treat">+ Лакомство</button><button class="soft-button diary-mint-action" data-action="note">+ Наблюдение</button></div><button class="kv" data-action="report"><span>Сформировать отчёт</span><span>→</span></button></div>`
}
viewDiary=viewDiaryAppParity;
function petMenuAppParity(){
  const pets=state.pets||[],active=activePet();
  openModal(`<div class="pet-menu-parity"><div class="pet-menu-back" onclick="modal.close()">‹ <span>NutriPate</span></div><h2>Мои питомцы</h2><p class="muted">У каждого свой рацион и дневник.</p>${pets.map(p=>`<button class="pet-menu-card ${p.id===state.activePetId?'selected':''}" onclick="choosePet('${p.id}')"><div><strong>${esc(p.name)}</strong><span>${p.species==='dog'?'Собака':'Кошка'} · ${Number(p.weight||0).toLocaleString('ru-RU',{minimumFractionDigits:1,maximumFractionDigits:1})} кг</span><em>${p.id===state.activePetId?'Выбран':'Выбрать'}</em></div><img src="${petPhoto(p)}" alt=""></button>`).join('')||'<p class="empty">Питомцев пока нет.</p>'}<button class="primary full" onclick="modal.close();petForm()">Добавить питомца</button>${active?`<button class="soft-button full pet-menu-edit" onclick="modal.close();petForm(state.pets.find(x=>x.id==='${active.id}'))">Редактировать ${esc(active.name)}</button>`:''}</div>`)
}
petMenu=petMenuAppParity;
$('petSwitcher').onclick=()=>{tab='pets';render()};
function viewFoodsAppParity(){
  const p=activePet(),species=p?.species==='dog'?'собаки':'кошки';
  const rows=recommendedFoods(p).filter(x=>{const f=x.food;return(!query||`${f.brand} ${f.name} ${f.composition||''}`.toLowerCase().includes(query.toLowerCase()))&&(foodFilter==='all'||(foodFilter==='fav'?state.favorites.includes(f.id):f.form===foodFilter))}).slice(0,foodLimitWeb);
  const weight=rows.filter(x=>x.rec?.group==='weight');
  const list=weight.length?weight:rows;
  return `<div class="food-parity"><div class="screen-title"><p class="eyebrow"></p><h1>Корма для ${species}</h1></div><input class="search" id="foodSearch" value="${esc(query)}" placeholder="Название, бренд или состав"><div class="chips food-parity-tabs"><button class="chip active" data-filter="all">${species.charAt(0).toUpperCase()+species.slice(1)}</button><button class="chip ${foodFilter==='dry'?'active':''}" data-filter="dry">Сухой</button><button class="chip ${foodFilter==='wet'?'active':''}" data-filter="wet">Влажный</button><button class="chip" data-action="filters">Фильтры</button><button class="chip food-favorite-chip" data-filter="fav">♡</button></div><p class="muted food-parity-intro">Лучшие, хорошие и бюджетные — по профилю. Цена кормов выше не поднимается.</p><section class="recommendation-section food-parity-section"><h2>Для контроля веса</h2><p class="muted">Меньше калорий, разные марки.</p><div class="food-list">${list.map(x=>foodCard(x.food)).join('')||'<div class="empty">Подходящих вариантов пока нет.</div>'}</div></section><p class="muted food-parity-database">В базе ${catalog.length} кормов. Состав сверяли 13 ноября 2026. В списке — подобранные группы, поиск идёт по всей базе.</p><div class="food-parity-footer"><button class="kv" data-action="manual"><span>Своего корма нет в базе</span><span>→</span></button><button class="kv" data-action="compare"><span>Сравнить избранные</span><span>→</span></button></div></div>`
}
viewFoods=viewFoodsAppParity;

// Safety gate for therapeutic recommendations. The web client mirrors the
// Python matcher: strict diagnoses never fall through to ordinary food.
const strictCodesWeb=new Set(['ckd','liver','diabetes','heart','urolithiasis','gi']);
const medicalAliasWeb={renal:'ckd',hepatic:'liver',gastrointestinal:'gi',urinary:'urolithiasis',obesity:'overweight',joint:'joints'};
const medicalCodeWeb=f=>[...(f?.tags||[])].filter(t=>String(t).startsWith('medical:')).map(t=>medicalAliasWeb[t.slice(8)]||t.slice(8));
const strictProfileWeb=p=>{const d=(p?.diagnoses||['healthy']).map(x=>String(x).toLowerCase()).filter(x=>x!=='healthy'&&strictCodesWeb.has(x));return {codes:d,blocked:d.length>1||d.length>0&&Number(p?.ageMonths||24)<3}};
const foodRecommendationBeforeSafety=foodRecommendation;
foodRecommendation=function(f,p=activePet()){
  const strict=strictProfileWeb(p);
  if(strict.blocked)return null;
  if(strict.codes.length){
    const codes=medicalCodeWeb(f);
    if(f?.therapeutic!==true||!strict.codes.every(code=>codes.includes(code)))return null;
  }
  const rec=foodRecommendationBeforeSafety(f,p);
  if(!rec)return null;
  if(strict.codes.length){
    rec.group='medical';
    rec.badge='Ветеринарная диета';
    rec.reason=`Рекомендован потому, что это ветеринарная диета для: ${strict.codes.map(x=>({ckd:'почек',liver:'печени',diabetes:'диабета',heart:'сердца',urolithiasis:'мочевыделительной системы',gi:'ЖКТ'})[x]||x).join(', ')}. Обычные корма скрыты.`;
    rec.explanation=rec.reason;
  }else if(!rec.reason)rec.reason='Рекомендован по виду, возрасту, активности и составу.';
  return rec;
};
const viewFoodsBeforeSafety=viewFoods;
viewFoods=function(){
  const p=activePet(),strict=strictProfileWeb(p);
  if(strict.blocked)return `${title('КАТАЛОГ','Корма','Нужна консультация ветеринара')}<div class="warning-card card"><h2>Автоматический подбор заблокирован</h2><p>${strict.codes.length>1?'Указано несколько строгих диагнозов. Нужен единый план питания от ветеринара.':'Для животного младше 3 месяцев со строгим диагнозом автоматическая рекомендация небезопасна.'}</p><p>Обычные корма не показываются.</p></div>`;
  return viewFoodsBeforeSafety();
};

// Canonical backend bridge. The UI renders this response; it does not own
// recommendation or feeding formulas. Set NUTRIPATE_API_BASE to the deployed
// backend origin in production.
// The public web build must never probe localhost: on a phone, 127.0.0.1 is
// the phone itself and the timeout makes the first screen feel frozen.
window.NUTRIPATE_API_BASE=window.NUTRIPATE_API_BASE||'';
let canonicalCalculation=null,canonicalRequestKey='';
function canonicalProfileKey(p,selectedId,treats){return JSON.stringify({p,selectedId,treats})}
function todayTreatKcal(p){return (state.feedEntries||[]).filter(x=>x.petId===p?.id&&x.date===todayKey()&&x.kind==='treat').reduce((s,x)=>s+Number(x.kcal||0),0)}
async function syncCanonicalEngine(p=activePet()){
  if(!p)return;
  const selectedId=state.selectedFoods?.[p.id]||null,treats=todayTreatKcal(p),key=canonicalProfileKey(p,selectedId,treats);
  if(key===canonicalRequestKey)return;
  canonicalRequestKey=key;
  const canonicalBase=String(window.NUTRIPATE_API_BASE||'').trim();
  if(!canonicalBase)return;
  try{
    const entry=breedData({id:p.breedId,name:p.breed});
    const canonicalPet=Object.assign({},p,{weightKg:petWeight(p),targetWeightKg:petTargetWeight(p),ageMonths:ageMonths(p)});
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),1500);
    const response=await fetch(`${window.NUTRIPATE_API_BASE}/v1/calculate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pet:canonicalPet,breed:entry,selected_food_id:selectedId,treats_kcal:treats}),signal:controller.signal}).finally(()=>clearTimeout(timeout));
    if(!response.ok)throw new Error(`backend ${response.status}`);
    canonicalCalculation=await response.json();
    window.nutripateCanonicalCalculation=canonicalCalculation;
    render();
  }catch(error){
    canonicalCalculation=null;
    window.nutripateBackendError='Сервер рекомендаций недоступен';
  }
}
const recommendedFoodsBeforeCanonical=recommendedFoods;
recommendedFoods=function(p=activePet()){
  const rows=canonicalCalculation?.all;
  return rows&&canonicalCalculation.engine_version?rows:recommendedFoodsBeforeCanonical(p);
};
const foodRecommendationBeforeCanonical=foodRecommendation;
foodRecommendation=function(f,p=activePet()){
  const row=(canonicalCalculation?.all||[]).find(x=>x.food?.id===f?.id);
  return row?.score!=null?row:foodRecommendationBeforeCanonical(f,p);
};
const dailyGramsBeforeCanonical=dailyGrams;
dailyGrams=function(p=activePet(),food=chosenFood()){
  const localValue=dailyGramsBeforeCanonical(p,food);
  const plan=canonicalCalculation?.feeding_plan;
  const remoteValue=Number(plan?.grams_day);
  if(plan&&food&&plan.food_id===food.id&&Number.isFinite(remoteValue)&&remoteValue===localValue)return remoteValue;
  return localValue;
};
const kcalNeedBeforeCanonical=kcalNeed;
kcalNeed=function(p=activePet()){const localValue=kcalNeedBeforeCanonical(p),value=Number(canonicalCalculation?.feeding_plan?.kcal_day);return Number.isFinite(value)&&value>0&&value===localValue?value:localValue};
const renderBeforeCanonicalSync=render;
render=function(){
  renderBeforeCanonicalSync();
  const p=activePet();
  if(p)syncCanonicalEngine(p);
};
render();

(function () {
  const apiBase = () => window.NUTRIPATE_API_BASE || "http://127.0.0.1:8765";
  state.account = Object.assign({ token: "", email: "", name: "" }, state.account || {});

  function petToCloud(pet) {
    const item = Object.assign({}, pet);
    const weight = item.weightKg != null ? item.weightKg : item.weight;
    if (weight != null) {
      item.weight = weight;
      item.weightKg = weight;
    }
    const target = item.targetWeightKg != null ? item.targetWeightKg : item.targetWeight;
    item.targetWeight = target;
    item.targetWeightKg = target;
    return item;
  }

  function cloudPayload() {
    const copy = JSON.parse(JSON.stringify(state));
    delete copy.account;
    delete copy.authScreen;
    if (Array.isArray(copy.pets)) copy.pets = copy.pets.map(petToCloud);
    return copy;
  }

  function applyCloud(doc) {
    const account = state.account;
    const screen = state.authScreen;
    // An empty cloud document is a real empty account. Do not merge another
    // user's local pets, food or diary into it.
    const next = Object.assign({
      pets: [], activePetId: null,
      owner: { name: "", email: "", privacyConsent: false },
      selectedFoods: {}, favorites: [], feedEntries: [], weights: [], diaryDay: todayKey(),
    }, doc || {});
    next.account = account;
    next.authScreen = screen;
    const gone = new Set([].concat(next.removedPetIds || [], Object.keys(next.petTombstones || {})));
    next.pets = (doc.pets || []).map((pet) => normalizePet(petToCloud(pet))).filter((pet) => !gone.has(String(pet.id)));
    if (next.pets.length && !next.activePetId) next.activePetId = next.pets[0].id;
    if (next.pets.length) next.onboardingDone = true;
    state = next;
  }

  function supabaseConfig() {
    const cfg = window.NUTRIPATE_SUPABASE;
    return cfg && cfg.url && cfg.key ? cfg : null;
  }

  function userIdFromToken(token) {
    const part = String(token || "").split(".")[1] || "";
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
    return JSON.parse(atob(padded)).sub;
  }

  function supabaseMessage(data) {
    const raw = (data && (data.msg || data.error_description || data.message || data.error)) || "Supabase отклонил запрос.";
    const text = String(raw);
    if (/expired|invalid/i.test(text) && /token|otp/i.test(text)) return "Неверный или просроченный код.";
    if (/rate limit/i.test(text)) return "Слишком много писем. Подождите немного и запросите код снова.";
    if (/confirmation email|error sending/i.test(text)) return "Письмо не ушло: Яндекс не принял пароль почты NutriPate@yandex.ru. В Supabase откройте Authentication → Emails → SMTP Settings и вставьте пароль приложения Яндекса.";
    if (/not found/i.test(text)) return "Аккаунт с этой почтой не найден. Сначала зарегистрируйтесь.";
    return text;
  }

  async function supabaseFetch(path, options) {
    const cfg = supabaseConfig();
    const headers = Object.assign({
      "Content-Type": "application/json",
      apikey: cfg.key,
      Authorization: "Bearer " + ((options && options.token) || state.account.token || cfg.key),
    }, (options && options.headers) || {});
    let response;
    try {
      response = await fetch(cfg.url + path, { method: (options && options.method) || "GET", headers, body: options && options.body });
    } catch (error) {
      throw new Error("Supabase недоступен. Проверьте интернет.");
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(supabaseMessage(data));
    return data;
  }

  async function supabaseApi(path, options) {
    const body = options && options.body ? JSON.parse(options.body) : {};
    if (path.endsWith("request-code")) {
      const register = body.purpose === "register";
      const payload = { email: body.email, create_user: register };
      if (register && body.name) payload.data = { display_name: body.name, privacy_consent: true };
      await supabaseFetch("/auth/v1/otp", { method: "POST", body: JSON.stringify(payload), token: "" });
      return { ok: true };
    }
    if (path.endsWith("verify-code")) {
      const register = body.purpose === "register";
      if (register && String(body.name || "").trim().length < 2) throw new Error("Укажите имя.");
      if (register && !body.privacyConsent) throw new Error("Нужно согласие на обработку персональных данных.");
      const result = await supabaseFetch("/auth/v1/verify", {
        method: "POST",
        token: "",
        body: JSON.stringify({ email: body.email, token: String(body.code || "").trim(), type: "email" }),
      });
      if (!result.access_token) throw new Error("Неверный или просроченный код.");
      const user = result.user || {};
      const name = String(body.name || (user.user_metadata && user.user_metadata.display_name) || "").trim();
      if (register) {
        await supabaseFetch("/auth/v1/user", {
          method: "PUT",
          token: result.access_token,
          body: JSON.stringify({ data: { display_name: name, privacy_consent: true } }),
        });
        await supabaseFetch("/rest/v1/profiles?on_conflict=user_id", {
          method: "POST",
          token: result.access_token,
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({
            user_id: user.id,
            display_name: name,
            email: user.email || body.email,
            privacy_consent_at: new Date().toISOString(),
          }),
        });
      }
      return { token: result.access_token, user: { id: user.id, email: user.email || body.email, name } };
    }
    if (path === "/api/me/state" && (!options || !options.method || options.method === "GET")) {
      const userId = userIdFromToken(state.account.token);
      const rows = await supabaseFetch("/rest/v1/app_states?select=state,updated_at&user_id=eq." + encodeURIComponent(userId) + "&limit=1");
      const row = Array.isArray(rows) ? rows[0] : null;
      return { state: (row && row.state) || {}, updatedAt: row ? row.updated_at : null };
    }
    if (path === "/api/me/state") {
      const current = await supabaseApi("/api/me/state");
      const next = Object.assign({}, current.state || {}, body);
      next.updatedAt = new Date().toISOString();
      await supabaseFetch("/rest/v1/app_states?on_conflict=user_id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ user_id: userIdFromToken(state.account.token), state: next, updated_at: next.updatedAt }),
      });
      return { ok: true, state: next, updatedAt: next.updatedAt };
    }
    throw new Error("Запрос к Supabase не поддержан.");
  }

  async function api(path, options) {
    if (supabaseConfig() && path.indexOf("/v1/calculate") !== 0) return supabaseApi(path, options);
    const headers = Object.assign({ "Content-Type": "application/json" }, (options && options.headers) || {});
    if (state.account.token) headers.Authorization = "Bearer " + state.account.token;
    let response;
    try {
      response = await fetch(apiBase() + path, Object.assign({}, options, { headers }));
    } catch (error) {
      throw new Error("Сервер аккаунтов недоступен. Запустите backend.");
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Сервер аккаунтов отклонил запрос.");
    return data;
  }

  let pushTimer = 0;
  let cloudSyncTimer = 0;
  let cloudSyncBusy = false;
  let cloudHydrated = false;
  const cloudMoment = value => {
    const time = Date.parse(String(value || ""));
    return Number.isFinite(time) ? time : 0;
  };
  async function pullCloudState() {
    if (SYNC_FROZEN || !state.account?.token || state._applyingCloud || cloudSyncBusy) return;
    cloudSyncBusy = true;
    try {
      const remote = await api("/api/me/state");
      const remoteState = remote?.state || {};
      const remoteAt = cloudMoment(remote.updatedAt || remoteState.updatedAt);
      const localAt = cloudMoment(state.updatedAt);
      // The first successful pull after login must always replace the local
      // demo/cache state. Otherwise a newer local timestamp can hide the
      // account state, including the selected food and feeding norm.
      if (!cloudHydrated || remoteAt > localAt) {
        state._applyingCloud = true;
        window.nutripateApplyingCloud = true;
        applyCloud(remoteState);
        state.updatedAt = remote.updatedAt || remoteState.updatedAt || new Date().toISOString();
        save();
        state._applyingCloud = false;
        window.nutripateApplyingCloud = false;
        render();
      }
      cloudHydrated = true;
      await pullPetRows();
    } catch (error) {
      // Offline is allowed; the local copy remains available until the next poll.
    } finally {
      cloudSyncBusy = false;
    }
  }
  async function pullPetRows() {
    if (SYNC_FROZEN || !state.account?.token || typeof window.nutripateApplyRemote !== 'function') return;
    const rows = await supabaseFetch('/rest/v1/pets?select=*&order=updated_at.desc');
    if (!Array.isArray(rows)) return;
    window.nutripateApplyRemote(rows.map((row) => ({ table: 'pets', new: row })));
  }
  function startCloudSync() {
    clearInterval(cloudSyncTimer);
    if (SYNC_FROZEN || !state.account?.token) return;
    if (typeof window.nutripateListen === 'function') window.nutripateListen();
    pullCloudState();
    if (window.NUTRIPATE_REALTIME) return;
    cloudSyncTimer = setInterval(pullCloudState, 4000);
  }
  window.nutripateStartCloudSync = startCloudSync;
  window.nutripateAccountToken = () => (state.account && state.account.token) || '';
  window.nutripateAfterSave = function () {
    if (SYNC_FROZEN || !state.account.token || state._applyingCloud) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(async () => {
      if (cloudSyncBusy) return;
      cloudSyncBusy = true;
      try {
        const remote = await api("/api/me/state");
        const remoteAt = cloudMoment(remote?.updatedAt || remote?.state?.updatedAt);
        const localAt = cloudMoment(state.updatedAt);
        if (remoteAt > localAt) {
          state._applyingCloud = true;
          window.nutripateApplyingCloud = true;
          applyCloud(remote.state || {});
          state.updatedAt = remote.updatedAt || remote.state?.updatedAt || new Date().toISOString();
          save();
          state._applyingCloud = false;
          window.nutripateApplyingCloud = false;
          render();
          return;
        }
        const result = await api("/api/me/state", { method: "PUT", body: JSON.stringify(cloudPayload()) });
        if (result?.updatedAt) {
          state._applyingCloud = true;
          state.updatedAt = result.updatedAt;
          save();
          state._applyingCloud = false;
        }
      } catch (error) {
        /* локальная копия уже записана */
      } finally {
        cloudSyncBusy = false;
      }
    }, 300);
  };

  function authView() {
    const login = state.authScreen !== "register";
    return `<section class="auth-screen"><div class="form">
      <h1>${login ? "Вход" : "Регистрация"}</h1>
      <p class="muted">${login ? "Почта и одноразовый код. Пароль не нужен." : "Имя, почта, одноразовый код и согласие на обработку персональных данных."}</p>
      ${login ? "" : `<label>Имя<input id="authName" value="${esc(state.authName || "")}" placeholder="Как к вам обращаться"></label>`}
      <label>Электронная почта<input id="authEmail" type="email" value="${esc(state.authEmail || "")}" placeholder="name@example.com"></label>
      ${login ? "" : `<label class="consent-row"><input id="authConsent" type="checkbox" ${state.authConsent ? "checked" : ""}><span>Я согласен(на) на обработку персональных данных</span></label><a class="policy-link" href="privacy-policy.pdf" target="_blank" rel="noopener">Открыть политику обработки данных</a>`}
      <button class="soft-button" id="authRequest" type="button">Получить код</button>
      <label>Одноразовый код<input id="authCode" inputmode="numeric" maxlength="6" value="${esc(state.authCode || "")}" placeholder="6 цифр"></label>
      ${state.authHint ? `<p class="auth-hint">${esc(state.authHint)}</p>` : ""}
      ${state.authError ? `<p class="auth-error">${esc(state.authError)}</p>` : ""}
      <button class="primary" id="authSubmit" type="button">${login ? "Войти" : "Создать аккаунт"}</button>
      <button class="link-button" id="authBack" type="button">Назад</button>
    </div></section>`;
  }

  function readAuthFields() {
    const email = document.getElementById("authEmail");
    const name = document.getElementById("authName");
    const code = document.getElementById("authCode");
    const consent = document.getElementById("authConsent");
    if (email) state.authEmail = email.value.trim();
    if (name) state.authName = name.value.trim();
    if (code) state.authCode = code.value.trim();
    if (consent) state.authConsent = consent.checked;
  }

  function bindAuth() {
    const request = document.getElementById("authRequest");
    const submit = document.getElementById("authSubmit");
    const back = document.getElementById("authBack");
    const swap = document.getElementById("authSwitch");
    if (request) request.onclick = requestAuthCode;
    if (submit) submit.onclick = submitAuth;
    if (back) back.onclick = () => { readAuthFields(); state.authScreen = null; render(); };
    if (swap) swap.onclick = () => {
      readAuthFields();
      state.authScreen = state.authScreen === "register" ? "login" : "register";
      state.authError = "";
      render();
    };
  }

  async function requestAuthCode() {
    readAuthFields();
    state.authError = "";
    state.authHint = "";
    try {
      const data = await api("/api/auth/request-code", {
        method: "POST",
        body: JSON.stringify({ email: state.authEmail, purpose: state.authScreen === "register" ? "register" : "login", name: state.authName || "" }),
      });
      state.authHint = data.devCode ? "Код отправлен. Для этой сборки код: " + data.devCode : "Код отправлен на почту.";
    } catch (error) {
      state.authError = error.message;
    }
    render();
  }

  async function submitAuth() {
    readAuthFields();
    const purpose = state.authScreen === "register" ? "register" : "login";
    const previousAccount = Object.assign({}, state.account || {});
    const previousOwnerEmail = String(state.owner?.email || "").trim().toLowerCase();
    const localDraft = JSON.parse(JSON.stringify(state));
    state.authError = "";
    try {
      const data = await api("/api/auth/verify-code", {
        method: "POST",
        body: JSON.stringify({
          email: state.authEmail,
          code: state.authCode,
          purpose,
          name: state.authName || "",
          privacyConsent: Boolean(state.authConsent),
        }),
      });
      state.account = { token: data.token, email: data.user.email, name: data.user.name || "" };
      const remote = SYNC_FROZEN ? { state: JSON.parse(JSON.stringify(localDraft)) } : await api("/api/me/state");
      const cloud = (remote && remote.state) || {};
      const hasCloudData = Boolean(cloud.updatedAt || cloud.savedAt || (cloud.pets || []).length || cloud.owner?.email);
      // Only a brand-new registration may claim the anonymous onboarding draft.
      // Existing accounts always load their own cloud state, including empty state.
      const canClaimDraft = purpose === "register" && !previousAccount.token && !previousOwnerEmail && !hasCloudData;
      if (!canClaimDraft) {
        state._applyingCloud = true;
        applyCloud(cloud);
        state.owner = Object.assign({}, state.owner, { name: data.user.name || state.owner.name || "", email: data.user.email, privacyConsent: true });
        state._applyingCloud = false;
      } else {
        state = Object.assign({}, localDraft, { account: state.account, authScreen: state.authScreen });
        state.owner = Object.assign({}, state.owner, { name: data.user.name || state.owner.name || "", email: data.user.email, privacyConsent: true });
      }
      state.authScreen = null;
      cloudHydrated = canClaimDraft;
      state.authCode = "";
      state.authHint = "";
      save();
      supabaseFetch('/rest/v1/rpc/claim_pending_subscriptions', { method: 'POST', body: '{}' }).catch(() => {});
      startCloudSync();
      toast(SYNC_FROZEN ? "Аккаунт открыт · синхронизация приостановлена" : (state.pets.length ? "Аккаунт открыт, питомцы подтянулись" : (purpose === "register" ? "Аккаунт сохранён" : "Вы вошли")));
    } catch (error) {
      state.authError = error.message;
    }
    render();
  }

  const renderBeforeAccount = render;
  render = function () {
    if (state.authScreen) {
      const nav = document.querySelector(".bottom-nav");
      const switcher = document.getElementById("petSwitcher");
      if (!activePet()) {
        document.querySelector(".app-shell")?.classList.add("no-pet");
        if (nav) { nav.hidden = false; nav.style.setProperty("display", "grid", "important"); nav.style.setProperty("visibility", "visible", "important"); }
        if (switcher) switcher.style.display = "none";
      }
      document.getElementById("appMain").innerHTML = authView();
      bindAuth();
      return;
    }
    renderBeforeAccount();
  };

  const actionsBeforeAccount = actions;
  actions = function (name) {
    if (name === "login") { state.authScreen = "login"; state.authError = ""; render(); return; }
    if (name === "register") { state.authScreen = "register"; state.authError = ""; render(); return; }
    if (name === "logout") {
      cloudHydrated = false;
      state.account = { token: "", email: "", name: "" };
      state.pets = [];
      state.activePetId = null;
      state.selectedFoods = {};
      state.favorites = [];
      state.feedEntries = [];
      state.weights = [];
      state.owner = { name: "", email: "", privacyConsent: false };
      state.onboardingDone = false;
      clearInterval(cloudSyncTimer);
      save();
      toast("Вы вышли из аккаунта");
      render();
      return;
    }
    return actionsBeforeAccount(name);
  };

  const viewMoreBeforeAccount = viewMore;
  viewMore = function () {
    const html = viewMoreBeforeAccount();
    const signed = Boolean(state.account && state.account.token);
    const row = signed
      ? `<button class="kv" data-action="logout"><span>Аккаунт</span><strong>${esc(state.account.email)}</strong><span>Выйти</span></button>`
      : `<button class="kv" data-action="login"><span>Войти</span><strong>Почта и код</strong><span>›</span></button>`;
    return html.replace('<button class="kv" data-action="owner">', row + '<button class="kv" data-action="owner">');
  };
  // One final save handler. Earlier versions wrapped savePet several times;
  // any validation failure in one wrapper silently stopped the whole chain.
  window.savePet = function (id) {
    try {
      const name = $('petInputName')?.value.trim() || '';
      const species = $('petInputSpecies')?.value || 'cat';
      const selectedBreed = $('petInputBreed')?.value || '';
      const age = readNumber('petInputAge');
      const weight = readNumber('petInputWeight');
      const target = readNumber('petInputTarget');
      const sex = $('petInputSex')?.value || 'female';
      const activity = document.querySelector('input[name="activity"]:checked')?.value || 'medium';
      const sterilized = document.querySelector('input[name="sterilized"]:checked')?.value === 'yes';
      const diagnoses = [...document.querySelectorAll('input[name="diagnosis"]:checked')].map(x => x.value);
      const allergens = [...document.querySelectorAll('input[name="allergen"]:checked')].map(x => x.value);
      if (diagnoses.length > 1 && diagnoses.includes('healthy')) diagnoses.splice(diagnoses.indexOf('healthy'), 1);
      if (!diagnoses.length) diagnoses.push('healthy');
      if (!name) return formError('Укажите имя питомца.');
      if (!Number.isFinite(weight) || weight <= 0 || weight > 120) return formError('Вес должен быть от 0,1 до 120 кг.');
      if (!Number.isFinite(age) || age < 0 || age > 360) return formError('Возраст должен быть от 0 до 360 месяцев.');
      if (target !== null && (!Number.isFinite(target) || target <= 0 || target > 120)) return formError('Проверьте целевой вес.');
      if (target !== null && Math.abs(target - weight) > 80) return formError('Целевой вес слишком сильно отличается от текущего.');
      if (!diagnoses.includes('allergy') && allergens.length) return formError('Чтобы указать аллерген, отметьте диагноз «Аллергия».');

      const entry = breedEntries(species).find(x => x.value === selectedBreed || x.id === selectedBreed || x.name === selectedBreed);
      if (!entry) return formError('Выберите породу питомца.');
      const existing = id ? state.pets.find(x => x.id === id) : null;
      const normalized = {
        name, species, breedId: entry.id, breed: entry.name, breedLabel: entry.name,
        sex, ageMonths: Math.round(age), weight, weightKg: weight, targetWeight: target, targetWeightKg: target,
        sterilized, activity, diagnoses, allergens
      };
      const hasUploadedPhoto = typeof petPhotoDraft === 'string' && /^data:image\//i.test(petPhotoDraft);
      if (hasUploadedPhoto) {
        normalized.photo = petPhotoDraft;
        normalized.photoSource = 'user';
      } else if (petPhotoRemoved || window.__nutripatePhotoRemoved) {
        normalized.photo = null;
        normalized.photoSource = 'breed';
      } else if (existing && (existing.photoSource === 'user' || /^data:image\//i.test(existing.photo || ''))) {
        normalized.photo = existing.photo;
        normalized.photoSource = 'user';
      } else {
        normalized.photo = null;
        normalized.photoSource = 'breed';
      }
      const saved = existing || Object.assign({ id: 'pet-' + Date.now() }, normalized);
      if (existing) Object.assign(saved, normalized);
      if (!existing) {
        state.pets.push(saved);
        state.selectedFoods[saved.id] = '__not_selected__';
      }
      state.activePetId = saved.id;
      save();
      petPhotoDraft = null;
      petPhotoRemoved = false;
      window.__nutripatePhotoRemoved = false;
      $('modal')?.close();
      toast('Профиль сохранён');
      render();
    } catch (error) {
      console.error('savePet failed', error);
      formError('Не удалось сохранить профиль. Попробуйте ещё раз.');
    }
  };
  // Keep the native app's three-meal limit and undo action in the web UI.
  const viewTodayFeedGuard = viewToday;
  viewToday = function () {
    let html = viewTodayFeedGuard();
    const feeds = loggedToday();
    if (feeds.length >= 3) {
      html = html.replace(/<button class="primary full" data-action="feed">Покормил<\/button>/g, '<div class="card mint-card"><b>Все три кормления уже записаны</b><p class="muted">Чтобы изменить последнюю запись, отмените её ниже.</p></div>');
    }
    if (feeds.length && !html.includes('data-action="undo-feed"')) {
      html = html.replace(/(<button class="kv" data-action="weight">)/, '<button class="kv danger-row" data-action="undo-feed"><span>Отменить последнее кормление</span><span>›</span></button>$1');
    }
    return html;
  };
  const actionsFeedGuard = actions;
  actions = function (name) {
    if (name === 'feed' && loggedToday().length >= 3) { toast('Все три кормления уже записаны'); return; }
    if (name === 'undo-feed') {
      const feeds = loggedToday();
      const last = feeds[feeds.length - 1];
      if (!last) { toast('Сегодня ещё нет кормлений'); return; }
      const index = state.feedEntries.indexOf(last);
      if (index >= 0) state.feedEntries.splice(index, 1);
      save();
      toast('Последнее кормление отменено');
      render();
      return;
    }
    return actionsFeedGuard(name);
  };
  // Body-condition guide: help the owner make a cautious first assessment
  // before selecting the health flag "Лишний вес".
  const petFormWithBodyConditionGuide = petForm;
  petForm = function (raw) {
    petFormWithBodyConditionGuide(raw);
    const form = document.querySelector('#modalContent .pet-form');
    const sterilization = [...(form?.querySelectorAll('.form-section') || [])]
      .find(section => section.textContent.includes('Стерилизация'));
    const health = [...(form?.querySelectorAll('.form-section') || [])]
      .find(section => section.textContent.includes('Здоровье и аллергии'));
    if (!form || !sterilization || !health || form.querySelector('.body-condition-guide')) return;
    const species = document.querySelector('#petInputSpecies')?.value || raw?.species || 'cat';
    const image = species === 'dog' ? 'assets/body-condition-dog.png' : 'assets/body-condition-cat.png';
    const imageAlt = species === 'dog' ? 'Шкала оценки упитанности собаки от худобы до ожирения' : 'Шкала оценки телосложения кошки от худобы до ожирения';
    sterilization.insertAdjacentHTML('afterend', `<details class="body-condition-guide"><summary><span>Как понять, есть ли лишний вес?</span><span class="body-condition-chevron">›</span></summary><div class="body-condition-content"><p class="body-condition-lead">Это только ориентир, а не диагноз. Посмотрите на питомца сверху и сбоку, лучше не сразу после еды.</p><figure class="body-condition-figure"><img id="bodyConditionImage" src="${image}" alt="${imageAlt}"><figcaption>Сравните форму тела с примерами на шкале.</figcaption></figure><ol><li>Проведите ладонью по рёбрам: они должны прощупываться под тонким слоем жира, без сильного надавливания.</li><li>Сверху должна быть заметна талия, а сбоку живот — немного подтянут.</li><li>Если рёбра почти не прощупываются, талия исчезла, а живот округлился или свисает — отметьте «Лишний вес» и обсудите вес с ветеринаром.</li></ol><p class="body-condition-note">Порода, длинная шерсть и особенности телосложения могут обмануть взгляд. Если сомневаетесь, лучше ориентироваться на осмотр и взвешивание у врача.</p></div></details>`);
    const speciesInput = document.querySelector('#petInputSpecies');
    const updateBodyConditionImage = () => {
      const dog = speciesInput?.value === 'dog';
      const bodyImage = document.querySelector('#bodyConditionImage');
      if (bodyImage) {
        bodyImage.src = dog ? 'assets/body-condition-dog.png' : 'assets/body-condition-cat.png';
        bodyImage.alt = dog ? 'Шкала оценки упитанности собаки от худобы до ожирения' : 'Шкала оценки телосложения кошки от худобы до ожирения';
      }
    };
    speciesInput?.addEventListener('change', updateBodyConditionImage);
  };
  const petFormWithReadableBodyGuide = petForm;
  petForm = function (raw) {
    petFormWithReadableBodyGuide(raw);
    const guide = document.querySelector('#modalContent .body-condition-guide');
    if (!guide || guide.querySelector('.body-condition-steps')) return;
    guide.querySelector('.body-condition-figure')?.remove();
    const lead = guide.querySelector('.body-condition-lead');
    if (lead) lead.textContent = 'Проверьте три простых признака. Это ориентир, а не диагноз.';
    const list = guide.querySelector('ol');
    if (list) list.insertAdjacentHTML('beforebegin', '<div class="body-condition-steps"><div><b>1. Рёбра</b><span>Прощупываются ладонью, но не выступают наружу.</span></div><div><b>2. Талия</b><span>Если смотреть сверху, за рёбрами заметно сужение.</span></div><div><b>3. Живот</b><span>Если смотреть сбоку, он немного подтянут, а не округлён и не свисает.</span></div></div>');
  };
  // The map is embedded into the web app. It reuses the same 4 Лапы dataset
  // and the same lightweight tile/cluster interaction as the desktop app.
  const viewFoodsBeforeStoreMap = viewFoods;
  viewFoods = function () {
    const card='<button class="store-map-card" data-action="store-map" type="button"><span class="store-map-icon" aria-hidden="true">⌖</span><span><b>Магазины 4 Лапы</b><small>Карта магазинов встроена в приложение.</small><em>Россия · 675 точек 4 Лапы</em></span><strong>Открыть карту&nbsp;›</strong></button>';
    const html=viewFoodsBeforeStoreMap();
    return html.includes('food-parity-intro')?html.replace(/(<p class="muted food-parity-intro">)/,card+'$1'):html+card;
  };
  const actionsBeforeStoreMap = actions;
  actions = function (name) {
    if (name === 'store-map') {
      openModal('<div class="store-map-modal"><div class="store-map-modal-head"><div><h2>Магазины 4 Лапы</h2><p>Нажмите на точку, чтобы увидеть адрес</p></div><button class="icon-button" type="button" onclick="modal.close()" aria-label="Закрыть">×</button></div><iframe class="store-map-frame" src="store-map.html?v=20261125-geo1" title="Карта магазинов 4 Лапы" loading="eager"></iframe></div>');
      return;
    }
    return actionsBeforeStoreMap(name);
  };
  window.nutripateApplyRemote = function (events) {
    const moment = value => {
      const time = Date.parse(String(value || ''));
      return Number.isFinite(time) ? time : 0;
    };
    let changed = false;
    events.forEach((event) => {
      const row = event.new || {};
      if (event.table === 'subscriptions' && row.status === 'active' && moment(row.ends_at) > Date.now()) {
        state.pro = true;
        state.proUntil = row.ends_at;
        state.proPlan = row.plan_code || state.proPlan;
        changed = true;
      }
      if (event.table !== 'pets') return;
      const id = String(row.client_id || '');
      if (!id) return;
      state.pets = Array.isArray(state.pets) ? state.pets : [];
      const index = state.pets.findIndex((pet) => String(pet.id) === id);
      if (row.deleted_at) {
        const alreadyGone = index < 0 && state.petTombstones && state.petTombstones[id];
        state.petTombstones = Object.assign({}, state.petTombstones, { [id]: row.deleted_at });
        state.removedPetIds = Array.from(new Set([].concat(state.removedPetIds || [], [id])));
        if (index >= 0) state.pets.splice(index, 1);
        if (String(state.activePetId) === id) state.activePetId = state.pets[0] ? state.pets[0].id : null;
        if (!alreadyGone) changed = true;
        return;
      }
      const local = index >= 0 ? state.pets[index] : null;
      if (local && moment(local.updatedAt) > moment(row.updated_at)) return;
      if (local && moment(row.updated_at) > 0 && moment(local.updatedAt) === moment(row.updated_at)) return;
      const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
      const next = normalizePet(Object.assign({}, payload, {
        id, name: row.name, species: row.species || payload.species, breed: row.breed || payload.breed,
        breedId: row.breed_id || payload.breedId, weightKg: row.weight_kg, weight: row.weight_kg,
        ageMonths: row.age_months, activity: row.activity_level || payload.activity, sterilized: row.sterilized,
        diagnoses: row.diagnoses || payload.diagnoses || [], allergens: row.allergens || payload.allergens || [],
        targetWeightKg: row.target_weight_kg, kcalAdjust: row.kcal_adjust, updatedAt: row.updated_at,
        photo: (local && local.photo) || payload.photo || null,
      }));
      if (index >= 0) state.pets[index] = next;
      else state.pets.push(next);
      changed = true;
    });
    if (!changed) return;
    state._applyingCloud = true;
    window.nutripateApplyingCloud = true;
    save();
    state._applyingCloud = false;
    window.nutripateApplyingCloud = false;
    render();
  };
  window.nutripatePushPets = function () {
    const access = window.nutripateAccountToken();
    const cfg = window.NUTRIPATE_SUPABASE;
    if (!access || !cfg || state._applyingCloud) return;
    let uid = '';
    try {
      const part = access.split('.')[1] || '';
      uid = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((part.length + 3) % 4))).sub || '';
    } catch (error) { return; }
    const rows = (state.pets || []).filter((pet) => pet && pet.id).map((pet) => {
      const payload = Object.assign({}, pet);
      if (String(payload.photo || '').startsWith('data:')) delete payload.photo;
      return {
        user_id: uid, client_id: String(pet.id), name: pet.name || 'Питомец', species: pet.species || null,
        breed: pet.breed || pet.breedLabel || null, breed_id: pet.breedId || null,
        weight_kg: pet.weightKg != null ? pet.weightKg : pet.weight, age_months: pet.ageMonths != null ? pet.ageMonths : null,
        activity_level: pet.activity || null, sterilized: Boolean(pet.sterilized), diagnoses: pet.diagnoses || [],
        allergens: pet.allergens || [], target_weight_kg: pet.targetWeightKg != null ? pet.targetWeightKg : null,
        kcal_adjust: Number(pet.kcalAdjust) || 0, payload, updated_at: pet.updatedAt || new Date().toISOString(), deleted_at: null,
      };
    });
    Object.keys(state.petTombstones || {}).forEach((id) => rows.push({
      user_id: uid, client_id: id, name: 'Удалён', payload: {}, updated_at: state.petTombstones[id], deleted_at: state.petTombstones[id],
    }));
    if (!rows.length) return;
    fetch(cfg.url.replace(/\/$/, '') + '/rest/v1/pets?on_conflict=user_id,client_id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: cfg.key, Authorization: 'Bearer ' + access, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows),
    }).catch(() => {});
  };
  startCloudSync();
})();

// Reflect the selected pet photo in the compact photo action.
function updatePetPhotoVisual(){
  const placeholder=document.querySelector('#modalContent .pet-photo-row .pet-paw-placeholder');
  if(!placeholder)return;
  if(!placeholder.dataset.defaultMarkup)placeholder.dataset.defaultMarkup=placeholder.innerHTML;
  const hasPhoto=typeof petPhotoDraft==='string'&&petPhotoDraft.length>0&&!petPhotoRemoved&&!window.__nutripatePhotoRemoved;
  placeholder.classList.toggle('has-photo',hasPhoto);
  const row=placeholder.closest('.pet-photo-row');
  const clearButton=row?.querySelector('.photo-clear-inline');
  if(hasPhoto&&!clearButton)row?.insertAdjacentHTML('beforeend','<button type="button" class="link-button photo-clear-inline">Убрать фото</button>');
  if(!hasPhoto)clearButton?.remove();
  if(hasPhoto){
    placeholder.innerHTML=`<img class="pet-photo-thumb" src="${esc(petPhotoDraft)}" alt="Фото питомца">`;
  }else{
    placeholder.innerHTML=placeholder.dataset.defaultMarkup;
  }
}
const petPhotoHandlerWithVisual=handlePetPhoto;
handlePetPhoto=function(file){petPhotoHandlerWithVisual(file);setTimeout(updatePetPhotoVisual,0)};
const petFormWithPhotoVisual=petForm;
petForm=function(raw){petFormWithPhotoVisual(raw);setTimeout(updatePetPhotoVisual,0)};
document.addEventListener('click',event=>{
  const clearButton=event.target.closest('.photo-clear-inline');
  if(!clearButton)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  window.nutripateClearPetPhoto();
},true);
window.nutripateClearPetPhoto=function(){
  petPhotoDraft=null;
  petPhotoRemoved=true;
  window.__nutripatePhotoRemoved=true;
  const input=document.getElementById('petPhotoInput');
  if(input)input.value='';
  updatePetPhotoVisual();
};


