/* IA WM por voz.
   - Fica ouvindo a palavra "IA" com o reconhecimento de voz do navegador (Chrome/Edge).
   - Ao ouvir "IA" (ou ao clicar no botão), GRAVA a pergunta e manda o ÁUDIO para a IA (Gemini),
     que entende português muito melhor que o reconhecimento do navegador.
   - A resposta aparece só por texto, no chat da IA WM.
   Depende de window.IAWM (abre, envia, enviaAudio) criado pelo chat da IA WM no index.html. */
(function () {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var PODE_GRAVAR = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  var CHAVE = 'ia-voz';
  function pref() { try { return localStorage.getItem(CHAVE); } catch (e) { return null; } }
  function salvaPref(v) { try { localStorage.setItem(CHAVE, v); } catch (e) {} }

  // ================= interface =================
  var css = document.createElement('style');
  css.textContent = [
    '#vz{position:fixed;left:max(18px,env(safe-area-inset-left,0px));bottom:max(18px,env(safe-area-inset-bottom,0px));z-index:9997;display:flex;flex-direction:column;align-items:flex-start;gap:8px;font:15px/1.4 var(--f-body,"Figtree","Segoe UI",system-ui,sans-serif);max-width:min(360px,calc(100vw - 120px))}',
    '#vz .linha{display:flex;align-items:center;gap:6px}',
    '#vz-b{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:999px;padding:9px 14px 9px 10px;font-family:inherit;font-weight:700;font-size:.9rem;cursor:pointer;background:#fff;color:#14251b;box-shadow:0 3px 0 #007a2e,0 6px 18px rgba(0,0,0,.18);text-align:left}',
    '#vz-b:focus-visible,#vz-x:focus-visible{outline:3px solid #ffd23f;outline-offset:2px}',
    '#vz-b .bol{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:#e6f6ec;font-size:15px;flex:none;position:relative}',
    '#vz-b small{display:block;font-weight:600;color:#4f6357;font-size:.72rem;max-width:250px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#vz-x{border:0;width:30px;height:30px;border-radius:50%;background:rgba(20,37,27,.55);color:#fff;font-weight:800;cursor:pointer;line-height:1}',
    '#vz.on #vz-b .bol{background:#00a63e;color:#fff;animation:vzPulso 2s ease-in-out infinite}',
    '#vz.grava #vz-b .bol{background:#e5383b;color:#fff;animation:vzPulsoV .8s ease-in-out infinite}',
    '#vz.pensa #vz-b .bol{background:#ffd23f;color:#14251b;animation:none}',
    '#vz.fala #vz-b .bol{background:#14251b;color:#fff;animation:none}',
    '#vz-nv{position:absolute;inset:-4px;border-radius:50%;border:3px solid #e5383b;opacity:0;transition:transform .08s,opacity .08s}',
    '@keyframes vzPulso{0%,100%{box-shadow:0 0 0 0 rgba(0,166,62,.55)}50%{box-shadow:0 0 0 9px rgba(0,166,62,0)}}',
    '@keyframes vzPulsoV{0%,100%{box-shadow:0 0 0 0 rgba(229,56,59,.6)}50%{box-shadow:0 0 0 9px rgba(229,56,59,0)}}',
    '#vz-t{background:#14251b;color:#fff;border-radius:14px;padding:10px 14px;box-shadow:0 6px 18px rgba(0,0,0,.25);font-size:.92rem}',
    '#vz-t b{color:#4ade80}',
    '#vz-t .acoes{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}',
    '#vz-t button{border:0;border-radius:8px;padding:6px 10px;font-family:inherit;font-weight:700;font-size:.82rem;cursor:pointer;background:#ffd23f;color:#14251b}',
    '#vz-t button.sec{background:rgba(255,255,255,.14);color:#fff}',
    '@media (max-width:560px){#vz{bottom:max(84px,env(safe-area-inset-bottom,0px))}#vz-b small{max-width:170px}}',
    '@media (prefers-reduced-motion:reduce){#vz .bol{animation:none!important}}'
  ].join('\n');
  document.head.appendChild(css);

  var raiz = document.createElement('div');
  raiz.id = 'vz';
  raiz.innerHTML = '<div id="vz-t" role="status" aria-live="polite" hidden></div>' +
    '<div class="linha"><button id="vz-b" type="button"><span class="bol" aria-hidden="true">🎙️<i id="vz-nv"></i></span><span id="vz-l"></span></button>' +
    '<button id="vz-x" type="button" title="Desligar a escuta" aria-label="Desligar a escuta" hidden>✕</button></div>';
  document.body.appendChild(raiz);
  function posiciona() {
    var rq = document.getElementById('rq-btn');
    if (!rq) { raiz.style.bottom = ''; return; }
    var r = rq.getBoundingClientRect();
    if (r.height) raiz.style.bottom = Math.round(window.innerHeight - r.top + 10) + 'px';
  }
  posiciona(); window.addEventListener('resize', posiciona); setTimeout(posiciona, 800);

  var botao = document.getElementById('vz-b'), fechar = document.getElementById('vz-x'),
    balao = document.getElementById('vz-t'), rotulo = document.getElementById('vz-l'), nivel = document.getElementById('vz-nv');

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rot(t, s) { rotulo.innerHTML = '<span>' + t + '</span><small>' + esc(s) + '</small>'; }
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

  if (!PODE_GRAVAR) {
    rot('Falar com a IA', 'Use o Chrome ou o Edge');
    botao.onclick = function () { mostra('O comando de voz funciona no <b>Google Chrome</b> ou no <b>Microsoft Edge</b>. Neste navegador, use o chat da IA WM digitando.', 9000); };
    return;
  }

  // ================= estado =================
  // modo: 'off' | 'ouvindo' (esperando "IA") | 'gravando' (pergunta) | 'pensando' | 'falando'
  var ligado = false, modo = 'off', rec = null, recRodando = false, reinicios = 0, ultimoOuvi = '';

  function estado() {
    raiz.classList.toggle('on', modo === 'ouvindo');
    raiz.classList.toggle('grava', modo === 'gravando');
    raiz.classList.toggle('pensa', modo === 'pensando');
    raiz.classList.toggle('fala', modo === 'falando');
    fechar.hidden = !ligado;
    if (modo === 'gravando') rot('Pode falar…', 'Estou gravando a sua pergunta');
    else if (modo === 'pensando') rot('Pensando…', 'A IA está buscando a resposta');
    else if (modo === 'falando') rot('Respondendo…', 'Clique para parar');
    else if (ligado) rot(SR ? 'Diga "IA" ou clique aqui' : 'Clique aqui e pergunte', ultimoOuvi ? 'Ouvi: "' + ultimoOuvi + '"' : 'Ex.: "IA, como lanço um pedido?"');
    else rot('Falar com a IA', 'Clique e faça a sua pergunta');
  }

  // ================= microfone (um só, reaproveitado) =================
  var stream = null, actx = null, analisador = null;
  async function pegaMic() {
    if (stream && stream.getAudioTracks().some(function (t) { return t.readyState === 'live'; })) return stream;
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    var A = window.AudioContext || window.webkitAudioContext;
    actx = actx || new A();
    if (actx.state === 'suspended') { try { await actx.resume(); } catch (e) {} }
    analisador = actx.createAnalyser(); analisador.fftSize = 1024;
    actx.createMediaStreamSource(stream).connect(analisador);
    return stream;
  }
  var bufNivel = null;
  function volume() {
    if (!analisador) return 0;
    if (!bufNivel) bufNivel = new Float32Array(analisador.fftSize);
    analisador.getFloatTimeDomainData(bufNivel);
    var s = 0; for (var i = 0; i < bufNivel.length; i++) s += bufNivel[i] * bufNivel[i];
    return Math.sqrt(s / bufNivel.length);
  }

  function bipe(f, dur) {
    try {
      var A = window.AudioContext || window.webkitAudioContext; if (!A) return;
      var c = actx || (actx = new A()); if (c.state === 'suspended') c.resume();
      var o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
      o.frequency.value = f || 880; o.type = 'sine';
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.18));
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + (dur || 0.18) + 0.02);
    } catch (e) {}
  }

  // ================= gravar a pergunta =================
  var gravacao = null;
  async function gravaPergunta(textoJa) {
    if (modo === 'gravando' || modo === 'pensando') return;
    paraEscuta();
    calaBoca(true);
    try { await pegaMic(); } catch (e) { erroMic(e); return; }
    modo = 'gravando'; estado(); bipe(880);
    mostra('<b>Pode falar a sua dúvida…</b><br>Quando você parar de falar, eu envio sozinha.', 0, [['✓ Já falei', function () { if (gravacao) gravacao.fim(); }], ['Cancelar', function () { if (gravacao) gravacao.cancela(); }, true]]);

    var tipos = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    var mime = tipos.filter(function (t) { return MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t); })[0] || '';
    var mr = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined);
    var pedacos = [], cancelado = false, falou = false, inicio = Date.now(), ultimaVoz = 0, laco = null;
    // nível de ruído do ambiente para saber o que é voz
    var piso = null;
    mr.ondataavailable = function (e) { if (e.data && e.data.size) pedacos.push(e.data); };
    var feito = new Promise(function (ok) { mr.onstop = ok; });
    gravacao = {
      fim: function () { if (mr.state !== 'inactive') mr.stop(); },
      cancela: function () { cancelado = true; if (mr.state !== 'inactive') mr.stop(); }
    };
    mr.start(250);
    laco = setInterval(function () {
      var v = volume(), agora = Date.now(), t = agora - inicio;
      // ruído do ambiente: acompanha o nível mais baixo (desce rápido, sobe devagar),
      // assim funciona mesmo se a pessoa começar a falar logo depois do bipe
      if (piso === null) piso = Math.min(v, 0.02);
      else piso = v < piso ? v : piso + (v - piso) * 0.004;
      var limiar = Math.max(0.012, piso * 3);
      nivel.style.opacity = Math.min(1, v / (limiar * 2)); nivel.style.transform = 'scale(' + (1 + Math.min(0.6, v * 6)) + ')';
      if (v > limiar) { falou = true; ultimaVoz = agora; }
      if (!falou && t > 8000) gravacao.cancela();                // não falou nada
      else if (falou && agora - ultimaVoz > 1400) gravacao.fim(); // parou de falar
      else if (t > 20000) gravacao.fim();                         // limite de 20 s
    }, 60);
    await feito;
    clearInterval(laco); nivel.style.opacity = 0; gravacao = null;
    if (cancelado || !falou) {
      modo = 'off'; volta();
      mostra(falou ? 'Cancelado.' : 'Não ouvi nenhuma pergunta. Clique no botão ou diga <b>"IA"</b> e tente de novo, mais perto do microfone.', 6000);
      return;
    }
    bipe(660, 0.12);
    var blob = new Blob(pedacos, { type: (mr.mimeType || mime || 'audio/webm').split(';')[0] });
    await pergunta(null, blob, textoJa);
  }

  // ================= perguntar e responder =================
  function blobBase64(b) {
    return new Promise(function (ok, erro) { var r = new FileReader(); r.onload = function () { ok(String(r.result).split(',')[1] || ''); }; r.onerror = erro; r.readAsDataURL(b); });
  }

  async function pergunta(texto, blob, textoJa) {
    if (!window.IAWM) { mostra('O chat da IA WM não carregou. Atualize a página.', 7000); volta(); return; }
    if (IAWM.ocupado && IAWM.ocupado()) { mostra('Ainda estou respondendo a pergunta anterior…', 4000); volta(); return; }
    paraEscuta();
    modo = 'pensando'; estado();
    mostra('<b>Entendendo a sua pergunta…</b>', 0);
    IAWM.abre(true);
    var r;
    try {
      if (blob) r = await IAWM.enviaAudio(await blobBase64(blob), blob.type, textoJa || '');
      else r = { resposta: await IAWM.envia(texto) };
    } catch (e) { r = null; }
    if (r && r.resposta) {
      // responde só por texto, no chat (sem ler em voz alta)
      modo = 'off'; volta();
      mostra('<b>Respondido no chat ✓</b>' + (r.pergunta ? '<br>' + esc(r.pergunta) : ''), 4000);
    } else if (r && r.vazio) {
      modo = 'off'; volta();
      mostra('Não entendi a pergunta no áudio. Tente de novo falando um pouco mais perto do microfone.', 7000);
    } else {
      modo = 'off'; volta();
      var sn = document.getElementById('iawm-sn');
      if (sn && !sn.hidden) mostra('Digite a <b>senha da equipe</b> no chat da IA WM (só uma vez neste computador). Depois é só perguntar de novo.', 10000);
      else mostra('Não consegui responder agora. Veja a mensagem no chat.', 7000);
    }
  }

  function limpaParaFala(t) {
    return String(t)
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/^>\s?/gm, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*(.+?)\*\*/g, '$1').replace(/[*_#]+/g, ' ')
      .replace(/https?:\/\/\S+/g, 'o link que está no chat')
      .replace(/›/g, ', depois ')
      .replace(/^\s*[-•]\s+/gm, '')
      .replace(/^\s*(\d+)[.)]\s+/gm, '$1, ')
      .replace(/\n{2,}/g, '. ').replace(/\n/g, '. ')
      .replace(/\s+/g, ' ').trim();
  }
  function vozPt() {
    var vs = window.speechSynthesis ? speechSynthesis.getVoices() : [];
    var pt = vs.filter(function (v) { return /^pt(-|_)BR/i.test(v.lang); });
    if (!pt.length) pt = vs.filter(function (v) { return /^pt/i.test(v.lang); });
    var boa = pt.filter(function (v) { return /natural|online|google|francisca|thalita|antonio/i.test(v.name); });
    return boa[0] || pt[0] || null;
  }
  if (window.speechSynthesis) speechSynthesis.getVoices();

  function calaBoca(semVoltar) {
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (modo === 'falando') { modo = 'off'; if (!semVoltar) volta(); }
  }

  function fala(texto) {
    var t = limpaParaFala(texto);
    var ua = navigator.userActivation;
    if (!window.speechSynthesis || !t) { modo = 'off'; volta(); return; }
    if (ua && !ua.hasBeenActive) {
      modo = 'off'; volta();
      mostra('A resposta está no chat. Para eu responder <b>em voz alta</b>, clique uma vez em qualquer lugar da página (regra do navegador).', 9000);
      return;
    }
    modo = 'falando'; estado();
    speechSynthesis.cancel();
    var partes = t.match(/[^.!?]+[.!?]*/g) || [t], blocos = [], atual = '';
    partes.forEach(function (p) { if ((atual + p).length > 200) { if (atual) blocos.push(atual); atual = p; } else atual += p; });
    if (atual) blocos.push(atual);
    var v = vozPt(), vigia = null;
    function terminou() { clearInterval(vigia); if (modo === 'falando') { modo = 'off'; esconde(); volta(); } }
    blocos.forEach(function (b, i) {
      var u = new SpeechSynthesisUtterance(b.trim());
      u.lang = 'pt-BR'; if (v) u.voice = v; u.rate = 1.07;
      if (i === blocos.length - 1) { u.onend = terminou; u.onerror = terminou; }
      speechSynthesis.speak(u);
    });
    // o Chrome às vezes não avisa que terminou: confere de tempos em tempos
    vigia = setInterval(function () { if (!speechSynthesis.speaking && !speechSynthesis.pending) terminou(); }, 1000);
  }

  // ================= escuta da palavra "IA" =================
  function normaliza(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[.,!?;:"']+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  // como o Chrome costuma escrever "IA" falado: "IA", "ia", "I.A.", "iá", "eia", e sozinho "e", "é", "ei", "i"
  var SOZINHA = /^(?:(?:ei|hei|hey|oi|ok|ola|alo)\s+)?(?:e|ei|hei|i|ia|iah|hia|eia|ea|e a|i a|ai|ya|yah)$/;
  var PALAVRA = { ia: 1, iah: 1, hia: 1, eia: 1, yah: 1 };
  var VERBO = { eu: 1, ele: 1, ela: 1, voce: 1, gente: 1, que: 1, se: 1, nao: 1, ja: 1, tambem: 1, quem: 1, so: 1, ainda: 1, nunca: 1, sempre: 1, quando: 1, ele: 1, elas: 1, eles: 1 };
  var PERGUNTA = /^(como|qual|quais|onde|quando|quanto|quantos|porque|por|o que|oque|cade|tem|da|pode|me|preciso|quero|explica|fala|mostra|ensina|configura|cadastra|lanca|lancar|faz|fazer)\b/;

  function ativacao(txt) {
    var ws = String(txt).trim().split(/\s+/), nz = ws.map(normaliza), tudo = nz.join(' ');
    if (!tudo) return null;
    if (SOZINHA.test(tudo)) return { resto: '' };
    for (var k = 0; k < ws.length; k++) {
      var n = 0;
      if (PALAVRA[nz[k]] || nz[k] === 'i a') n = 1;
      else if (nz[k] === 'i' && nz[k + 1] === 'a') n = 2;
      if (n && k > 0 && VERBO[nz[k - 1]]) n = 0;
      if (n) return { resto: ws.slice(k + n).join(' ').replace(/^[\s,.!?:;-]+/, '').trim() };
    }
    // "e como lanço...", "é qual a barra..." — o "IA" virou "e" no começo da frase
    if (ws.length > 1 && /^(e|ei|hei)$/.test(nz[0])) {
      var resto = nz.slice(1).join(' ');
      if (nz[1] === 'a' && ws.length > 2) return { resto: ws.slice(2).join(' ') };
      if (PERGUNTA.test(resto)) return { resto: ws.slice(1).join(' ') };
    }
    return null;
  }

  function criaRec() {
    if (!SR) return null;
    var r = new SR();
    r.lang = 'pt-BR'; r.continuous = true; r.interimResults = true; r.maxAlternatives = 3;
    r.onstart = function () { recRodando = true; };
    r.onend = function () {
      recRodando = false;
      if (ligado && modo === 'ouvindo' && !document.hidden) setTimeout(escuta, reinicios++ > 30 ? 1500 : 200);
    };
    r.onerror = function (e) {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        desliga(true);
        mostra('O navegador bloqueou o microfone. Clique no <b>cadeado</b> ao lado do endereço do site, permita o <b>Microfone</b> e tente de novo.', 12000);
      } else if (e.error === 'audio-capture') {
        mostra('Não encontrei microfone. Confira se ele está conectado e escolhido no ícone 🎙️ da barra de endereço.', 9000);
      }
    };
    r.onresult = function (ev) {
      if (modo !== 'ouvindo') return;
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        var res = ev.results[i], alts = [];
        for (var k = 0; k < res.length; k++) alts.push(res[k].transcript);
        var txt = alts[0].trim();
        if (txt) { ultimoOuvi = txt.length > 42 ? '…' + txt.slice(-42) : txt; estado(); }
        // reage já no texto parcial para não perder o começo da pergunta
        var a = null;
        for (var j = 0; j < alts.length && !a; j++) a = ativacao(alts[j]);
        if (!a) continue;
        if (!res.isFinal && a.resto === '' && !SOZINHA.test(normaliza(txt))) continue;
        if (!res.isFinal && a.resto) continue; // espera a frase terminar
        ultimoOuvi = '';
        if (res.isFinal && a.resto.replace(/[^\p{L}\p{N}]/gu, '').length >= 8) {
          // a pergunta veio junto ("IA, como lanço um pedido?")
          var q = a.resto.charAt(0).toUpperCase() + a.resto.slice(1);
          if (!/[?.!]$/.test(q)) q += '?';
          bipe(880); pergunta(q);
        } else {
          gravaPergunta(a.resto);
        }
        return;
      }
    };
    return r;
  }

  function escuta() {
    if (!SR || !ligado || recRodando || document.hidden) return;
    modo = 'ouvindo'; estado();
    if (!rec) rec = criaRec();
    try { rec.start(); recRodando = true; } catch (e) {}
  }
  function paraEscuta() { if (rec && recRodando) { try { rec.abort(); } catch (e) {} } recRodando = false; }
  function volta() {
    if (ligado && SR) { modo = 'ouvindo'; estado(); setTimeout(escuta, 300); }
    else { modo = 'off'; estado(); }
  }

  function erroMic(e) {
    modo = 'off'; estado();
    var n = e && e.name;
    if (n === 'NotAllowedError' || n === 'SecurityError') mostra('O microfone está bloqueado. Clique no <b>cadeado</b> ao lado do endereço do site e permita o <b>Microfone</b>.', 12000);
    else if (n === 'NotFoundError') mostra('Não encontrei microfone neste computador. Confira se ele está conectado.', 9000);
    else mostra('Não consegui usar o microfone (' + esc(n || 'erro') + '). Feche outros programas que estejam usando o microfone e tente de novo.', 9000);
  }

  async function liga(manual) {
    try { await pegaMic(); } catch (e) { erroMic(e); return false; }
    ligado = true; salvaPref('1');
    if (SR) escuta(); else { modo = 'off'; estado(); }
    if (manual) mostra(SR ? '<b>Pronto!</b> Fale <b>"IA"</b> e depois a sua dúvida, ou clique no botão e pergunte.' : '<b>Pronto!</b> Clique no botão sempre que quiser perguntar falando.', 6000);
    return true;
  }
  function desliga(lembrar) {
    ligado = false; if (lembrar) salvaPref('0');
    if (gravacao) gravacao.cancela();
    calaBoca(true); paraEscuta(); modo = 'off'; estado();
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
  }

  // ================= botões =================
  botao.onclick = async function () {
    if (modo === 'falando') { calaBoca(); esconde(); return; }
    if (modo === 'gravando') { if (gravacao) gravacao.fim(); return; }
    if (modo === 'pensando') return;
    if (!ligado) { if (!(await liga(false))) return; }
    gravaPergunta('');
  };
  fechar.onclick = function () { desliga(true); mostra('Escuta desligada. Clique em "Falar com a IA" quando quiser perguntar.', 5000); };
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (modo === 'falando') calaBoca(); else if (gravacao) gravacao.cancela(); }
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (modo === 'ouvindo') paraEscuta(); }
    else if (ligado && modo === 'ouvindo') escuta();
  });

  // ================= liga sozinha quando já foi permitido =================
  estado();
  (function auto() {
    if (pref() === '0') return;
    var q = navigator.permissions && navigator.permissions.query ? navigator.permissions.query({ name: 'microphone' }) : Promise.reject();
    q.then(function (p) {
      if (p.state === 'granted' && pref() === '1') liga(false);
      else if (p.state !== 'denied' && pref() !== '1') {
        mostra('🎙️ Quer perguntar <b>falando</b>? Ative o microfone uma vez. Depois é só dizer <b>"IA"</b> e a sua dúvida, sem apertar nada.', 12000,
          [['Ativar agora', function () { esconde(); liga(true); }], ['Agora não', function () { salvaPref('0'); esconde(); }, true]]);
      }
    }).catch(function () { if (pref() === '1') liga(false); });
  })();

  window.IAVoz = {
    liga: liga, desliga: desliga, pergunta: pergunta, gravar: gravaPergunta, ativacao: ativacao,
    estado: function () { return { ligado: ligado, modo: modo, rodando: recRodando }; }
  };
})();
