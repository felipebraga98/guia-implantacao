// Mural de Novidades da equipe.
// Usa o mesmo banco (Upstash) e o mesmo login da página "Clientes Implantação".
//   GET    /api/novidades              -> lista (precisa estar logado)
//   POST   /api/novidades              -> publica {titulo, categoria, texto}
//   PATCH  /api/novidades              -> edita {id, titulo, categoria, texto} ou fixa {id, fixada}
//   DELETE /api/novidades?id=...       -> exclui (autor ou admin)
// Admins = usuários da variável ADMINS_IMPLANTACAO (podem fixar e excluir qualquer novidade).

const CATEGORIAS = ['Sistema', 'Atualização', 'Processo', 'Aviso', 'Treinamento'];
const CHAVE = 'novidades:itens';

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
function ehAdmin(usuario) {
  return String(process.env.ADMINS_IMPLANTACAO || '').split(',').map(u => u.trim().toLowerCase()).filter(Boolean).includes(usuario);
}
async function logado(req) {
  const m = String(req.headers.authorization || '').match(/^Bearer ([a-f0-9]{48})$/);
  if (!m) return null;
  const usuario = await redis(['GET', 'impl:sessao:' + m[1]]);
  if (!usuario) return null;
  const raw = await redis(['HGET', 'impl:usuarios', usuario]);
  if (!raw) return null;
  const u = JSON.parse(raw);
  return { usuario: u.usuario, nome: u.nome || u.usuario, admin: ehAdmin(u.usuario) };
}
function limpa(v, max) { return String(v == null ? '' : v).replace(/\r/g, '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, max); }
function lerBody(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  return b || {};
}
function valida(b) {
  const titulo = limpa(b.titulo, 120), texto = limpa(b.texto, 5000);
  const categoria = CATEGORIAS.includes(b.categoria) ? b.categoria : 'Aviso';
  if (titulo.length < 3) return { erro: 'Escreva um título.' };
  if (texto.length < 3) return { erro: 'Escreva o texto da novidade.' };
  return { titulo, texto, categoria };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const { url, token } = cfg();
  if (!url || !token) return res.status(500).json({ erro: 'Mural sem banco de dados conectado.' });
  try {
    const eu = await logado(req);
    if (!eu) return res.status(401).json({ erro: 'Entre com seu login da equipe.' });

    if (req.method === 'GET') {
      const todos = (await redis(['HGETALL', CHAVE])) || [];
      const lista = [];
      for (let i = 0; i < todos.length; i += 2) { try { lista.push(JSON.parse(todos[i + 1])); } catch (e) {} }
      lista.sort((a, b) => (b.fixada ? 1 : 0) - (a.fixada ? 1 : 0) || b.criadoEm - a.criadoEm);
      return res.status(200).json({ lista, eu: { usuario: eu.usuario, nome: eu.nome, admin: eu.admin }, categorias: CATEGORIAS });
    }

    if (req.method === 'POST') {
      const v = valida(lerBody(req));
      if (v.erro) return res.status(400).json({ erro: v.erro });
      const n = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        ...v, autor: eu.nome, autorUsuario: eu.usuario, criadoEm: Date.now(), fixada: false
      };
      await redis(['HSET', CHAVE, n.id, JSON.stringify(n)]);
      return res.status(201).json({ ok: true, id: n.id });
    }

    if (req.method === 'PATCH' || req.method === 'DELETE') {
      const b = req.method === 'PATCH' ? lerBody(req) : {};
      const id = limpa(req.method === 'DELETE' ? (req.query && req.query.id) || new URL(req.url, 'http://x').searchParams.get('id') : b.id, 30);
      const raw = await redis(['HGET', CHAVE, id]);
      if (!raw) return res.status(404).json({ erro: 'Novidade não encontrada.' });
      const n = JSON.parse(raw);
      const dono = n.autorUsuario === eu.usuario;

      if (req.method === 'DELETE') {
        if (!dono && !eu.admin) return res.status(403).json({ erro: 'Só quem publicou ou um administrador pode excluir.' });
        await redis(['HDEL', CHAVE, id]);
        return res.status(200).json({ ok: true });
      }
      if (typeof b.fixada === 'boolean') {
        if (!eu.admin) return res.status(403).json({ erro: 'Só administradores podem fixar novidades.' });
        n.fixada = b.fixada;
      } else {
        if (!dono && !eu.admin) return res.status(403).json({ erro: 'Só quem publicou ou um administrador pode editar.' });
        const v = valida(b);
        if (v.erro) return res.status(400).json({ erro: v.erro });
        Object.assign(n, v, { editadoEm: Date.now(), editadoPor: eu.nome });
      }
      await redis(['HSET', CHAVE, id, JSON.stringify(n)]);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ erro: 'Método não permitido.' });
  } catch (e) {
    return res.status(500).json({ erro: 'Erro no mural: ' + e.message });
  }
};
