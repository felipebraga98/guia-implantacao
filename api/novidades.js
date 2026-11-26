// Mural de Novidades da equipe.
// Usa o mesmo banco (Upstash) e o mesmo login da página "Clientes Implantação".
//   GET    /api/novidades              -> lista (pública, sem login)
//   POST   /api/novidades              -> publica {titulo, categoria, texto} (só admin)
//   PATCH  /api/novidades              -> edita {id, titulo, categoria, texto} ou fixa {id, fixada}
//   DELETE /api/novidades?id=...       -> exclui (autor ou admin)
// Admins = usuários da variável ADMINS_IMPLANTACAO e os promovidos na tela de Usuários: só eles publicam, editam, fixam e excluem. Os demais só leem.

const CATEGORIAS = ['Sistema', 'Atualização', 'Correção de bug', 'Processo', 'Aviso', 'Treinamento'];
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
// login e administradores vêm do módulo compartilhado (inclui admins dados pela tela de Usuários e contas bloqueadas)
const EQUIPE = require('./_equipe.js');
async function logado(req) {
  const eu = await EQUIPE.equipeLogada(req);
  return eu ? { usuario: eu.usuario, nome: eu.nome, admin: eu.admin } : null;
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
    // público: só a data da novidade mais recente (sem conteúdo), para o bloco da tela inicial piscar
    const acao = String((req.query && req.query.acao) || new URL(req.url, 'http://x').searchParams.get('acao') || '');
    if (acao === 'ultima' && req.method === 'GET') {
      const todos = (await redis(['HVALS', CHAVE])) || [];
      let ultima = 0, titulo = '';
      todos.forEach(v => { try { const n = JSON.parse(v); if ((n.criadoEm || 0) > ultima) { ultima = n.criadoEm; titulo = n.titulo; } } catch (e) {} });
      return res.status(200).json({ ultima, titulo });
    }

    const eu = await logado(req);

    if (req.method === 'GET') {
      const todos = (await redis(['HGETALL', CHAVE])) || [];
      const lista = [];
      for (let i = 0; i < todos.length; i += 2) { try { lista.push(JSON.parse(todos[i + 1])); } catch (e) {} }
      lista.sort((a, b) => (b.fixada ? 1 : 0) - (a.fixada ? 1 : 0) || b.criadoEm - a.criadoEm);
      return res.status(200).json({ lista, eu: eu ? { usuario: eu.usuario, nome: eu.nome, admin: eu.admin } : null, categorias: CATEGORIAS });
    }

    if (!eu) return res.status(401).json({ erro: 'Entre com seu login de administrador.' });
    if (req.method !== 'GET' && !eu.admin) return res.status(403).json({ erro: 'Só administradores podem publicar ou alterar novidades.' });

    // importar cards do GitHub a partir da planilha "Export view data" do quadro
    if (req.method === 'POST' && acao === 'importar-github') {
      const GH = require('./github-projeto.js');
      const b = lerBody(req);
      const coluna = limpa(b.coluna, 40) || 'Beta';
      const alvo = GH.semAcento(coluna);
      const itens = Array.isArray(b.itens) ? b.itens.slice(0, 3000) : [];
      const res2 = [];
      // a planilha também alimenta a aba "Cards" (todas as colunas), quando não há leitura automática
      if (b.publicar || b.salvarCards) {
        const todos = itens.map((x) => { const u = limpa(x.url, 300); const m = u.match(/github\.com\/([^/]+\/[^/]+)\/(?:issues|pull)\/(\d+)/i);
          return { titulo: limpa(x.titulo, 200), url: u, numero: m ? +m[2] : 0, repo: limpa(x.repo, 120) || (m ? m[1] : ''), status: limpa(x.status, 60),
            labels: String(x.labels || '').split(',').map((l) => limpa(l, 60)).filter(Boolean), autor: limpa(x.autor, 60),
            responsaveis: String(x.responsaveis || '').split(',').map((l) => limpa(l, 60)).filter(Boolean) }; }).filter((x) => x.titulo);
        if (todos.length && !process.env.GITHUB_TOKEN) await GH.salvarCards(todos, 'planilha');
      }
      for (const x of itens) {
        const it = {
          id: '', titulo: limpa(x.titulo, 200), url: limpa(x.url, 300), repo: limpa(x.repo, 120), status: limpa(x.status, 60),
          labels: (Array.isArray(x.labels) ? x.labels : String(x.labels || '').split(',')).map((l) => limpa(l, 60)).filter(Boolean),
        };
        const m = it.url.match(/github\.com\/([^/]+\/[^/]+)\/(?:issues|pull)\/(\d+)/i);
        it.numero = m ? +m[2] : 0; if (!it.repo && m) it.repo = m[1];
        if (b.salvarCards && !b.publicar) continue;
        if (!it.titulo || GH.semAcento(it.status) !== alvo) continue;
        const chave = 'url:' + (it.url || it.titulo).toLowerCase() + '|' + alvo;
        if (b.publicar) {
          const novo = await redis(['SADD', GH.CHAVE_PUBLICADOS, chave]);
          if (novo === 1) { const n = GH.novidadeDe(it, coluna); n.autor = eu.nome + ' (importado do GitHub)'; n.autorUsuario = eu.usuario; await redis(['HSET', CHAVE, n.id, JSON.stringify(n)]); await new Promise((r) => setTimeout(r, 3)); res2.push({ titulo: it.titulo, numero: it.numero, publicado: true }); }
          else res2.push({ titulo: it.titulo, numero: it.numero, publicado: false, ja: true });
        } else {
          const ja = await redis(['SISMEMBER', GH.CHAVE_PUBLICADOS, chave]);
          res2.push({ titulo: it.titulo, numero: it.numero, url: it.url, ja: ja === 1 || ja === '1' });
        }
      }
      return res.status(200).json({ ok: true, coluna, itens: res2 });
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
