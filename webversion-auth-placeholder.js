(function(){
  const style=document.createElement('style');
  style.textContent=`
    .web-auth-login{margin-top:14px}
    .web-auth-screen{padding:8px 0 24px}
    .web-auth-back{border:0;background:transparent;padding:0;margin:0 0 18px;color:#07383a;font:18px Georgia,serif}
    .web-auth-screen h1{margin:0 0 8px;font:30px Georgia,serif;color:#07383a}
    .web-auth-screen>p{color:#53716f;margin:0 0 20px}
    .web-auth-form{display:grid;gap:12px}
    .web-auth-form label{display:grid;gap:6px;color:#53716f;font-size:13px}
    .web-auth-form input{width:100%;box-sizing:border-box;border:1px solid #d8e5e1;border-radius:14px;padding:14px 15px;background:#fff;color:#07383a;font:16px Arial,sans-serif}
    .web-auth-code{letter-spacing:.24em}
    .web-auth-note{font-size:12px;color:#53716f;margin-top:14px}
  `;
  document.head.appendChild(style);
  const loginScreen=()=>`<section class="web-auth-screen"><button class="web-auth-back" type="button" data-web-auth="back">‹ Назад</button><h1>Войти в аккаунт</h1><p>Введите почту, чтобы сохранить профиль питомца и открыть его на любом устройстве.</p><div class="web-auth-form"><label>Почта<input id="webAuthEmail" type="email" autocomplete="email" placeholder="you@example.com"></label><label>Одноразовый код<input id="webAuthCode" class="web-auth-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000"></label><button class="primary full" type="button" data-web-auth="send">Получить код</button><button class="soft-button full" type="button" data-web-auth="verify">Войти по коду</button></div><p class="web-auth-note">Пока это тестовый экран. Отправку кода на почту подключим следующим этапом.</p></section>`;
  const welcomeScreen=()=>`<section class="welcome-screen"><div class="welcome-brand">Nutri<span>Pate</span></div><h1>Добро пожаловать!</h1><img class="welcome-art" src="assets/welcome_pets.png" alt="Питомцы рядом"><h2>Здесь будет день<br>вашего питомца</h2><p class="welcome-lead">Всего один профиль — и важное всегда под рукой: корм, порция и время кормления.</p><button class="primary" data-action="start-onboarding">Добавить первого питомца</button><div class="welcome-example"><b>Что понадобится</b><p>Возраст, вес, активность и особенности здоровья.</p></div><button class="soft-button full web-auth-login" type="button" data-web-auth="open">Войдите в свой аккаунт</button><p class="welcome-note">Один питомец и основной дневник — бесплатно.</p></section>`;
  try{viewWelcome=welcomeScreen}catch(e){}
  const addLoginButton=()=>{
    const example=document.querySelector('.welcome-example');
    if(example&&!document.querySelector('[data-web-auth="open"]'))example.insertAdjacentHTML('afterend','<button class="soft-button full web-auth-login" type="button" data-web-auth="open">Войдите в свой аккаунт</button>');
  };
  new MutationObserver(addLoginButton).observe(document.body,{childList:true,subtree:true});
  addLoginButton();
  document.addEventListener('click',function(e){
    const button=e.target.closest('[data-web-auth]');
    if(!button)return;
    e.preventDefault();
    const action=button.dataset.webAuth;
    if(action==='open'){$('appMain').innerHTML=loginScreen();return}
    if(action==='back'){render();return}
    if(action==='send'){toast('Тест: код отправки пока не подключён');return}
    if(action==='verify'){toast('Тест: проверка кода пока не подключена');return}
  });
}());
