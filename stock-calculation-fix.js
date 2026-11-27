(function(){
  function stockFor(p,f){
    if(!p||!f)return null;
    state.stock=state.stock&&typeof state.stock==='object'?state.stock:{};
    state.stock[p.id]=state.stock[p.id]&&typeof state.stock[p.id]==='object'?state.stock[p.id]:{};
    return state.stock[p.id][f.id]||null;
  }
  function currentStock(){return stockFor(activePet(),chosenFood())}
  stockRecord=function(){return currentStock()||{}}
  stockDaysLabel=function(){
    const f=chosenFood(),r=currentStock(),day=Number(dailyGrams())||0;
    if(!f)return 'Нет корма';
    if(!r||!Number.isFinite(Number(r.left)))return 'Указать вес пачки';
    const left=Math.max(0,Math.round(Number(r.left))),days=day?Math.floor(left/day):0;
    return left>0?`≈ ${days} ${days===1?'день':days>=2&&days<=4?'дня':'дней'}`:'Корм закончился';
  }
  stockModal=function(){
    const p=activePet(),f=chosenFood(),r=currentStock();
    if(!p||!f)return toast('Сначала выберите корм');
    const pack=Number(r?.pack)||'';
    openModal(`<h2>Запас корма</h2><p class="muted">Введите вес полной пачки один раз. После каждого «Покормил» система сама вычтет порцию.</p><div class="card mint-card"><b>${esc(f.brand)} · ${esc(f.name)}</b><p>Расход: ${dailyGrams()} г / день</p>${r&&Number.isFinite(Number(r.left))?`<p>Сейчас осталось: ${Math.max(0,Math.round(Number(r.left)))} г</p>`:''}</div><div class="form"><label>Вес полной пачки, г<input id="stockPack" inputmode="decimal" value="${pack}" placeholder="Например, 2000"></label><div class="form-actions"><button class="soft-button" onclick="modal.close()">Отмена</button><button class="primary" onclick="saveStockWeb()">Сохранить</button></div></div>`);
  };
  saveStockWeb=function(){
    const p=activePet(),f=chosenFood(),pack=Number(String(document.getElementById('stockPack')?.value||'').replace(',','.'));
    if(!p||!f||!Number.isFinite(pack)||pack<=0){toast('Укажите вес полной пачки');return}
    const old=currentStock(),same=old&&Number(old.pack)===pack;
    state.stock[p.id]=state.stock[p.id]||{};
    state.stock[p.id][f.id]={pack,left:same?Number(old.left):pack,price:Number(old?.price)||0,updatedAt:new Date().toISOString()};
    save();modal.close();toast('Вес пачки сохранён');render();
  };
  const originalActions=actions;
  actions=function(name){
    if(name==='stock'){stockModal();return}
    if(name==='feed'){
      const p=activePet(),f=chosenFood(),before=(p&&state.feedEntries||[]).filter(x=>x.petId===p.id).length;
      originalActions(name);
      const after=(p&&state.feedEntries||[]).filter(x=>x.petId===p.id).length;
      if(after>before&&p&&f){
        const r=currentStock(),last=state.feedEntries.filter(x=>x.petId===p.id).slice(-1)[0];
        if(r&&last){r.left=Math.max(0,Number(r.left||0)-Number(last.grams||0));r.updatedAt=new Date().toISOString();save();render()}
      }
      return;
    }
    return originalActions(name);
  };
})();
