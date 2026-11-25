// API da página "Sugestões": a equipe manda ideias de melhoria para o guia e os administradores respondem.
// Guarda tudo no mesmo Upstash Redis do guia (hash "sug:itens").
const crypto = require('crypto');
const { cfg, redis, lerBody, limpa, equipeLogada } = require('./_equipe.js');

const CHAVE = 'sug:itens';
const AREAS = ['Guia de implantação', 'Agendamentos', 'IA do guia', 'Clientes', 'TousChat / WhatsApp', 'Outro'];
const STATUS = ['nova', 'analise', 'desenvolvimento', 'feita', 'recusada'];

async function todas() {
  const arr = (await redis(['HGETALL', CHAVE])) || [];
  const out = [];
  for (let i = 0; i < arr.length; i += 2) { try { out.push(JSON.parse(arr[i + 1])); } catch (e) {} }
  return out.sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
}
const publico = (s, eu) => Object.assign({}, s, { votos: (s.votos || []).length, votei: (s.votos || []).includes(eu.usuario), minha: s.autorUsuario === eu.usuario, votosNomes: undefined });

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const { url, token } = cfg();
  if (!url || !token) return res.status(500).json({ erro: 'Banco de dados não conectado.' });
  try {
    const eu = await equipeLogada(req);
    if (!eu) return res.status(401).json({ erro: 'Entre com seu login da equipe.' });
    const acao = String((req.query && req.query.acao) || new URL(req.url, 'http://x').searchParams.get('acao') || '');

    if (req.method === 'GET') {
      // só administradores veem as sugestões; o resto da equipe só envia
      const itens = eu.admin ? await todas() : [];
      return res.status(200).json({ itens: itens.map((s) => publico(s, eu)), areas: AREAS, eu: { usuario: eu.usuario, nome: eu.nome, admin: eu.admin } });
    }

    const b = lerBody(req);

    if (acao === 'nova') {
      const texto = limpa(b.texto, 3000), titulo = limpa(b.titulo, 120);
      const area = AREAS.includes(b.area) ? b.area : 'Outro';
      if (texto.length < 5) return res.status(400).json({ erro: 'Escreva a sugestão.' });
      const s = {
        id: Date.now().toString(36) + crypto.randomBytes(3).toString('hex'),
        titulo: titulo || texto.split('\n')[0].slice(0, 80), texto, area, status: 'nova',
        autor: eu.nome, autorUsuario: eu.usuario, criadoEm: Date.now(), votos: [], hist: [],
      };
      await redis(['HSET', CHAVE, s.id, JSON.stringify(s)]);
      return res.status(200).json({ item: eu.admin ? publico(s, eu) : null });
    }

    if (!eu.admin) return res.status(403).json({ erro: 'Só administradores veem e gerenciam as sugestões.' });

    const raw = await redis(['HGET', CHAVE, limpa(b.id, 40)]);
    if (!raw) return res.status(404).json({ erro: 'Sugestão não encontrada.' });
    const s = JSON.parse(raw);

    if (acao === 'votar') {
      s.votos = s.votos || [];
      const i = s.votos.indexOf(eu.usuario);
      if (i >= 0) s.votos.splice(i, 1); else s.votos.push(eu.usuario);
      await redis(['HSET', CHAVE, s.id, JSON.stringify(s)]);
      return res.status(200).json({ item: publico(s, eu) });
    }

    if (acao === 'status') {
      const novo = STATUS.includes(b.status) ? b.status : s.status;
      const resposta = limpa(b.resposta, 2000);
      if (novo !== s.status) s.hist = [{ quando: Date.now(), quem: eu.nome, texto: 'Status: ' + novo }].concat(s.hist || []).slice(0, 30);
      s.status = novo;
      if (b.resposta != null) { s.resposta = resposta; s.respostaPor = resposta ? eu.nome : ''; s.respostaEm = resposta ? Date.now() : 0; }
      await redis(['HSET', CHAVE, s.id, JSON.stringify(s)]);
      return res.status(200).json({ item: publico(s, eu) });
    }

    if (acao === 'apagar') {
      await redis(['HDEL', CHAVE, s.id]);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ erro: 'Ação desconhecida.' });
  } catch (e) {
    return res.status(500).json({ erro: 'Erro no servidor: ' + e.message });
  }
};
