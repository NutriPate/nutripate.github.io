(function () {
  const style = document.createElement('style');
  style.textContent = `.owner-parity h2{margin:0 0 4px;font:30px Georgia,serif}.owner-parity .owner-subtitle{margin:0 0 18px;color:#53716f}.owner-parity .owner-note{padding:18px 15px;border-radius:17px;background:#d9f6f3;margin-bottom:16px}.owner-parity .owner-note b{display:block;margin-bottom:8px;font:17px Georgia,serif}.owner-parity .owner-note span{color:#53716f}.owner-parity .form{gap:12px}.owner-parity .form label{position:relative}.owner-parity .form input[type=text],.owner-parity .form input[type=email]{height:49px;background:#fff;border-radius:16px}.owner-parity .consent-row{display:flex!important;align-items:center;gap:12px;margin:12px 10px 0 10px;color:#00aeb2}.owner-parity .consent-row input{width:18px;height:18px;accent-color:#12b6b8}.owner-parity .owner-local{margin:10px 0 0;color:#53716f;font-size:12px}.owner-parity .form-actions{display:block;margin-top:14px}.owner-parity .form-actions .primary{width:100%;height:52px}`;
  document.head.appendChild(style);
  window.ownerForm = function () {
    const o = state.owner || {};
    const html = `<div class="owner-parity"><h2>Профиль владельца</h2><p class="owner-subtitle">Данные хранятся только на этом устройстве.</p><div class="owner-note"><b>Забота начинается с вас</b><span>Профиль помогает подписывать отчёты и не потерять имя владельца.</span></div><div class="form"><label>Имя<input id="ownerInputName" type="text" value="${esc(o.name || '')}" placeholder="Как к вам обращаться"></label><label>Электронная почта<input id="ownerInputEmail" type="email" required value="${esc(o.email || '')}" placeholder="Введите электронную почту"></label><label class="consent-row"><input id="ownerConsent" type="checkbox" ${o.privacyConsent ? 'checked' : ''}><span><a class="policy-link" href="privacy-policy.pdf" target="_blank" rel="noopener">Я согласен(на) на обработку персональных данных</a></span></label><p class="owner-local">Аккаунт не создаётся в интернете: приложение работает локально.</p><p id="ownerFormError" class="form-error" role="alert"></p><div class="form-actions"><button class="primary" onclick="saveOwner()">Сохранить профиль</button></div></div></div>`;
    openModal(html);
  };
  const saveOwnerBase = window.saveOwner;
  window.saveOwner = function () {
    const email = document.getElementById('ownerInputEmail')?.value.trim();
    if (!email) return formError('Укажите электронную почту.');
    return saveOwnerBase();
  };
  try { saveOwner = window.saveOwner; } catch (e) {}
  try { ownerForm = window.ownerForm; } catch (e) {}
  document.addEventListener('click', function (event) {
    const row = event.target.closest && event.target.closest('.more-parity .owner-row');
    if (!row) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.ownerForm();
  }, true);
  const row = document.querySelector('.more-parity .owner-row');
  if (row) row.onclick = () => window.ownerForm();
}());
