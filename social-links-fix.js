(function () {
  const style = document.createElement('style');
  style.textContent = `.more-parity .brand i{display:grid!important;place-items:center!important;width:42px!important;height:42px!important;border-radius:50%!important;font-size:0!important;font-family:Montserrat,sans-serif!important;opacity:1!important}.more-parity .brand:not(.max) i{background:#24a9e6!important}.more-parity .brand:not(.max) i::before{content:'✈';font-size:19px;color:#fff}.more-parity .brand.max i{background:#6950d8!important}.more-parity .brand.max i::before{content:'M';font-size:19px;font-weight:700;color:#fff}`;
  document.head.appendChild(style);
  const iconStyle = document.createElement('style');
  iconStyle.textContent = '.more-parity .brand i::before{content:none!important}.more-parity .brand i img{width:42px;height:42px;display:block;object-fit:contain;border-radius:50%}';
  document.head.appendChild(iconStyle);
  const footerStyle = document.createElement('style');
  footerStyle.textContent = '.more-parity .credits .credit-item{display:flex;align-items:center;gap:6px}.more-parity .credits .flag-mark{width:28px;height:18px;object-fit:cover;border:1px solid #111;border-radius:2px}.more-parity .credits .hse-mark{width:28px;height:28px;object-fit:contain;border-radius:50%}';
  document.head.appendChild(footerStyle);
  const bind = () => {
    document.querySelectorAll('.more-parity .channel').forEach((row, index) => {
      const icon = row.querySelector('.brand i');
      if (icon && !icon.querySelector('img')) icon.innerHTML = `<img src="/assets/social/${index === 0 ? 'telegram' : 'max'}.png" alt="${index === 0 ? 'Telegram' : 'MAX'}">`;
      row.style.cursor = 'pointer';
      row.setAttribute('title', index === 0 ? 'Открыть Telegram' : 'Открыть MAX');
      row.onclick = () => window.open(index === 0 ? 'https://t.me/nutripate' : 'https://max.ru/', '_blank', 'noopener,noreferrer');
    });
    const credits = document.querySelector('.more-parity .credits');
    if (credits && !credits.querySelector('.flag-mark')) credits.innerHTML = '<span class="credit-item"><img class="flag-mark" src="/assets/social/russia-flag.png" alt="Флаг России"><span>made in Russia</span></span><span class="credit-item"><img class="hse-mark" src="/assets/social/hse.png" alt="Логотип НИУ ВШЭ"><span>НИУ ВШЭ</span></span>';
  };
  setTimeout(bind, 0);
  setTimeout(bind, 500);
  const observer = new MutationObserver(bind);
  observer.observe(document.body, { childList: true, subtree: true });
  setInterval(bind, 1000);
}());
