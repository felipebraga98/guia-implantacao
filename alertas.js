/* Alertas da equipe WhatsMenu — incluído em todas as páginas do guia.
 * - Antes de cada atendimento (tempo definido em Agendamentos › Configurações): faixa vermelha no topo, som repetindo e notificação do Windows,
 *   sem parar, até alguém da equipe clicar em "Parar alerta" (para todo mundo).
 * - Aviso de agendamento novo.
 * - Pede para trocar a senha quando um administrador gerou uma senha temporária.
 * - Mostra os itens marcados com data-so-admin só para administradores.
 * Funciona com qualquer aba do guia aberta (pode estar minimizada), desde que a pessoa esteja logada.
 */
(function () {
  if (window.__alertasWM) return;
  window.__alertasWM = true;

  var API = '/api/agendamento';
  var INTERVALO = 15000;
  var tabId = Math.random().toString(36).slice(2);
  var alarmes = [], parando = {}, notifs = {}, somAtivo = false, ctx = null, tituloOriginal = document.title, piscaTimer = null, somTimer = null, notifTimer = null;

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function token() { return ls('impl-token') || ''; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // ---------- estilos ----------
  var css = document.createElement('style');
  css.textContent =
    '#wm-alarme{position:fixed;left:0;right:0;top:0;z-index:2147483000;font:15px/1.4 "Figtree","Segoe UI",system-ui,sans-serif;color:#fff;' +
    'padding:calc(10px + env(safe-area-inset-top,0px)) max(12px,env(safe-area-inset-right,0px)) 10px max(12px,env(safe-area-inset-left,0px));background:#b3261e;box-shadow:0 6px 20px rgba(0,0,0,.35);display:grid;gap:8px}' +
    '#wm-alarme.pisca{animation:wmPisca .9s ease-in-out infinite alternate}' +
    '@keyframes wmPisca{to{background:#e0473c}}' +
    '@media (prefers-reduced-motion:reduce){#wm-alarme.pisca{animation:none}}' +
    '.wm-al{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;max-width:1100px;margin:0 auto;width:100%}' +
    '.wm-al .t{font-weight:800;font-size:16px;flex:1;min-width:220px}' +
    '.wm-al .t small{display:block;font-weight:600;opacity:.92;font-size:13px}' +
    '.wm-al a,.wm-al button{font:700 14px "Figtree","Segoe UI",sans-serif;border-radius:10px;padding:9px 14px;cursor:pointer;text-decoration:none;border:0;white-space:nowrap}' +
    '.wm-al .wa{background:#25d366;color:#0b3d1d}' +
    '.wm-al .parar{background:#fff;color:#b3261e}' +
    '.wm-al .parar:focus-visible,.wm-al .wa:focus-visible{outline:3px solid #ffd23f;outline-offset:2px}' +
    '.wm-som{max-width:1100px;margin:0 auto;width:100%;background:rgba(0,0,0,.25);border-radius:8px;padding:6px 10px;font-weight:700;font-size:13px;cursor:pointer;border:0;color:#fff;text-align:left}' +
    '#wm-pill{position:fixed;right:max(16px,env(safe-area-inset-right,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:2147482000;background:#0f3b22;color:#fff;border-radius:14px;padding:12px 14px;' +
    'font:600 14px/1.4 "Figtree","Segoe UI",sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.3);max-width:min(360px,calc(100vw - 32px));display:grid;gap:8px}' +
    '#wm-pill .row{display:flex;gap:8px;flex-wrap:wrap}' +
    '#wm-pill button{font:700 13px "Figtree",sans-serif;border:0;border-radius:9px;padding:8px 12px;cursor:pointer}' +
    '#wm-pill .ok{background:#ffd23f;color:#14251b}#wm-pill .no{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.5)}' +
    '#wm-toast{position:fixed;left:50%;bottom:calc(22px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:2147482500;background:#0f3b22;color:#fff;border-radius:12px;padding:12px 18px;font:700 14px "Figtree",sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.3);max-width:calc(100vw - 32px)}' +
    '#wm-senha{position:fixed;inset:0;z-index:2147483100;background:rgba(15,59,34,.75);display:grid;place-items:center;padding:16px}' +
    '#wm-senha form{background:#fff;color:#14251b;border-radius:16px;padding:22px;width:min(420px,100%);display:grid;gap:12px;font:15px "Figtree",sans-serif}' +
    '#wm-senha h2{margin:0;font:800 20px "Bricolage Grotesque","Segoe UI",sans-serif}' +
    '#wm-senha label{display:grid;gap:4px;font-weight:700;font-size:13px;color:#007a2e}' +
    '#wm-senha input{font:15px "Figtree",sans-serif;border:1.5px solid #d7e6dc;border-radius:10px;padding:10px 12px}' +
    '#wm-senha button{background:#00a63e;color:#fff;border:0;border-radius:10px;padding:12px;font:700 15px "Figtree",sans-serif;cursor:pointer}' +
    '#wm-senha .m{color:#b3261e;font-weight:600;margin:0;min-height:1em}';
  document.head.appendChild(css);

  function toast(t) {
    var el = document.getElementById('wm-toast');
    if (!el) { el = document.createElement('div'); el.id = 'wm-toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = t; el.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(function () { el.hidden = true; }, 5000);
  }

  // ---------- só uma aba toca o som e mostra a notificação do Windows ----------
  function souLider() {
    var raw = ls('wm-lider'), agora = Date.now(), l = null;
    try { l = JSON.parse(raw || 'null'); } catch (e) { l = null; }
    if (!l || l.id === tabId || agora - l.ts > 9000 || (document.visibilityState === 'visible' && l.vis === false)) {
      ls('wm-lider', JSON.stringify({ id: tabId, ts: agora, vis: document.visibilityState === 'visible' }));
      return true;
    }
    return false;
  }
  window.addEventListener('beforeunload', function () { try { var l = JSON.parse(ls('wm-lider') || 'null'); if (l && l.id === tabId) ls('wm-lider', null); } catch (e) {} });

  // ---------- som ----------
  function audio() {
    try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
    return ctx;
  }
  function liberaSom() {
    var a = audio();
    if (a && a.state === 'suspended') a.resume();
    somAtivo = !!a && a.state !== 'suspended';
    desenha();
  }
  ['click', 'keydown', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, function () { if (!somAtivo) liberaSom(); }, { capture: true, passive: true }); });
  function sirene() {
    var a = audio(); if (!a || a.state === 'suspended') { somAtivo = false; return; }
    somAtivo = true;
    [0, 0.28, 0.56, 0.84].forEach(function (t, i) {
      var o = a.createOscillator(), g = a.createGain();
      o.type = 'square'; o.frequency.value = i % 2 ? 660 : 990;
      g.gain.setValueAtTime(0.0001, a.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.18, a.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t + 0.24);
      o.connect(g); g.connect(a.destination); o.start(a.currentTime + t); o.stop(a.currentTime + t + 0.26);
    });
  }
  function bipCurto() {
    var a = audio(); if (!a || a.state === 'suspended') return;
    [0, 0.2].forEach(function (t, i) {
      var o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.value = i ? 1175 : 880;
      g.gain.setValueAtTime(0.0001, a.currentTime + t); g.gain.exponentialRampToValueAtTime(0.25, a.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t + 0.18); o.connect(g); g.connect(a.destination); o.start(a.currentTime + t); o.stop(a.currentTime + t + 0.2);
    });
  }

  // ---------- notificação do Windows ----------
  function podeNotificar() { return 'Notification' in window && Notification.permission === 'granted'; }
  function quando(a) { return a.min > 0 ? 'em ' + a.min + ' min' : a.min === 0 ? 'agora' : 'atrasado ' + (-a.min) + ' min'; }
  function notificaAlarme(a) {
    if (!podeNotificar()) return;
    try {
      if (notifs[a.id]) notifs[a.id].close();
      var n = new Notification('⏰ Atendimento ' + quando(a) + ' — ' + a.hora, {
        body: a.nome + ' (' + a.loja + ')' + (a.consultorNome ? ' · ' + a.consultorNome : '') + '\nClique para abrir o guia e parar o alerta.',
        tag: 'wm-al-' + a.id, renotify: true, requireInteraction: true, icon: '/logo.png',
      });
      n.onclick = function () { window.focus(); n.close(); };
      notifs[a.id] = n;
    } catch (e) {}
  }
  function fechaNotif(id) { try { if (notifs[id]) notifs[id].close(); } catch (e) {} delete notifs[id]; }

  // ---------- faixa no topo ----------
  function wa(a) {
    var n = String(a.whatsapp || '').replace(/\D/g, ''); if (n.length <= 11) n = '55' + n;
    var txt = 'Olá, ' + String(a.nome || '').split(' ')[0] + '! Aqui é do suporte WhatsMenu. Estou entrando em contato para o atendimento agendado de hoje às ' + a.hora + '. Podemos começar?';
    return 'https://wa.me/' + n + '?text=' + encodeURIComponent(txt);
  }
  function desenha() {
    var box = document.getElementById('wm-alarme');
    var ativos = alarmes.filter(function (a) { return !parando[a.id]; });
    if (!ativos.length) {
      if (box) box.remove();
      document.body.style.paddingTop = document.body.dataset.wmPad || '';
      return;
    }
    if (!box) {
      box = document.createElement('div'); box.id = 'wm-alarme'; box.setAttribute('role', 'alert');
      document.body.appendChild(box);
      box.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-parar]');
        if (b) { e.preventDefault(); parar(b.getAttribute('data-parar'), b); return; }
        var at = e.target.closest('button[data-atend]');
        if (at) { e.preventDefault(); parar(at.getAttribute('data-atend'), at, 'em-atendimento'); return; }
        if (e.target.closest('.wm-som')) liberaSom();
      });
      if (document.body.dataset.wmPad === undefined) document.body.dataset.wmPad = document.body.style.paddingTop || '';
    }
    box.className = 'pisca';
    box.innerHTML = ativos.map(function (a) {
      return '<div class="wm-al"><div class="t">⏰ Atendimento ' + esc(quando(a)) + ' — ' + esc(a.hora) + ' · ' + esc(a.nome) + ' (' + esc(a.loja) + ')' +
        '<small>' + esc(a.tipoNome || 'Atendimento') + (a.consultorNome ? ' · consultor: ' + esc(a.consultorNome) : ' · sem consultor definido') + '</small></div>' +
        '<a class="wa" target="_blank" rel="noopener" href="' + esc(wa(a)) + '">Chamar no WhatsApp</a>' +
        (a.sala ? '<a class="wa" style="background:#fff;color:#14251b" target="_blank" rel="noopener" href="' + esc(a.sala) + '">📹 Chamada</a>' : '') +
        '<button type="button" class="parar" style="background:#ffd23f;color:#14251b" data-atend="' + esc(a.id) + '">✅ Em atendimento</button>' +
        '<button type="button" class="parar" data-parar="' + esc(a.id) + '">Parar alerta</button></div>';
    }).join('') + (somAtivo ? '' : '<button type="button" class="wm-som">🔇 O navegador bloqueou o som. Clique aqui (ou em qualquer lugar da página) para ouvir o alarme.</button>');
    var h = box.getBoundingClientRect().height;
    document.body.style.paddingTop = (h + 8) + 'px';
  }

  function cicloSom() {
    var ativos = alarmes.filter(function (a) { return !parando[a.id]; });
    if (!ativos.length) return;
    if (souLider()) sirene();
  }
  function cicloNotif() {
    var ativos = alarmes.filter(function (a) { return !parando[a.id]; });
    if (!ativos.length || !souLider()) return;
    ativos.forEach(notificaAlarme);
  }
  function piscaTitulo() {
    var ativos = alarmes.filter(function (a) { return !parando[a.id]; });
    if (!ativos.length) { document.title = tituloOriginal; return; }
    document.title = document.title.indexOf('⏰') === 0 ? tituloOriginal : '⏰ ATENDIMENTO ' + ativos[0].hora + ' — ' + ativos[0].nome;
  }

  async function parar(id, botao, acao) {
    parando[id] = true; fechaNotif(id); desenha();
    if (botao) botao.disabled = true;
    try {
      var r = await fetch(API + '?acao=' + (acao || 'parar'), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() }, body: JSON.stringify({ id: id }) });
      if (!r.ok) throw new Error();
      ls('wm-parado-' + id, '1');
      toast(acao ? 'Marcado como em atendimento. O alerta parou para toda a equipe.' : 'Alerta parado para toda a equipe.');
      document.dispatchEvent(new CustomEvent('wm-agenda-mudou'));
    } catch (e) {
      delete parando[id]; desenha(); toast('Não consegui parar o alerta. Verifique a internet e tente de novo.');
    }
  }

  // ---------- pedido de permissão ----------
  function pill() {
    if (!('Notification' in window) || Notification.permission !== 'default' || ls('wm-pill-fechado') === '1' || document.getElementById('wm-pill')) return;
    var p = document.createElement('div'); p.id = 'wm-pill';
    p.innerHTML = '<div>🔔 Ative as notificações para ser avisado dos atendimentos mesmo com o navegador minimizado.</div><div class="row"><button type="button" class="ok">Ativar notificações</button><button type="button" class="no">Agora não</button></div>';
    document.body.appendChild(p);
    p.querySelector('.ok').onclick = function () { liberaSom(); Notification.requestPermission().then(function () { p.remove(); }); };
    p.querySelector('.no').onclick = function () { ls('wm-pill-fechado', '1'); p.remove(); };
  }

  // ---------- trocar senha obrigatória ----------
  function pedeTrocaSenha() {
    if (document.getElementById('wm-senha')) return;
    var w = document.createElement('div'); w.id = 'wm-senha';
    w.innerHTML = '<form><h2>Crie a sua senha</h2><p style="margin:0">Um administrador gerou uma senha temporária para você. Para continuar, crie uma senha só sua.</p>' +
      '<label>Senha temporária<input type="password" name="atual" autocomplete="current-password" required></label>' +
      '<label>Senha nova (mínimo 6 caracteres)<input type="password" name="nova" autocomplete="new-password" minlength="6" required></label>' +
      '<p class="m" role="status"></p><button type="submit">Salvar senha nova</button></form>';
    document.body.appendChild(w);
    var f = w.querySelector('form');
    f.addEventListener('submit', async function (e) {
      e.preventDefault();
      var m = f.querySelector('.m'); m.textContent = '';
      try {
        var r = await fetch('/api/implantacao?acao=trocarsenha', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() }, body: JSON.stringify({ atual: f.atual.value, nova: f.nova.value }) });
        var j = await r.json().catch(function () { return {}; });
        if (!r.ok) throw new Error(j.erro || 'Não foi possível salvar.');
        w.remove(); toast('Senha nova salva!');
      } catch (err) { m.textContent = err.message; }
    });
  }

  // ---------- consulta ----------
  var rodando = false;
  async function consulta() {
    if (rodando || !token()) { if (!token()) { alarmes = []; desenha(); } return; }
    rodando = true;
    try {
      var desde = Number(ls('wm-desde')) || (Date.now() - 2 * 60e3);
      var r = await fetch(API + '?acao=alertas&desde=' + desde, { headers: { Authorization: 'Bearer ' + token() }, cache: 'no-store' });
      if (r.status === 401) { alarmes = []; desenha(); return; }
      if (!r.ok) return;
      var j = await r.json();
      ls('wm-desde', String(j.agora));
      // administradores veem os itens marcados com data-so-admin
      document.querySelectorAll('[data-so-admin]').forEach(function (el) { el.hidden = !j.eu.admin; });
      document.querySelectorAll('[data-so-logado]').forEach(function (el) { el.hidden = false; });
      if (j.eu.trocarSenha) pedeTrocaSenha();
      var antes = {}; alarmes.forEach(function (a) { antes[a.id] = 1; });
      alarmes = j.alarmes || [];
      var ids = {}; alarmes.forEach(function (a) { ids[a.id] = 1; });
      Object.keys(notifs).forEach(function (id) { if (!ids[id]) fechaNotif(id); });
      Object.keys(parando).forEach(function (id) { if (!ids[id]) delete parando[id]; });
      var novoAlarme = alarmes.some(function (a) { return !antes[a.id]; });
      desenha();
      if (novoAlarme) { cicloSom(); cicloNotif(); }
      // agendamento novo
      var vistos = {}; try { vistos = JSON.parse(ls('wm-novos-vistos') || '{}'); } catch (e) {}
      (j.novos || []).forEach(function (n) {
        if (vistos[n.id]) return; vistos[n.id] = Date.now();
        toast('📅 Novo agendamento: ' + n.nome + ' (' + n.loja + ') — ' + n.rotulo + ' às ' + n.hora);
        if (souLider()) {
          bipCurto();
          if (podeNotificar()) { try { var x = new Notification('📅 Novo agendamento', { body: n.nome + ' (' + n.loja + ')\n' + n.rotulo + ' às ' + n.hora, tag: 'wm-novo-' + n.id, icon: '/logo.png' }); x.onclick = function () { window.focus(); location.href = '/agendamentos.html'; }; } catch (e) {} }
        }
        document.dispatchEvent(new CustomEvent('wm-agenda-mudou'));
      });
      Object.keys(vistos).forEach(function (k) { if (Date.now() - vistos[k] > 3 * 86400e3) delete vistos[k]; });
      ls('wm-novos-vistos', JSON.stringify(vistos));
      pill();
    } catch (e) {
    } finally { rodando = false; }
  }

  // ---------- botão de login (Usuários) em todas as páginas do guia ----------
  function botaoLogin() {
    if (document.getElementById('wm-login') || !document.getElementById('wm-login-slot') || /usuarios\.html$/.test(location.pathname)) return;
    var st = document.createElement('style');
    st.textContent =
      '#wm-login{position:absolute;top:calc(14px + env(safe-area-inset-top,0px));right:max(14px,env(safe-area-inset-right,0px));z-index:2147481000;display:inline-flex;align-items:center;gap:8px;' +
      'background:#fff;color:#007a2e;font:800 15px/1 "Figtree","Segoe UI",system-ui,sans-serif;text-decoration:none;border-radius:999px;padding:11px 18px 11px 14px;' +
      'box-shadow:0 3px 0 #007a2e,0 8px 22px rgba(0,0,0,.22);border:2px solid #fff;transition:transform .15s,box-shadow .15s}' +
      '#wm-login:hover{transform:translateY(-1px);box-shadow:0 4px 0 #007a2e,0 10px 26px rgba(0,0,0,.26)}' +
      '#wm-login:focus-visible{outline:3px solid #ffd23f;outline-offset:3px}' +
      '#wm-login .ic{width:28px;height:28px;border-radius:50%;background:#e6f6ec;display:grid;place-items:center;font-size:15px}' +
      '#wm-login small{display:block;font:600 11px/1.1 "Figtree","Segoe UI",sans-serif;color:#4f6357;margin-top:2px}' +
      '@media (max-width:640px){#wm-login{padding:8px 12px 8px 9px;font-size:13px}#wm-login small{display:none}#wm-login .ic{width:24px;height:24px;font-size:13px}}' +
      '#wm-login.no-menu{position:static;padding:5px 15px 5px 6px;font-size:14.5px;box-shadow:0 3px 0 #007a2e;align-self:center;border:0}#wm-login.no-menu .ic{width:26px;height:26px;font-size:14px}' +
      '#wm-login.no-menu small{display:none}' +
      '@media print{#wm-login{display:none}}';
    document.head.appendChild(st);
    var a = document.createElement('a');
    a.id = 'wm-login'; a.href = 'usuarios.html'; a.title = 'Login dos administradores (cadastro de usuários)';
    a.innerHTML = '<span class="ic" aria-hidden="true">🔐</span><span>Login<small>Administradores</small></span>';
    // páginas com um lugar reservado no menu (ex.: home) recebem o botão ali; nas outras ele fica fixo no canto
    var slot = document.getElementById('wm-login-slot');
    // só aparece onde a página reservou um lugar (menu da home); nas outras páginas fica o login da própria página
    if (slot) { a.classList.add('no-menu'); slot.appendChild(a); }
  }

  function inicia() {
    botaoLogin();
    consulta();
    setInterval(consulta, INTERVALO);
    somTimer = setInterval(cicloSom, 4000);       // sirene a cada 4 segundos
    notifTimer = setInterval(cicloNotif, 60000);  // notificação do Windows reaparece a cada minuto
    piscaTimer = setInterval(piscaTitulo, 1000);
    setInterval(function () { if (alarmes.length) desenha(); }, 30000); // atualiza "em X min"
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') consulta(); });
    window.addEventListener('storage', function (e) { if (e.key === 'impl-token') consulta(); });
    window.WMAlertas = {
      atualizar: consulta, liberarSom: liberaSom,
      testar: function () {
        liberaSom(); sirene();
        if (podeNotificar()) { try { new Notification('⏰ Teste de alarme', { body: 'É assim que aparece antes de cada atendimento.', icon: '/logo.png', tag: 'wm-teste' }); } catch (e) {} }
        return podeNotificar();
      },
      pedirPermissao: function () { liberaSom(); return 'Notification' in window ? Notification.requestPermission() : Promise.resolve('denied'); },
    };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inicia); else inicia();
})();
