(function(){
  const switcher=document.getElementById('petSwitcher');
  const petsTab=document.querySelector('[data-tab="pets"]');
  if(switcher&&petsTab){
    switcher.onclick=function(){petsTab.click()};
  }
})();
