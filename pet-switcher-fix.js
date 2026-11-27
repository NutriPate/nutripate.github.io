(function(){
  const style=document.createElement('style');
  style.textContent=`
    body.pet-picker-route .app-header{display:none!important}
    body.pet-picker-route .bottom-nav{display:none!important}
    body.pet-picker-route .app-shell{min-height:100vh}
    body.pet-picker-route #appMain{padding-top:0}
    body.pet-picker-route .pets-tab-screen{min-height:100vh;padding:20px 24px 32px}
    body.pet-picker-route .pets-tab-back{cursor:pointer;color:#13b5b5}
  `;
  document.head.appendChild(style);
  const switcher=document.getElementById('petSwitcher');
  if(!switcher)return;

  const leavePicker=()=>{
    document.body.classList.remove('pet-picker-route');
    window.__petPickerRoute=false;
    tab='today';
    render();
  };

  const bindPickerScreen=()=>{
    const back=document.querySelector('.pets-tab-back');
    if(back)back.onclick=leavePicker;
    document.querySelectorAll('.pets-tab-screen [data-edit-pet]').forEach(button=>{
      button.onclick=()=>{document.body.classList.remove('pet-picker-route');window.__petPickerRoute=false;petForm(state.pets.find(p=>p.id===button.dataset.editPet))};
    });
    document.querySelectorAll('.pets-tab-screen [data-action="add-pet"]').forEach(button=>{
      button.onclick=()=>{document.body.classList.remove('pet-picker-route');window.__petPickerRoute=false;petForm()};
    });
  };

  switcher.onclick=function(){
    const modal=document.getElementById('modal');
    if(modal?.open)modal.close();
    window.__petPickerRoute=true;
    document.body.classList.add('pet-picker-route');
    tab='pets';
    render();
    requestAnimationFrame(bindPickerScreen);
  };

  document.addEventListener('click',event=>{
    if(event.target.closest('[data-tab="pets"]')&&!window.__petPickerRoute){
      document.body.classList.remove('pet-picker-route');
    }
  });
})();
