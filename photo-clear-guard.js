(function () {
  document.addEventListener('click', function (event) {
    const button = event.target.closest('.photo-clear-inline');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.__nutripatePhotoRemoved = true;
    const placeholder = button.closest('.pet-photo-row')?.querySelector('.pet-paw-placeholder');
    if (placeholder) {
      placeholder.classList.remove('has-photo');
      placeholder.innerHTML = placeholder.dataset.defaultMarkup || '<img class="pet-paw-reference" src="assets/paw-reference-transparent.png" alt="">';
    }
    button.remove();
    const input = document.getElementById('petPhotoInput');
    if (input) input.value = '';
  }, true);
}());
