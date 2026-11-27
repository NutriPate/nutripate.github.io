(function(){
  function stockFor(p){
    if(!p)return null;
    state.stockByPet=state.stockByPet&&typeof state.stockByPet==='object'?state.stockByPet:{};
    return state.stockByPet[p.id]||null;
  }
  function stockSummary(){
    const p=activePet(),f=chosenFood(),s=stockFor(p),daily=Number(dailyGrams())||0;
    if(!f)return 'Нет корма';
    if(!s||!Number.isFinite(Number(s.remainingGrams)))return 'Указать пачку';
    const left=Math.max(0,Math.round(Number(s.remainingGrams))),days=daily?Math.floor(left/daily):0;
    return left>0?`≈ ${days} ${days===1?'день':days>=2&&days<=4?'дня':'дней'}`:'Корм закончился';
  }
  function stockForm(){
    const p=activePet(),s=stockFor(p),f=chosenFood();
    if(!p||!f){toast('Сначала выберите корм');return}
    const current=s&&Number.isFinite(Number(s.remainingGrams))?Number(s.remainingGrams):'';
    openModal(`<h2>Запас корма</h2><div class="form"><p class="muted">${esc(f.brand)} · ${esc(f.name)}</p><label>Сколько граммов осталось<input id="stockRemainingInput" inputmode="numeric" value="${current}" placeholder="Например, 1500"></label><p class="form-hint">После каждого «Покормил» это значение автоматически уменьшается на размер порции.</p><div class="form-actions"><button class="soft-button" onclick="modal.close()">Отмена</button><button class="primary" onclick="saveStock()">Сохранить</button></div></div>`);
  }
  window.saveStock=function(){
    const p=activePet(),value=Number(String(document.getElementById('stockRemainingInput')?.value||'').replace(',','.'));
    if(!p||!Number.isFinite(value)||value<0){toast('Укажите остаток в граммах');return}
    state.stockByPet=state.stockByPet&&typeof state.stockByPet==='object'?state.stockByPet:{};
    state.stockByPet[p.id]={remainingGrams:Math.round(value),foodId:state.selectedFoods?.[p.id]||'',updatedAt:new Date().toISOString()};
    save();modal.close();toast('Запас сохранён');render();
  };
  const originalViewToday=viewToday;
  viewToday=function(){
    return originalViewToday().replace(/<button class="kv" data-action="stock"><span>Запас корма<\/span><strong>[^<]*<\/strong><span>›<\/span><\/button>/,`<button class="kv" data-action="stock"><span>Запас корма</span><strong>${stockSummary()}</strong><span>›</span></button>`);
  };
  const originalActions=actions;
  actions=function(name){
    if(name==='stock'){stockForm();return}
    if(name==='feed'){
      const p=activePet(),before=(p&&state.feedEntries||[]).filter(x=>x.petId===p.id).length;
      originalActions(name);
      const after=(p&&state.feedEntries||[]).filter(x=>x.petId===p.id).length;
      if(after>before){
        const last=state.feedEntries.filter(x=>x.petId===p.id).slice(-1)[0],s=stockFor(p);
        if(s&&last){s.remainingGrams=Math.max(0,Number(s.remainingGrams||0)-Number(last.grams||0));s.updatedAt=new Date().toISOString();save();render()}
      }
      return;
    }
    return originalActions(name);
  };
})();
