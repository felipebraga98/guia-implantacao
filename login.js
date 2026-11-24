/* Login padrão do Suporte WhatsMenu (o mesmo da página Clientes Implantação):
   abas "Entrar" e "Criar conta", "Esqueci minha senha" e criar senha nova pelo link do e-mail.
   Funciona em qualquer página que tenha um #auth com o formulário #f-entrar (#e-user / #e-pass).
   O formulário "Entrar" continua sendo tratado pela própria página; aqui entram as outras partes. */
(function () {
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function monta() {
    var auth = $('auth'), fe = $('f-entrar');
    if (!auth || !fe || auth.classList.contains('wl')) return;
    auth.classList.add('wl');
    var admin = /usuarios\.html|ensinar\.html/.test(location.pathname);

    var css = document.createElement('style');
    css.textContent =
      '#auth.wl{max-width:440px;width:100%;margin-left:auto;margin-right:auto}' +
      '#auth.wl > h2, #auth.wl > p.muted{display:none}' +
      '#auth.wl .wl-tabs{display:flex;background:#e6f6ec;border-radius:10px;padding:4px;gap:4px;margin-bottom:16px}' +
      '#auth.wl .wl-tabs button{flex:1;font:700 .9rem "Figtree","Segoe UI",system-ui,sans-serif;border:0;background:transparent;color:#007a2e;border-radius:8px;padding:8px;cursor:pointer}' +
      '#auth.wl .wl-tabs button.on{background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.12)}' +
      '#auth.wl .wl-tabs button:focus-visible{outline:2px solid #00a63e;outline-offset:1px}' +
      '#auth.wl form{display:flex;flex-direction:column;gap:12px;align-items:stretch}' +
      '#auth.wl form label{width:auto;align-self:stretch}' +
      'dialog#auth.wl-dlg{padding:20px}' +
      'dialog#auth.wl-dlg .dlg-top{margin-bottom:14px}' +
      'dialog#auth.wl-dlg form{padding:0!important}' +
      '#auth.wl form label{display:flex;flex-direction:column;gap:4px;font-weight:700;font-size:.85rem;color:#007a2e}' +
      '#auth.wl form input{font:15px "Figtree","Segoe UI",system-ui,sans-serif;color:#14251b;background:#fff;border:1.5px solid #d7e6dc;border-radius:10px;padding:10px 12px;width:100%;box-sizing:border-box}' +
      '#auth.wl form input:focus{outline:none;border-color:#00a63e}' +
      '#auth.wl form .btn,#auth.wl form button[type=submit]{font:700 .95rem "Figtree","Segoe UI",system-ui,sans-serif;background:#00a63e;color:#fff;border:0;border-radius:10px;padding:12px 18px;cursor:pointer;box-shadow:0 3px 0 #007a2e;width:100%}' +
      '#auth.wl form button[type=submit]:hover{background:#007a2e}' +
      '#auth.wl .wl-hint{font-size:.8rem;color:#4f6357;font-weight:400}' +
      '#auth.wl .wl-link{background:none!important;border:0;color:#007a2e!important;font:700 .85rem "Figtree","Segoe UI",system-ui,sans-serif;text-decoration:underline;cursor:pointer;padding:2px;align-self:center;box-shadow:none!important;width:auto!important}' +
      '#auth.wl .wl-msg{min-height:1.2em;margin:12px 0 0;font-weight:600;font-size:.9rem;color:#b3261e}' +
      '#auth.wl .wl-msg.ok{color:#007a2e}' +
      '#auth.wl .wl-adm{margin:0 0 12px;font-size:.85rem;color:#4f6357;text-align:center}';
    document.head.appendChild(css);

    // abas
    var tabs = document.createElement('div');
    tabs.className = 'wl-tabs'; tabs.setAttribute('role', 'tablist');
    tabs.innerHTML = '<button type="button" class="on" data-wl="entrar">Entrar</button><button type="button" data-wl="cadastro">Criar conta</button>';
    fe.parentNode.insertBefore(tabs, fe);
    // janela (Novidades): título e ✕ ficam em cima de tudo, fora do formulário
    if (auth.tagName === 'DIALOG') {
      auth.classList.add('wl-dlg');
      var topo = fe.querySelector('.dlg-top');
      if (topo) auth.insertBefore(topo, tabs);
      var pmsg = fe.querySelector('#auth-msg');
      if (pmsg) fe.appendChild(pmsg);
    }
    if (admin) { var a = document.createElement('p'); a.className = 'wl-adm'; a.textContent = '🔐 Área de administradores'; tabs.parentNode.insertBefore(a, tabs); }

    // "Esqueci minha senha" dentro do Entrar
    var esq = document.createElement('button');
    esq.type = 'button'; esq.className = 'wl-link'; esq.textContent = 'Esqueci minha senha';
    var envia = fe.querySelector('button[type=submit],.btn');
    if (envia && envia.nextSibling) fe.insertBefore(esq, envia.nextSibling); else fe.appendChild(esq);

    // demais formulários
    var extra = document.createElement('div');
    extra.innerHTML =
      '<form id="wl-esqueci" hidden><p class="wl-hint" style="margin:0">Digite o e-mail da sua conta. Vamos mandar um link para você criar uma senha nova.</p>' +
      '<label>E-mail<input id="wl-q-email" type="email" autocomplete="email" required maxlength="120"></label>' +
      '<button type="submit" id="wl-q-btn">Enviar link</button><button type="button" class="wl-link" id="wl-voltar">← Voltar para entrar</button></form>' +
      '<form id="wl-redefinir" hidden><p class="wl-hint" style="margin:0"><b>Criar senha nova.</b> Escolha uma senha com pelo menos 6 caracteres.</p>' +
      '<label>Senha nova<input id="wl-r1" type="password" autocomplete="new-password" required></label>' +
      '<label>Repita a senha nova<input id="wl-r2" type="password" autocomplete="new-password" required></label>' +
      '<button type="submit">Salvar senha e entrar</button></form>' +
      '<form id="wl-cadastro" hidden autocomplete="on">' +
      '<label>Seu nome<span class="wl-hint">É o nome que aparece nas alterações que você fizer.</span><input id="wl-c-nome" required maxlength="60"></label>' +
      '<label>Usuário<span class="wl-hint">Sem espaço e sem acento. Ex.: kevin, ana.souza</span><input id="wl-c-user" autocomplete="username" autocapitalize="off" required maxlength="30"></label>' +
      '<label>E-mail<span class="wl-hint">Usado para recuperar a senha se você esquecer.</span><input id="wl-c-email" type="email" autocomplete="email" required maxlength="120"></label>' +
      '<label>Senha<span class="wl-hint">Pelo menos 6 caracteres.</span><input id="wl-c-pass" type="password" autocomplete="new-password" required></label>' +
      '<label>Repita a senha<input id="wl-c-pass2" type="password" autocomplete="new-password" required></label>' +
      '<label id="wl-c-eq-wrap" hidden>Senha da equipe<span class="wl-hint">A mesma senha das listas do PDV novo.</span><input id="wl-c-eq" type="password" autocomplete="off"></label>' +
      '<button type="submit">Criar conta e entrar</button></form>' +
      '<p class="wl-msg" id="wl-msg" role="status"></p>';
    var ancora = fe.nextSibling;
    while (extra.firstChild) fe.parentNode.insertBefore(extra.firstChild, ancora);
    // a mensagem da própria página (erro de login) continua funcionando; a nossa fica logo abaixo dos formulários
    var forms = ['f-entrar', 'wl-cadastro', 'wl-esqueci', 'wl-redefinir'];
    function msg(t, ok) { var m = $('wl-msg'); m.textContent = t || ''; m.className = 'wl-msg' + (ok ? ' ok' : ''); }
    function mostra(id) { forms.forEach(function (f) { var el = $(f); if (el) el.hidden = f !== id; }); msg(''); }
    function aba(n) { tabs.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.wl === n); }); mostra(n === 'cadastro' ? 'wl-cadastro' : 'f-entrar'); var pm = $('auth-msg'); if (pm) pm.textContent = ''; }
    tabs.addEventListener('click', function (e) { var b = e.target.closest('[data-wl]'); if (b) aba(b.dataset.wl); });
    esq.onclick = function () { mostra('wl-esqueci'); $('wl-q-email').focus(); };
    $('wl-voltar').onclick = function () { aba('entrar'); };

    async function api(acao, body) {
      var r = await fetch('/api/implantacao?acao=' + acao, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error(j.erro || 'Não foi possível agora. Tente de novo.');
      return j;
    }
    function entra(token) { try { localStorage.setItem('impl-token', token); } catch (e) {} location.hash = ''; location.reload(); }

    $('wl-cadastro').addEventListener('submit', async function (e) {
      e.preventDefault();
      if ($('wl-c-pass').value !== $('wl-c-pass2').value) { msg('As senhas não são iguais.'); return; }
      try {
        var r = await api('cadastro', { nome: $('wl-c-nome').value, usuario: $('wl-c-user').value, email: $('wl-c-email').value, senha: $('wl-c-pass').value, senhaEquipe: $('wl-c-eq').value });
        if (admin && !r.admin) { msg('Conta criada! Ela já funciona nas outras páginas do guia. Esta área é só para administradores: peça a um administrador para liberar seu acesso.', true); try { localStorage.setItem('impl-token', r.token); } catch (x) {} return; }
        entra(r.token);
      } catch (err) { msg(err.message); }
    });
    $('wl-esqueci').addEventListener('submit', async function (e) {
      e.preventDefault(); $('wl-q-btn').disabled = true;
      try { var r = await api('esqueci', { email: $('wl-q-email').value }); msg(r.msg || 'Se o e-mail estiver cadastrado, você vai receber o link em instantes.', true); }
      catch (err) { msg(err.message); } finally { $('wl-q-btn').disabled = false; }
    });
    var tokenReset = (location.hash.match(/^#redefinir=([a-f0-9]{48})$/) || [])[1] || '';
    $('wl-redefinir').addEventListener('submit', async function (e) {
      e.preventDefault();
      if ($('wl-r1').value !== $('wl-r2').value) { msg('As senhas não são iguais.'); return; }
      try { var r = await api('redefinir', { token: tokenReset, senha: $('wl-r1').value }); entra(r.token); }
      catch (err) { msg(err.message); }
    });
    if (tokenReset) { tabs.querySelectorAll('button').forEach(function (b) { b.classList.remove('on'); }); mostra('wl-redefinir'); if (auth.tagName === 'DIALOG' && !auth.open) { try { auth.showModal(); } catch (x) {} } auth.hidden = false; }

    // pede a "senha da equipe" no cadastro só se o sistema estiver configurado assim
    fetch('/api/implantacao?acao=config', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (c) {
      if (c && c.pedeSenhaEquipe) { $('wl-c-eq-wrap').hidden = false; $('wl-c-eq').required = true; }
    }).catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', monta); else monta();
})();
