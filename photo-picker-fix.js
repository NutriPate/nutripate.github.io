(() => {
  function openPetPhotoPicker(event) {
    const button = event.target.closest('.photo-upload');
    if (!button || event.target.id === 'petPhotoInput') return;
    const input = document.getElementById('petPhotoInput');
    if (!input) return;
    event.preventDefault();
    event.stopPropagation();
    input.click();
  }

  document.addEventListener('click', openPetPhotoPicker, true);
})();
