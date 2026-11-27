(function(){
  const style=document.createElement('style');
  style.textContent=`
    #modal.pet-picker-dialog{width:min(100vw,430px);max-width:430px;height:100vh;max-height:100vh;margin:0;padding:0;border:0;border-radius:0;background:#fff;color:#07383a}
    #modal.pet-picker-dialog::backdrop{background:rgba(7,56,58,.22)}
    .pet-picker-shell{min-height:100%;padding:20px 24px 28px;box-sizing:border-box;background:#fff}
    .pet-picker-back{display:flex;align-items:center;gap:10px;margin:0 0 18px;padding:0;border:0;background:transparent;color:#13b5b5;font:700 20px Montserrat,sans-serif;cursor:pointer}
    .pet-picker-back span{color:#07383a}
    .pet-picker-shell .pets-tab-screen{padding:0}
  `;
  document.head.appendChild(style);
  const switcher=document.getElementById('petSwitcher');
  if(!switcher)return;
  switcher.onclick=function(){
    const modal=document.getElementById('modal');
    const content=document.getElementById('modalContent');
    if(!modal||!content||typeof viewPets!=='function')return;
    modal.classList.add('pet-picker-dialog');
    const petsView=viewPets().replace('<div class="pets-tab-back">‹ <span>NutriPate</span></div>','');
    content.innerHTML=`<div class="pet-picker-shell"><button class="pet-picker-back" type="button"><span>‹</span><span>NutriPate</span></button>${petsView}</div>`;
    modal.showModal();
    content.querySelector('.pet-picker-back').onclick=()=>modal.close();
    content.querySelectorAll('[data-edit-pet]').forEach(button=>{
      button.onclick=()=>{modal.close();petForm(state.pets.find(p=>p.id===button.dataset.editPet))};
    });
    content.querySelectorAll('[data-action="add-pet"]').forEach(button=>{
      button.onclick=()=>{modal.close();petForm()};
    });
    modal.addEventListener('close',()=>modal.classList.remove('pet-picker-dialog'),{once:true});
  };
})();
