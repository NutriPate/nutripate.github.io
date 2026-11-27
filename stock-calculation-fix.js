(function(){
  function inferredPack(f){
    const match=String(f?.name||'').match(/(\d+(?:[.,]\d+)?)\s*(кг|kg|г|гр)\b/i);
    if(match){const n=Number(match[1].replace(',','.'));return match[2].toLowerCase().startsWith('к')||match[2].toLowerCase()==='kg'?Math.round(n*1000):Math.round(n)}
    return f?.form==='wet'?85:2000;
  }
  function stockFor(p,f){
    if(!p||!f)return null;
    state.stock=state.stock&&typeof state.stock==='object'?state.stock:{};
    state.stock[p.id]=state.stock[p.id]&&typeof state.stock[p.id]==='object'?state.stock[p.id]:{};
    return state.stock[p.id][f.id]||{pack:inferredPack(f),left:inferredPack(f),price:0,auto:true};
  }
  function currentStock(){return stockFor(activePet(),chosenFood())}
  stockRecord=function(){return currentStock()||{}}
  stockDaysLabel=function(){
    const f=chosenFood(),r=currentStock(),day=Number(dailyGrams())||0;
    if(!f)return 'Нет корма';
    const left=Math.max(0,Math.round(Number(r?.left)||0)),days=day?Math.floor(left/day):0;
    return left>0?`≈ ${days} ${days===1?'день':days>=2&&days<=4?'дня':'дней'}`:'Корм закончился';
  }
  stockModal=function(){
    const p=activePet(),f=chosenFood(),r=currentStock();
    if(!p||!f)return toast('Сначала выберите корм');
    const left=Math.max(0,Math.round(Number(r?.left)||0)),days=dailyGrams()?Math.floor(left/Number(dailyGrams())):0;
    openModal(`<h2>Запас корма</h2><p class="muted">Остаток рассчитывается автоматически по массе упаковки из карточки корма и отмеченным кормлениям.</p><div class="card mint-card"><b>${esc(f.brand)} · ${esc(f.name)}</b><p>Вес упаковки: ${r.pack} г</p><p>Осталось: ${left} г</p><p>Примерно хватит: ${days} ${days===1?'день':days>=2&&days<=4?'дня':'дней'}</p></div><button class="primary full" onclick="modal.close()">Понятно</button>`);
  };
  saveStockWeb=function(){toast('Запас обновляется автоматически после кормления')};
  const originalActions=actions;
  actions=function(name){
    if(name==='stock'){stockModal();return}
    if(name==='feed'){
      const p=activePet(),f=chosenFood(),before=(p&&state.feedEntries||[]).filter(x=>x.petId===p.id).length;
      originalActions(name);
      const after=(p&&state.feedEntries||[]).filter(x=>x.petId===p.id).length;
      if(after>before&&p&&f){
        const r=currentStock(),last=state.feedEntries.filter(x=>x.petId===p.id).slice(-1)[0];
        state.stock[p.id]=state.stock[p.id]||{};state.stock[p.id][f.id]={pack:Number(r.pack)||inferredPack(f),left:Math.max(0,Number(r.left||0)-Number(last?.grams||0)),price:Number(r.price)||0,auto:true,updatedAt:new Date().toISOString()};save();render();
      }
      return;
    }
    return originalActions(name);
  };
})();
