(function () {
  const style = document.createElement('style');
  style.textContent = `.more-parity .brand i{display:grid!important;place-items:center!important;width:34px!important;height:34px!important;border-radius:50%!important;font-size:0!important;font-family:Arial,sans-serif!important;opacity:1!important}.more-parity .brand:not(.max) i{background:#24a9e6!important}.more-parity .brand:not(.max) i::before{content:'✈';font-size:19px;color:#fff}.more-parity .brand.max i{background:#6950d8!important}.more-parity .brand.max i::before{content:'M';font-size:19px;font-weight:700;color:#fff}`;
  document.head.appendChild(style);
  const iconStyle = document.createElement('style');
  iconStyle.textContent = '.more-parity .brand i::before{content:none!important}.more-parity .brand i svg{width:22px;height:22px;display:block}';
  document.head.appendChild(iconStyle);
  const bind = () => document.querySelectorAll('.more-parity .channel').forEach((row, index) => {
    const icon = row.querySelector('.brand i');
    if (icon) icon.innerHTML = index === 0 ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M21.5 3.6 18.2 20c-.25 1.16-.9 1.45-1.82.9l-5.05-3.72-2.44 2.35c-.27.27-.5.5-1.03.5l.37-5.18 9.43-8.52c.41-.37-.09-.58-.64-.2L5.36 13.58.38 12.02c-1.08-.34-1.1-1.08.23-1.6L20.1 2.86c.9-.33 1.68.2 1.4.74Z"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M5 18V6h3l4 5 4-5h3v12h-3V11l-4 5-4-5v7H5Z"/></svg>';
    row.style.cursor = 'pointer';
    row.setAttribute('title', index === 0 ? 'Открыть Telegram' : 'Открыть MAX');
    row.onclick = () => window.open(index === 0 ? 'https://t.me/nutripate' : 'https://max.ru/', '_blank', 'noopener,noreferrer');
  });
  setTimeout(bind, 0);
  setTimeout(bind, 500);
}());
