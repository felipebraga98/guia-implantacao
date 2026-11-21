/* IA WM por voz — fale "IA, ..." e ela responde.
   Usa o reconhecimento de voz do próprio navegador (Chrome/Edge) e lê a resposta em voz alta.
   Depende de window.IAWM (abre, envia) criado pelo chat da IA WM no index.html. */
(function () {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var CHAVE = 'ia-voz';
  function pref() { try { return localStorage.getItem(CHAVE); } catch (e) { return null; } }
  function salvaPref(v) { try { localStorage.setItem(CHAVE, v); } catch (e) {} }

  // ---------- interface ----------
  var css = document.createElement('style');
  css.textContent = [
    '#vz{position:fixed;left:max(18px,env(safe-area-inset-left,0px));bottom:max(18px,env(safe-area-inset-bottom,0px));z-index:9997;display:flex;flex-direction:column;align-items:flex-start;gap:8px;font:15px/1.4 var(--f-body,"Figtree","Segoe UI",system-ui,sans-serif);max-width:min(340px,calc(100vw - 120px))}',
    '#vz-b{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:999px;padding:9px 14px 9px 10px;font-family:inherit;font-weight:700;font-size:.9rem;cursor:pointer;background:#fff;color:#14251b;box-shadow:0 3px 0 #007a2e,0 6px 18px rgba(0,0,0,.18)}',
    '#vz-b:focus-visible{outline:3px solid #ffd23f;outline-offset:2px}',
    '#vz-b .bol{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:#e6f6ec;font-size:15px;flex:none}',
    '#vz-b small{display:block;font-weight:600;color:#4f6357;font-size:.72rem}',
    '#vz.on #vz-b .bol{background:#00a63e;color:#fff;animation:vzPulso 2s ease-in-out infinite}',
    '#vz.esc #vz-b .bol{background:#ffd23f;color:#14251b;animation:vzPulso .7s ease-in-out infinite}',
    '#vz.fala #vz-b .bol{background:#14251b;color:#fff;animation:none}',
    '@keyframes vzPulso{0%,100%{box-shadow:0 0 0 0 rgba(0,166,62,.55)}50%{box-shadow:0 0 0 9px rgba(0,166,62,0)}}',
    '#vz-t{background:#14251b;color:#fff;border-radius:14px;padding:10px 14px;box-shadow:0 6px 18px rgba(0,0,0,.25);font-size:.92rem}',
    '#vz-t b{color:#4ade80}',
    '#vz-t .acoes{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}',
    '#vz-t button{border:0;border-radius:8px;padding:6px 10px;font-family:inherit;font-weight:700;font-size:.82rem;cursor:pointer;background:#ffd23f;color:#14251b}',
    '#vz-t button.sec{background:rgba(255,255,255,.14);color:#fff}',
    '@media (max-width:560px){#vz{bottom:max(84px,env(safe-area-inset-bottom,0px))}#vz-b small{display:none}}',
    '@media (prefers-reduced-motion:reduce){#vz .bol{animation:none!important}}'
  ].join('\n');
  document.head.appendChild(css);

  var raiz = document.createElement('div');
  raiz.id = 'vz';
  raiz.innerHTML = '<div id="vz-t" role="status" aria-live="polite" hidden></div>' +
    '<button id="vz-b" type="button" aria-pressed="false"><span class="bol" aria-hidden="true">🎙️</span><span id="vz-l"><span>Falar com a IA</span><small>Diga "IA" e a sua dúvida</small></span></button>';
  document.body.appendChild(raiz);
  // fica logo acima do botão de Respostas rápidas (canto inferior esquerdo)
  function posiciona() {
    var rq = document.getElementById('rq-btn');
    if (!rq || rq.hidden || !rq.offsetParent && getComputedStyle(rq).position !== 'fixed') { raiz.style.bottom = ''; return; }
    var r = rq.getBoundingClientRect();
    if (r.height) raiz.style.bottom = Math.round(window.innerHeight - r.top + 10) + 'px';
  }
  posiciona(); window.addEventListener('resize', posiciona); setTimeout(posiciona, 800);
  var botao = document.getElementById('vz-b'), balao = document.getElementById('vz-t'), rotulo = document.getElementById('vz-l');

  function rot(t, s) { rotulo.innerHTML = '<span>' + t + '</span><small>' + s + '</small>'; }
  var tBalao = null;
  function mostra(html, ms, acoes) {
    clearTimeout(tBalao);
    balao.innerHTML = html;
    if (acoes) {
      var d = document.createElement('div'); d.className = 'acoes';
      acoes.forEach(function (a) { var b = document.createElement('button'); b.type = 'button'; b.textContent = a[0]; if (a[2]) b.className = 'sec'; b.onclick = a[1]; d.appendChild(b); });
      balao.appendChild(d);
    }
    balao.hidden = false;
    if (ms) tBalao = setTimeout(function () { balao.hidden = true; }, ms);
  }
  function esconde() { clearTimeout(tBalao); balao.hidden = true; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  if (!SR) {
    botao.onclick = function () {
      mostra('O comando de voz funciona no <b>Google Chrome</b> ou no <b>Microsoft Edge</b> no computador. Neste navegador, use o chat da IA WM digitando.', 9000);
    };
    return;
  }

  // ---------- estado ----------
  var ligado = false, rodando = false, esperandoPergunta = false, tEspera = null, falando = false, reinicios = 0;
  var rec = new SR();
  rec.lang = 'pt-BR';
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 3;

  function estado() {
    raiz.classList.toggle('on', ligado && !esperandoPergunta && !falando);
    raiz.classList.toggle('esc', ligado && esperandoPergunta);
    raiz.classList.toggle('fala', falando);
    botao.setAttribute('aria-pressed', ligado ? 'true' : 'false');
    if (falando) rot('Respondendo…', 'Clique para parar');
    else if (!ligado) rot('Falar com a IA', 'Diga "IA" e a sua dúvida');
    else if (esperandoPergunta) rot('Pode falar…', 'Estou ouvindo a sua dúvida');
    else rot('Ouvindo "IA"', 'Ex.: "IA, como lanço um pedido?"');
  }

  function inicia() {
    if (rodando || !ligado || falando) return;
    try { rec.start(); rodando = true; } catch (e) { /* já iniciado */ }
  }
  function para() { try { rec.abort(); } catch (e) {} rodando = false; }

  function liga(manual) {
    ligado = true; salvaPref('1'); estado(); inicia();
    if (manual) mostra('<b>Pronto!</b> Agora é só falar <b>"IA"</b> e a sua dúvida. Ex.: <i>"IA, como lanço um pedido?"</i>', 7000);
  }
  function desliga(lembrar) {
    ligado = false; esperandoPergunta = false; clearTimeout(tEspera);
    if (lembrar) salvaPref('0');
    calaBoca(); para(); estado();
  }

  rec.onstart = function () { rodando = true; };
  rec.onend = function () {
    rodando = false;
    // o Chrome desliga sozinho depois de um tempo: religa para continuar ouvindo
    if (ligado && !falando) setTimeout(inicia, reinicios++ > 20 ? 1500 : 250);
  };
  rec.onerror = function (e) {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      desliga(true);
      mostra('O navegador bloqueou o microfone. Clique no <b>cadeado</b> ao lado do endereço do site, permita o <b>Microfone</b> e clique em "Falar com a IA" de novo.', 12000);
    } else if (e.error === 'audio-capture') {
      desliga(false);
      mostra('Não encontrei microfone neste computador. Confira se ele está conectado.', 9000);
    } else if (e.error === 'network') {
      mostra('O reconhecimento de voz precisa de internet. Tentando de novo…', 5000);
    }
  };

  // ---------- palavra de ativação ----------
  function normaliza(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[.,!?;:]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  // aceita "IA", "I.A.", "iá", "ei IA", "oi IA", "ok IA" no começo da frase
  var ATIVA = /^(?:(?:ei|hey|oi|ok|ola|e)\s+)?(?:ia|i a|iah|yah|ya|hia|eia|ea)(?:\s+|$)(.*)$/;
  var PARAR = /^(?:(?:ia\s+)?(?:para|pare|parar|chega|silencio|cala a boca|obrigad[oa]|valeu))$/;

  // procura a palavra "IA" em qualquer ponto da frase (o Chrome do computador às vezes junta
  // a fala anterior na mesma frase) e pega tudo o que vem depois como pergunta
  var PALAVRAS = { ia: 1, iah: 1, hia: 1, eia: 1, yah: 1 };
  var VERBO = { eu: 1, ele: 1, ela: 1, voce: 1, gente: 1, que: 1, se: 1, nao: 1, ja: 1, tambem: 1, quem: 1, so: 1, ainda: 1, nunca: 1, sempre: 1, quando: 1 };
  function confereAtivacao(alts) {
    for (var i = 0; i < alts.length; i++) {
      var ws = String(alts[i]).trim().split(/\s+/), nz = ws.map(normaliza);
      for (var k = 0; k < ws.length; k++) {
        var achou = 0;
        if (PALAVRAS[nz[k]]) achou = 1;
        else if (nz[k] === 'i a') achou = 1;
        else if (nz[k] === 'i' && nz[k + 1] === 'a') achou = 2;
        // "eu ia...", "ele ia..." é o verbo ir, não a IA
        if (achou && k > 0 && VERBO[nz[k - 1]]) achou = 0;
        if (achou) return { ok: true, resto: ws.slice(k + achou).join(' ').replace(/^[\s,.!?:;-]+/, '').trim() };
      }
    }
    return { ok: false };
  }

  function bipe(f) {
    try {
      var A = window.AudioContext || window.webkitAudioContext; if (!A) return;
      var c = bipe.c || (bipe.c = new A()); if (c.state === 'suspended') c.resume();
      var o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
      o.frequency.value = f || 880; o.type = 'sine';
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.2);
    } catch (e) {}
  }

  var tOuvi = null;
  function ouvi(t) {
    if (!t || esperandoPergunta || falando) return;
    var sm = rotulo.querySelector('small'); if (!sm) return;
    sm.textContent = 'Ouvi: "' + (t.length > 40 ? '…' + t.slice(-40) : t) + '"';
    clearTimeout(tOuvi); tOuvi = setTimeout(estado, 4000);
  }
  function aguardaPergunta() {
    esperandoPergunta = true; estado(); bipe(880);
    mostra('<b>Oi!</b> Pode falar a sua dúvida…', 0);
    clearTimeout(tEspera);
    tEspera = setTimeout(function () { esperandoPergunta = false; estado(); esconde(); }, 9000);
  }

  rec.onresult = function (ev) {
    if (falando) return;
    for (var i = ev.resultIndex; i < ev.results.length; i++) {
      var r = ev.results[i], alts = [];
      for (var k = 0; k < r.length; k++) alts.push(r[k].transcript);
      var txt = alts[0].trim();
      ouvi(txt);
      if (!r.isFinal) {
        if (esperandoPergunta && txt) mostra('<b>Ouvindo:</b> ' + esc(txt) + '…', 0);
        continue;
      }
      if (!txt) continue;
      if (esperandoPergunta) {
        clearTimeout(tEspera); esperandoPergunta = false; estado();
        if (PARAR.test(normaliza(txt))) { esconde(); continue; }
        // se a pessoa repetiu "IA, ..." aproveita só a pergunta
        var a0 = confereAtivacao(alts);
        pergunta(a0.ok && a0.resto ? a0.resto : txt);
        continue;
      }
      var a = confereAtivacao(alts);
      if (!a.ok) continue;
      if (PARAR.test(normaliza(txt))) { calaBoca(); continue; }
      if (a.resto.replace(/[^\p{L}\p{N}]/gu, '').length >= 3) { bipe(880); pergunta(a.resto); }
      else aguardaPergunta();
    }
  };

  // ---------- perguntar e responder ----------
  function limpaParaFala(t) {
    return String(t)
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*(.+?)\*\*/g, '$1').replace(/[*_#>]+/g, ' ')
      .replace(/https?:\/\/\S+/g, 'o link que está no chat')
      .replace(/^\s*[-•]\s+/gm, '')
      .replace(/^\s*(\d+)[.)]\s+/gm, '$1, ')
      .replace(/\n{2,}/g, '. ').replace(/\n/g, '. ')
      .replace(/\s+/g, ' ').trim();
  }
  function vozPt() {
    var vs = window.speechSynthesis ? speechSynthesis.getVoices() : [];
    var pt = vs.filter(function (v) { return /^pt(-|_)BR/i.test(v.lang); });
    if (!pt.length) pt = vs.filter(function (v) { return /^pt/i.test(v.lang); });
    var pref = pt.filter(function (v) { return /natural|online|google|francisca|thalita|antonio/i.test(v.name); });
    return pref[0] || pt[0] || null;
  }
  if (window.speechSynthesis) { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = function () {}; }

  function calaBoca() {
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (falando) { falando = false; estado(); setTimeout(inicia, 300); }
  }
  function podeFalar() {
    var ua = navigator.userActivation;
    return !ua || ua.hasBeenActive;
  }

  function fala(texto) {
    if (!window.speechSynthesis) return;
    var t = limpaParaFala(texto);
    if (!t) return;
    if (!podeFalar()) {
      mostra('A resposta está no chat. Para eu responder <b>em voz alta</b>, clique uma vez em qualquer lugar da página (regra do navegador).', 9000);
      return;
    }
    falando = true; estado(); para(); // não ouvir a própria voz
    speechSynthesis.cancel();
    // falas longas travam no Chrome: divide em frases
    var partes = t.match(/[^.!?]+[.!?]*/g) || [t], blocos = [], atual = '';
    partes.forEach(function (p) { if ((atual + p).length > 220) { if (atual) blocos.push(atual); atual = p; } else atual += p; });
    if (atual) blocos.push(atual);
    var v = vozPt();
    blocos.forEach(function (b, i) {
      var u = new SpeechSynthesisUtterance(b.trim());
      u.lang = 'pt-BR'; if (v) u.voice = v; u.rate = 1.05;
      if (i === blocos.length - 1) u.onend = u.onerror = function () { if (falando) { falando = false; estado(); esconde(); setTimeout(inicia, 300); } };
      speechSynthesis.speak(u);
    });
  }

  async function pergunta(q) {
    q = q.replace(/^[\s,.:;-]+/, '').trim();
    if (!q) return;
    q = q.charAt(0).toUpperCase() + q.slice(1);
    if (!/[?.!]$/.test(q)) q += '?';
    if (!window.IAWM) { mostra('O chat da IA WM não carregou. Atualize a página.', 7000); return; }
    if (IAWM.ocupado && IAWM.ocupado()) { mostra('Ainda estou respondendo a pergunta anterior…', 4000); return; }
    mostra('<b>Você:</b> ' + esc(q) + '<br>Pensando…', 0);
    IAWM.abre(true);
    var resp = await IAWM.envia(q);
    if (resp) {
      mostra('<b>Respondendo…</b> a resposta completa está no chat.', 0, [['⏹ Parar', calaBoca], ['Desligar voz', function () { desliga(true); esconde(); }, true]]);
      fala(resp);
    } else {
      var sn = document.getElementById('iawm-sn');
      if (sn && !sn.hidden) mostra('Digite a <b>senha da equipe</b> no chat da IA WM (só uma vez). Depois é só perguntar de novo falando.', 10000);
      else mostra('Não consegui responder agora. Veja a mensagem no chat.', 7000);
    }
  }

  // ---------- botão ----------
  botao.onclick = function () {
    if (falando) { calaBoca(); esconde(); return; }
    if (ligado) { desliga(true); mostra('Comando de voz desligado. Clique de novo para ligar.', 4000); return; }
    bipe(660);
    liga(true);
  };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && falando) calaBoca(); });

  // ---------- liga sozinho quando já foi permitido ----------
  function autoLigar() {
    if (pref() === '0') { estado(); return; }
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' }).then(function (p) {
        if (p.state === 'granted' && pref() === '1') liga(false);
        else if (p.state === 'denied') estado();
        else {
          estado();
          mostra('🎙️ Quer perguntar <b>falando</b>? Clique em <b>"Falar com a IA"</b> e permita o microfone. Depois é só dizer <b>"IA, …"</b> sem apertar nada.', 10000, [['Ativar agora', function () { esconde(); bipe(660); liga(true); }], ['Agora não', function () { salvaPref('0'); esconde(); }, true]]);
        }
      }).catch(function () { if (pref() === '1') liga(false); else estado(); });
    } else if (pref() === '1') liga(false);
    else estado();
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (rodando) para(); }
    else if (ligado) inicia();
  });
  estado();
  autoLigar();

  window.IAVoz = { liga: liga, desliga: desliga, pergunta: pergunta, estado: function () { return { ligado: ligado, rodando: rodando, esperando: esperandoPergunta, falando: falando }; } };
})();
