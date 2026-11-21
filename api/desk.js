// API do WhatsMenuDesk (acesso remoto).
// O programa do cliente (WhatsMenuDesk.exe) e a página do suporte (desk.html) trocam aqui só as
// mensagens de conexão. A imagem da tela, o mouse e o teclado vão direto entre os dois (WebRTC).
//
// Regras de segurança:
//  - só quem tem login da equipe consegue pedir acesso;
//  - é preciso o ID e a senha que aparecem na tela do cliente (a senha muda a cada sessão);
//  - o cliente sempre precisa clicar em "Permitir";
//  - toda sessão fica registrada no histórico (quem acessou, qual computador, quanto tempo).
//
// Opcional no Vercel: TURN_URL, TURN_USUARIO, TURN_SENHA (redes muito fechadas).

const crypto = require('crypto');
const { cfg, redis, lerBody, limpa, equipeLogada } = require('./_equipe.js');

const K = {
  disp: (id) => 'desk:disp:' + id,          // computador registrado (segredo do aparelho)
  on: (id) => 'desk:on:' + id,              // online agora + senha da sessão (expira sozinho)
  cxA: (id) => 'desk:cxa:' + id,            // caixa de entrada do programa do cliente
  cxT: (sid) => 'desk:cxt:' + sid,          // caixa de entrada do suporte
  sess: (sid) => 'desk:sess:' + sid,
  fim: (sid) => 'desk:fim:' + sid,
  tent: (id) => 'desk:tent:' + id,
  ip: (ip) => 'desk:ip:' + ip + ':' + new Date().toISOString().slice(0, 13),
  log: 'desk:log',
};
const ID_RE = /^\d{9}$/;
const SID_RE = /^[a-f0-9]{24}$/;
const ESPERA = 8; // segundos de espera nas buscas de mensagens
let semBloqueio = false; // vira true se o banco não aceitar BLPOP

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const igual = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const q = (req, k) => String((req.query && req.query[k]) || new URL(req.url, 'http://x').searchParams.get(k) || '');
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));

function ice() {
  const lista = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  if (process.env.TURN_URL) lista.push({ urls: process.env.TURN_URL.split(',').map((u) => u.trim()), username: process.env.TURN_USUARIO || '', credential: process.env.TURN_SENHA || '' });
  return lista;
}

function cors(req, res) {
  const o = String(req.headers.origin || '');
  if (/^http:\/\/(127\.0\.0\.1|localhost):\d{2,5}$/.test(o)) {
    res.setHeader('Access-Control-Allow-Origin', o);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '600');
  }
}

async function empurra(chave, msg) {
  await redis(['RPUSH', chave, JSON.stringify(msg)]);
  await redis(['EXPIRE', chave, String(12 * 3600)]);
}

/** Espera até ESPERA segundos por mensagens numa caixa e devolve todas. */
async function recebe(chave, req, res) {
  const out = [];
  let caiu = false;
  const marca = () => { if (!res || !res.writableFinished) caiu = true; };
  const ouve = res && typeof res.on === 'function';
  if (ouve) res.on('close', marca);
  const drena = async () => {
    const resto = (await redis(['LRANGE', chave, '0', '-1'])) || [];
    if (resto.length) await redis(['LTRIM', chave, String(resto.length), '-1']);
    resto.forEach((x) => out.push(x));
  };
  if (!semBloqueio) {
    try {
      const r = await redis(['BLPOP', chave, String(ESPERA)]);
      if (r && r[1]) { out.push(r[1]); await drena(); }
    } catch (e) {
      semBloqueio = true;
    }
  }
  if (semBloqueio) {
    for (let i = 0; i < 4 && !out.length; i++) { await drena(); if (!out.length) await dorme(1500); }
  }
  if (ouve) res.removeListener('close', marca);
  // quem pediu já desconectou (janela fechada, rede caiu): devolve as mensagens para a fila
  if (caiu && out.length) {
    await redis(['LPUSH', chave, ...out.slice().reverse()]);
    return [];
  }
  return out.map((x) => { try { return JSON.parse(x); } catch (e) { return null; } }).filter(Boolean);
}

async function aparelho(b) {
  const id = limpa(b.id, 9), seg = limpa(b.segredo, 64);
  if (!ID_RE.test(id) || !seg) return null;
  const raw = await redis(['GET', K.disp(id)]);
  if (!raw) return null;
  const d = JSON.parse(raw);
  return igual(d.h, sha(seg)) ? Object.assign(d, { id }) : null;
}

async function registraFim(sid, resultado, quem) {
  if ((await redis(['SET', K.fim(sid), '1', 'NX', 'EX', String(48 * 3600)])) !== 'OK') return;
  const raw = await redis(['GET', K.sess(sid)]);
  if (!raw) return;
  const s = JSON.parse(raw);
  const agora = Date.now();
  await redis(['LPUSH', K.log, JSON.stringify({
    sid, id: s.id, nomePC: s.nomePC, tecnico: s.tecnicoNome, usuario: s.tecnico, pedido: s.criado,
    inicio: s.inicio || null, fim: agora, segundos: s.inicio ? Math.round((agora - s.inicio) / 1000) : 0,
    resultado: s.resultado || resultado, encerradoPor: quem || '',
  })]);
  await redis(['LTRIM', K.log, '0', '499']);
}

module.exports = async function handler(req, res) {
  cors(req, res);
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).send('');
  const { url, token } = cfg();
  if (!url || !token) return res.status(500).json({ erro: 'Sem banco de dados conectado.' });

  try {
    const acao = q(req, 'acao');
    const b = req.method === 'GET' ? {} : lerBody(req);
    const ip = String(req.headers['x-forwarded-for'] || 'anon').split(',')[0].trim();

    // ================= programa do cliente =================
    if (acao === 'registrar' && req.method === 'POST') {
      const n = await redis(['INCR', K.ip(ip)]); if (n === 1) await redis(['EXPIRE', K.ip(ip), '3700']);
      if (n > 30) return res.status(429).json({ erro: 'Muitos registros deste endereço. Tente mais tarde.' });
      const segredo = crypto.randomBytes(24).toString('hex');
      for (let i = 0; i < 10; i++) {
        const id = String(100000000 + crypto.randomInt(899999999));
        const ok = await redis(['SET', K.disp(id), JSON.stringify({ h: sha(segredo), nome: limpa(b.nome, 60), so: limpa(b.so, 40), criado: Date.now() }), 'NX']);
        if (ok === 'OK') return res.status(200).json({ id, segredo });
      }
      return res.status(500).json({ erro: 'Não foi possível gerar o ID. Tente de novo.' });
    }

    if (acao === 'ping' && req.method === 'POST') {
      const d = await aparelho(b);
      if (!d) return res.status(401).json({ erro: 'Aparelho não reconhecido.', registrar: true });
      const senhaHash = limpa(b.senhaHash, 64), sal = limpa(b.sal, 32);
      if (!/^[a-f0-9]{64}$/.test(senhaHash) || !sal) return res.status(400).json({ erro: 'Senha inválida.' });
      await redis(['SET', K.on(d.id), JSON.stringify({ senhaHash, sal, nome: limpa(b.nome, 60) || d.nome, versao: limpa(b.versao, 20), ts: Date.now() }), 'EX', '50']);
      return res.status(200).json({ ok: true, ice: ice() });
    }

    if (acao === 'agente-receber' && req.method === 'POST') {
      const d = await aparelho(b);
      if (!d) return res.status(401).json({ erro: 'Aparelho não reconhecido.', registrar: true });
      return res.status(200).json({ msgs: await recebe(K.cxA(d.id), req, res) });
    }

    if (acao === 'agente-enviar' && req.method === 'POST') {
      const d = await aparelho(b);
      if (!d) return res.status(401).json({ erro: 'Aparelho não reconhecido.' });
      const sid = limpa(b.sid, 24);
      const raw = SID_RE.test(sid) && (await redis(['GET', K.sess(sid)]));
      if (!raw) return res.status(404).json({ erro: 'Sessão não encontrada.' });
      const s = JSON.parse(raw);
      if (s.id !== d.id) return res.status(403).json({ erro: 'Sessão de outro aparelho.' });
      const m = b.m || {};
      if (JSON.stringify(m).length > 60000) return res.status(413).json({ erro: 'Mensagem grande demais.' });
      if (m.t === 'resposta') {
        s.resultado = m.ok ? 'aceito' : (m.motivo || 'recusado');
        if (m.ok) s.inicio = Date.now();
        await redis(['SET', K.sess(sid), JSON.stringify(s), 'EX', String(12 * 3600)]);
        if (!m.ok) await registraFim(sid, s.resultado, 'cliente');
      }
      if (m.t === 'bye') await registraFim(sid, 'aceito', 'cliente');
      await empurra(K.cxT(sid), m);
      return res.status(200).json({ ok: true });
    }

    // ================= suporte (login da equipe) =================
    const eu = await equipeLogada(req);
    if (!eu) return res.status(401).json({ erro: 'Entre com seu login da equipe.' });

    if (acao === 'conectar' && req.method === 'POST') {
      const id = String(b.id || '').replace(/\D/g, '');
      const senha = String(b.senha || '').trim().toLowerCase();
      if (!ID_RE.test(id)) return res.status(400).json({ erro: 'O ID tem 9 números.' });
      const t = await redis(['INCR', K.tent(id)]); if (t === 1) await redis(['EXPIRE', K.tent(id), '600']);
      if (t > 10) return res.status(429).json({ erro: 'Muitas tentativas para este ID. Espere 10 minutos.' });
      const raw = await redis(['GET', K.on(id)]);
      if (!raw) return res.status(404).json({ erro: 'Esse computador não está online. Peça para o cliente abrir o WhatsMenuDesk e conferir o ID.' });
      const on = JSON.parse(raw);
      if (!igual(on.senhaHash, sha(on.sal + senha))) return res.status(403).json({ erro: 'Senha incorreta. Confira a senha que aparece na tela do cliente.' });
      await redis(['DEL', K.tent(id)]);
      const sid = crypto.randomBytes(12).toString('hex');
      await redis(['SET', K.sess(sid), JSON.stringify({ id, tecnico: eu.usuario, tecnicoNome: eu.nome, nomePC: on.nome, criado: Date.now() }), 'EX', String(12 * 3600)]);
      await empurra(K.cxA(id), { t: 'pedido', sid, nome: eu.nome });
      return res.status(200).json({ sid, nomePC: on.nome, ice: ice() });
    }

    if ((acao === 'tecnico-enviar' || acao === 'tecnico-receber' || acao === 'encerrar') && req.method === 'POST') {
      const sid = limpa(b.sid, 24);
      const raw = SID_RE.test(sid) && (await redis(['GET', K.sess(sid)]));
      if (!raw) return res.status(404).json({ erro: 'Sessão não encontrada.' });
      const s = JSON.parse(raw);
      if (s.tecnico !== eu.usuario) return res.status(403).json({ erro: 'Esta sessão é de outra pessoa.' });

      if (acao === 'tecnico-receber') return res.status(200).json({ msgs: await recebe(K.cxT(sid), req, res) });

      if (acao === 'tecnico-enviar') {
        const m = b.m || {};
        if (JSON.stringify(m).length > 60000) return res.status(413).json({ erro: 'Mensagem grande demais.' });
        await empurra(K.cxA(s.id), { t: 'sinal', sid, m });
        return res.status(200).json({ ok: true });
      }

      // encerrar
      await empurra(K.cxA(s.id), { t: 'sinal', sid, m: { t: 'bye' } });
      await registraFim(sid, s.resultado || 'sem resposta', eu.nome);
      return res.status(200).json({ ok: true });
    }

    if (acao === 'historico' && req.method === 'GET') {
      if (!eu.admin) return res.status(403).json({ erro: 'Só administradores veem o histórico.' });
      const lista = ((await redis(['LRANGE', K.log, '0', '199'])) || []).map((x) => { try { return JSON.parse(x); } catch (e) { return null; } }).filter(Boolean);
      return res.status(200).json({ lista });
    }

    return res.status(405).json({ erro: 'Ação não reconhecida.' });
  } catch (e) {
    return res.status(500).json({ erro: 'Falha no WhatsMenuDesk: ' + e.message });
  }
};
