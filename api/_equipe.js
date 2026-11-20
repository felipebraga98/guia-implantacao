// Funções compartilhadas pelas APIs: banco Upstash, login da equipe e administradores.
// Não é um endereço da API (arquivos com "_" no começo não viram rota no Vercel).

function cfg() {
  return {
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
  };
}

async function redis(cmd) {
  const { url, token } = cfg();
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || 'Banco respondeu ' + r.status);
  return j.result;
}

function lerBody(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  return b && typeof b === 'object' ? b : {};
}

const limpa = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ').trim().slice(0, max);

/** Admins definidos na variável ADMINS_IMPLANTACAO (fixos, não podem ser removidos pela tela). */
function adminsFixos() {
  return String(process.env.ADMINS_IMPLANTACAO || '').split(',').map((u) => u.trim().toLowerCase()).filter(Boolean);
}

/** Admins = os fixos + os promovidos pela tela de Usuários (guardados no banco). */
async function listaAdmins() {
  const extras = (await redis(['SMEMBERS', 'impl:admins'])) || [];
  return Array.from(new Set(adminsFixos().concat(extras)));
}

async function ehAdmin(usuario) {
  if (!usuario) return false;
  if (adminsFixos().includes(usuario)) return true;
  return (await redis(['SISMEMBER', 'impl:admins', usuario])) === 1;
}

/** Devolve a pessoa logada (token "Bearer" do navegador) ou null. Contas bloqueadas não entram. */
async function equipeLogada(req, { marcarAcesso = false } = {}) {
  const m = String(req.headers.authorization || '').match(/^Bearer ([a-f0-9]{48})$/);
  if (!m) return null;
  const usuario = await redis(['GET', 'impl:sessao:' + m[1]]);
  if (!usuario) return null;
  const raw = await redis(['HGET', 'impl:usuarios', usuario]);
  if (!raw) return null;
  const u = JSON.parse(raw);
  if (u.bloqueado) {
    await redis(['DEL', 'impl:sessao:' + m[1]]);
    return null;
  }
  if (marcarAcesso) {
    const ultimo = Date.parse(u.ultimoAcesso || 0) || 0;
    if (Date.now() - ultimo > 30 * 60e3) {
      u.ultimoAcesso = new Date().toISOString();
      await redis(['HSET', 'impl:usuarios', usuario, JSON.stringify(u)]);
    }
  }
  return {
    usuario: u.usuario,
    nome: u.nome || u.usuario,
    email: u.email || '',
    token: m[1],
    admin: await ehAdmin(u.usuario),
    trocarSenha: !!u.trocarSenha,
  };
}

module.exports = { cfg, redis, lerBody, limpa, adminsFixos, listaAdmins, ehAdmin, equipeLogada };
