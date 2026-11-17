// API das listas "Clientes PDV Novo" e "Clientes finalizados".
// Guarda os clientes num banco Upstash Redis conectado ao projeto no Vercel.
// Variáveis de ambiente (o Vercel cria sozinho ao conectar o Upstash):
//   KV_REST_API_URL e KV_REST_API_TOKEN  (ou UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN)
// Opcional: SENHA_EQUIPE -> se existir, a página pede essa senha para ver e salvar.

// Cada lista fica numa chave separada do banco. A página escolhe com ?lista=...
const LISTAS = { pdvnovo: 'pdvnovo:clientes', finalizados: 'finalizados:clientes' };

function cfg() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return { url, token };
}

async function redis(cmd) {
  const { url, token } = cfg();
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || ('Banco respondeu ' + r.status));
  return j.result;
}

function limpa(v, max) { return String(v == null ? '' : v).trim().slice(0, max); }

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const { url, token } = cfg();
  if (!url || !token) {
    return res.status(500).json({ erro: 'Banco de dados não conectado. No Vercel, conecte o Upstash Redis ao projeto e faça um novo deploy.' });
  }
  const senha = process.env.SENHA_EQUIPE;
  if (senha && req.headers['x-senha'] !== senha) {
    return res.status(401).json({ erro: 'Senha da equipe incorreta.', precisaSenha: true });
  }

  const nomeLista = String((req.query && req.query.lista) || 'pdvnovo');
  const CHAVE = LISTAS[nomeLista];
  if (!CHAVE) return res.status(400).json({ erro: 'Lista desconhecida.' });

  try {
    if (req.method === 'GET') {
      const arr = (await redis(['HGETALL', CHAVE])) || [];
      const lista = [];
      for (let i = 0; i < arr.length; i += 2) {
        try { lista.push(JSON.parse(arr[i + 1])); } catch (e) {}
      }
      lista.sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));
      return res.status(200).json({ clientes: lista, protegido: !!senha });
    }

    const body = (req.body && typeof req.body === 'object') ? req.body : (() => { try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; } })();

    if (req.method === 'POST') {
      const email = limpa(body.email, 200), telefone = limpa(body.telefone, 40);
      if (!email && !telefone) return res.status(400).json({ erro: 'Preencha o e-mail ou o telefone do cliente.' });
      const agora = new Date().toISOString();
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const item = { id, email, telefone, obs: limpa(body.obs, 4000), por: limpa(body.por, 80), criadoEm: agora, atualizadoEm: agora };
      await redis(['HSET', CHAVE, id, JSON.stringify(item)]);
      return res.status(201).json({ cliente: item });
    }

    if (req.method === 'PATCH') {
      const id = limpa(body.id, 40);
      const atual = id && await redis(['HGET', CHAVE, id]);
      if (!atual) return res.status(404).json({ erro: 'Cliente não encontrado. Atualize a página.' });
      const item = JSON.parse(atual);
      if ('obs' in body) item.obs = limpa(body.obs, 4000);
      item.atualizadoEm = new Date().toISOString();
      await redis(['HSET', CHAVE, id, JSON.stringify(item)]);
      return res.status(200).json({ cliente: item });
    }

    if (req.method === 'DELETE') {
      const id = limpa(body.id || (req.query && req.query.id), 40);
      if (!id) return res.status(400).json({ erro: 'Cliente não informado.' });
      await redis(['HDEL', CHAVE, id]);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ erro: 'Método não permitido.' });
  } catch (e) {
    return res.status(500).json({ erro: 'Não foi possível acessar o banco agora. Tente de novo em instantes.' });
  }
};
