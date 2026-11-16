(function () {
  const style = document.createElement('style');
  style.textContent = `.more-parity .brand i{display:grid!important;place-items:center!important;width:34px!important;height:34px!important;border-radius:50%!important;font-size:0!important;font-family:Arial,sans-serif!important;opacity:1!important}.more-parity .brand:not(.max) i{background:#24a9e6!important}.more-parity .brand:not(.max) i::before{content:'✈';font-size:19px;color:#fff}.more-parity .brand.max i{background:#6950d8!important}.more-parity .brand.max i::before{content:'M';font-size:19px;font-weight:700;color:#fff}`;
  document.head.appendChild(style);
  const bind = () => document.querySelectorAll('.more-parity .channel').forEach((row, index) => {
    row.style.cursor = 'pointer';
    row.setAttribute('title', index === 0 ? 'Открыть Telegram' : 'Открыть MAX');
    row.onclick = () => window.open(index === 0 ? 'https://t.me/nutripate' : 'https://max.ru/', '_blank', 'noopener,noreferrer');
  });
  setTimeout(bind, 0);
  setTimeout(bind, 500);
}());
