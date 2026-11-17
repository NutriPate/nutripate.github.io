(function(){
  const switcher=document.getElementById('petSwitcher');
  const petsTab=document.querySelector('[data-tab="pets"]');
  if(switcher&&petsTab){
    switcher.addEventListener('click',function(){petsTab.click()});
  }
})();
