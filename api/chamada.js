// Sinalização da chamada de vídeo WhatsMenu (chamada.html).
// O vídeo e o áudio vão direto entre os navegadores (WebRTC). Este endereço só troca as
// mensagens de conexão, usando o mesmo banco Upstash. Cada agendamento tem uma sala própria.
//
// Opcional no Vercel, para redes muito fechadas (empresas, alguns 4G):
//   TURN_URL, TURN_USUARIO, TURN_SENHA  -> servidor TURN (ex.: turn:meuservidor.com:3478)

const { cfg, redis, lerBody, limpa } = require('./_equipe.js');

const SALA_RE = /^wm-[a-z0-9]{10}$/;
const PEER_RE = /^[a-z0-9]{8,24}$/;
const VIDA_SALA = 6 * 3600;       // dados da conversa somem 6 h depois
const PEER_ATIVO = 45e3;          // sem sinal por 45 s = saiu
const K = {
  sala: (s) => 'chamada:sala:' + s,
  peers: (s) => 'chamada:' + s + ':peers',
  caixa: (s, p) => 'chamada:' + s + ':caixa:' + p,
};

function ice() {
  const lista = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  if (process.env.TURN_URL) {
    lista.push({ urls: process.env.TURN_URL.split(',').map((u) => u.trim()), username: process.env.TURN_USUARIO || '', credential: process.env.TURN_SENHA || '' });
  }
  return lista;
}

async function peersAtivos(sala) {
  const arr = (await redis(['HGETALL', K.peers(sala)])) || [];
  const out = [];
  for (let i = 0; i < arr.length; i += 2) {
    try {
      const p = JSON.parse(arr[i + 1]);
      if (Date.now() - p.ts < PEER_ATIVO) out.push({ id: arr[i], nome: p.nome, equipe: !!p.equipe });
    } catch (e) {}
  }
  return out;
}

const q = (req, k) => String((req.query && req.query[k]) || new URL(req.url, 'http://x').searchParams.get(k) || '');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const { url, token } = cfg();
  if (!url || !token) return res.status(500).json({ erro: 'Sem banco de dados conectado.' });
  try {
    const acao = q(req, 'acao');
    const b = req.method === 'GET' ? {} : lerBody(req);
    const sala = limpa(q(req, 'sala') || b.sala, 20);
    if (!SALA_RE.test(sala)) return res.status(400).json({ erro: 'Link de chamada inválido.' });
    const infoRaw = await redis(['GET', K.sala(sala)]);
    if (!infoRaw) return res.status(404).json({ erro: 'Esta sala de chamada não existe. Confira o link enviado pela WhatsMenu.' });
    const info = JSON.parse(infoRaw);

    if (acao === 'info') {
      return res.status(200).json({ ok: true, cliente: info.nome || '', ice: ice() });
    }

    const peer = limpa(q(req, 'peer') || b.peer, 24);
    if (!PEER_RE.test(peer)) return res.status(400).json({ erro: 'Participante inválido.' });

    if (acao === 'entrar' && req.method === 'POST') {
      const ativos = await peersAtivos(sala);
      if (ativos.filter((p) => p.id !== peer).length >= 4) return res.status(409).json({ erro: 'A sala já está cheia (5 pessoas).' });
      await redis(['HSET', K.peers(sala), peer, JSON.stringify({ nome: limpa(b.nome, 40) || 'Participante', equipe: !!b.equipe, ts: Date.now() })]);
      await redis(['EXPIRE', K.peers(sala), String(VIDA_SALA)]);
      return res.status(200).json({ outros: ativos.filter((p) => p.id !== peer) });
    }

    if (acao === 'sinal' && req.method === 'POST') {
      const para = limpa(b.para, 24);
      if (!PEER_RE.test(para)) return res.status(400).json({ erro: 'Destino inválido.' });
      const msg = JSON.stringify({ de: peer, m: b.m });
      if (msg.length > 60000) return res.status(413).json({ erro: 'Mensagem grande demais.' });
      await redis(['RPUSH', K.caixa(sala, para), msg]);
      await redis(['EXPIRE', K.caixa(sala, para), String(VIDA_SALA)]);
      return res.status(200).json({ ok: true });
    }

    if (acao === 'receber' && req.method === 'GET') {
      const chave = K.caixa(sala, peer);
      const msgs = (await redis(['LRANGE', chave, '0', '-1'])) || [];
      if (msgs.length) await redis(['LTRIM', chave, String(msgs.length), '-1']);
      // marca presença no máximo a cada 15 s (economiza o banco)
      const ultima = Number(q(req, 'pres')) || 0;
      if (Date.now() - ultima > 15e3) {
        const raw = await redis(['HGET', K.peers(sala), peer]);
        if (raw) { const p = JSON.parse(raw); p.ts = Date.now(); await redis(['HSET', K.peers(sala), peer, JSON.stringify(p)]); }
      }
      const pedePeers = q(req, 'peers') === '1';
      return res.status(200).json({
        msgs: msgs.map((x) => { try { return JSON.parse(x); } catch (e) { return null; } }).filter(Boolean),
        peers: pedePeers ? (await peersAtivos(sala)).filter((p) => p.id !== peer) : undefined,
        agora: Date.now(),
      });
    }

    if (acao === 'sair' && req.method === 'POST') {
      await redis(['HDEL', K.peers(sala), peer]);
      await redis(['DEL', K.caixa(sala, peer)]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ erro: 'Ação não reconhecida.' });
  } catch (e) {
    return res.status(500).json({ erro: 'Falha na chamada: ' + e.message });
  }
};
