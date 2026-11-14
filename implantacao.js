// API da aba "Clientes Implantação".
// Cada pessoa entra com usuário e senha; tudo que ela cria ou altera fica registrado com o nome dela.
// Usa o mesmo banco Upstash Redis das outras listas (KV_REST_API_URL / KV_REST_API_TOKEN).
// Se a variável SENHA_EQUIPE existir, ela é pedida para CRIAR conta (evita estranho criando login).

const crypto = require('crypto');
const DADOS_INICIAIS = require('./_implantacao-dados.js');

const K = {
  usuarios: 'impl:usuarios',
  clientes: 'impl:clientes',
  seed: 'impl:seed:v1',
  log: 'impl:log',
  sessao: (t) => 'impl:sessao:' + t,
  tentativas: (u) => 'impl:tent:' + u,
};
const SESSAO_DIAS = 30;
const CAMPOS = ['dataEntrada', 'email', 'telefone', 'status', 'falta'];
const NOMES_CAMPOS = { dataEntrada: 'Data entrada', email: 'E-mail', telefone: 'Telefone', status: 'Status', falta: 'O que falta' };

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

const limpa = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
const agora = () => new Date().toISOString();
const novoId = () => Date.now().toString(36) + crypto.randomBytes(4).toString('hex');

function hashSenha(senha, salt) {
  return crypto.scryptSync(senha, salt, 64).toString('hex');
}

function senhaConfere(senha, user) {
  const a = Buffer.from(hashSenha(senha, user.salt), 'hex');
  const b = Buffer.from(user.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function criarSessao(usuario) {
  const token = crypto.randomBytes(24).toString('hex');
  await redis(['SET', K.sessao(token), usuario, 'EX', String(SESSAO_DIAS * 86400)]);
  return token;
}

async function usuarioLogado(req) {
  const m = String(req.headers.authorization || '').match(/^Bearer ([a-f0-9]{48})$/);
  if (!m) return null;
  const usuario = await redis(['GET', K.sessao(m[1])]);
  if (!usuario) return null;
  const raw = await redis(['HGET', K.usuarios, usuario]);
  if (!raw) return null;
  const u = JSON.parse(raw);
  return { usuario: u.usuario, nome: u.nome, token: m[1] };
}

/** Na primeira vez, joga os dados da planilha no banco. */
async function importarPlanilha() {
  const primeiraVez = await redis(['SET', K.seed, agora(), 'NX']);
  if (primeiraVez !== 'OK') return;
  const cmd = ['HSET', K.clientes];
  const quando = agora();
  DADOS_INICIAIS.forEach((d, i) => {
    const id = 'p' + String(i + 1).padStart(3, '0');
    cmd.push(id, JSON.stringify({
      id, dataEntrada: d.dataEntrada, email: d.email, telefone: d.telefone, status: d.status, falta: d.falta,
      criadoPor: 'Planilha · ' + (d.aba || 'importado'), criadoEm: quando, atualizadoPor: 'Planilha · ' + (d.aba || 'importado'), atualizadoEm: quando, hist: [],
    }));
  });
  if (cmd.length > 2) await redis(cmd);
}

async function registrarLog(texto) {
  await redis(['LPUSH', K.log, JSON.stringify({ quando: agora(), texto })]);
  await redis(['LTRIM', K.log, '0', '999']);
}

function corpo(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const { url, token } = cfg();
  if (!url || !token) return res.status(500).json({ erro: 'Banco de dados não conectado no Vercel.' });

  const acao = String((req.query && req.query.acao) || 'clientes');
  const body = req.method === 'GET' ? {} : corpo(req);

  try {
    // ---------- contas ----------
    if (acao === 'config') {
      return res.status(200).json({ pedeSenhaEquipe: !!process.env.SENHA_EQUIPE });
    }

    if (acao === 'cadastro' && req.method === 'POST') {
      const equipe = process.env.SENHA_EQUIPE;
      if (equipe && body.senhaEquipe !== equipe) {
        return res.status(401).json({ erro: 'Senha da equipe incorreta.' });
      }
      const nome = limpa(body.nome, 60);
      const usuario = limpa(body.usuario, 30).toLowerCase();
      const senha = String(body.senha || '');
      if (nome.length < 2) return res.status(400).json({ erro: 'Informe seu nome.' });
      if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) {
        return res.status(400).json({ erro: 'Usuário deve ter de 3 a 30 letras ou números, sem espaço e sem acento.' });
      }
      if (senha.length < 6) return res.status(400).json({ erro: 'A senha precisa ter pelo menos 6 caracteres.' });

      const salt = crypto.randomBytes(16).toString('hex');
      const user = { usuario, nome, salt, hash: hashSenha(senha, salt), criadoEm: agora() };
      const criado = await redis(['HSETNX', K.usuarios, usuario, JSON.stringify(user)]);
      if (!criado) return res.status(409).json({ erro: 'Esse usuário já existe. Escolha outro ou entre com ele.' });

      await registrarLog(`${nome} (${usuario}) criou a conta`);
      return res.status(201).json({ token: await criarSessao(usuario), usuario, nome });
    }

    if (acao === 'entrar' && req.method === 'POST') {
      const usuario = limpa(body.usuario, 30).toLowerCase();
      const tent = Number(await redis(['GET', K.tentativas(usuario)])) || 0;
      if (tent >= 10) return res.status(429).json({ erro: 'Muitas tentativas. Espere 15 minutos.' });

      const raw = usuario && (await redis(['HGET', K.usuarios, usuario]));
      const user = raw ? JSON.parse(raw) : null;
      if (!user || !senhaConfere(String(body.senha || ''), user)) {
        await redis(['INCR', K.tentativas(usuario)]);
        await redis(['EXPIRE', K.tentativas(usuario), '900']);
        return res.status(401).json({ erro: 'Usuário ou senha incorretos.' });
      }
      await redis(['DEL', K.tentativas(usuario)]);
      return res.status(200).json({ token: await criarSessao(usuario), usuario, nome: user.nome });
    }

    // daqui pra baixo precisa estar logado
    const eu = await usuarioLogado(req);
    if (!eu) return res.status(401).json({ erro: 'Entre com seu usuário e senha.', precisaLogin: true });

    if (acao === 'eu') return res.status(200).json({ usuario: eu.usuario, nome: eu.nome });

    if (acao === 'sair' && req.method === 'POST') {
      await redis(['DEL', K.sessao(eu.token)]);
      return res.status(200).json({ ok: true });
    }

    // ---------- clientes ----------
    if (acao !== 'clientes') return res.status(404).json({ erro: 'Ação desconhecida.' });

    if (req.method === 'GET') {
      await importarPlanilha();
      const arr = (await redis(['HGETALL', K.clientes])) || [];
      const lista = [];
      for (let i = 0; i < arr.length; i += 2) {
        try { lista.push(JSON.parse(arr[i + 1])); } catch (e) {}
      }
      lista.sort((a, b) =>
        String(b.dataEntrada).localeCompare(String(a.dataEntrada)) || String(b.criadoEm).localeCompare(String(a.criadoEm)));
      return res.status(200).json({ clientes: lista, eu: { usuario: eu.usuario, nome: eu.nome } });
    }

    if (req.method === 'POST') {
      const item = {
        id: novoId(),
        dataEntrada: limpa(body.dataEntrada, 10),
        email: limpa(body.email, 200),
        telefone: limpa(body.telefone, 40),
        status: limpa(body.status, 60),
        falta: limpa(body.falta, 4000),
        criadoPor: eu.nome, criadoEm: agora(), atualizadoPor: eu.nome, atualizadoEm: agora(), hist: [],
      };
      if (!item.email && !item.telefone) return res.status(400).json({ erro: 'Preencha o e-mail ou o telefone.' });
      if (item.dataEntrada && !/^\d{4}-\d{2}-\d{2}$/.test(item.dataEntrada)) return res.status(400).json({ erro: 'Data inválida.' });
      await redis(['HSET', K.clientes, item.id, JSON.stringify(item)]);
      await registrarLog(`${eu.nome} adicionou ${item.email || item.telefone}`);
      return res.status(201).json({ cliente: item });
    }

    if (req.method === 'PATCH') {
      const id = limpa(body.id, 40);
      const raw = id && (await redis(['HGET', K.clientes, id]));
      if (!raw) return res.status(404).json({ erro: 'Cliente não encontrado. Atualize a página.' });
      const item = JSON.parse(raw);
      const max = { dataEntrada: 10, email: 200, telefone: 40, status: 60, falta: 4000 };
      const mudancas = [];
      for (const campo of CAMPOS) {
        if (!(campo in body)) continue;
        const novo = limpa(body[campo], max[campo]);
        if (novo === (item[campo] || '')) continue;
        mudancas.push({ campo: NOMES_CAMPOS[campo], de: item[campo] || '', para: novo });
        item[campo] = novo;
      }
      if (!mudancas.length) return res.status(200).json({ cliente: item });
      if (!item.email && !item.telefone) return res.status(400).json({ erro: 'O cliente precisa ter e-mail ou telefone.' });

      item.atualizadoPor = eu.nome;
      item.atualizadoEm = agora();
      item.hist = [...mudancas.map((m) => ({ ...m, quem: eu.nome, quando: item.atualizadoEm })), ...(item.hist || [])].slice(0, 50);
      await redis(['HSET', K.clientes, id, JSON.stringify(item)]);
      return res.status(200).json({ cliente: item });
    }

    if (req.method === 'DELETE') {
      const id = limpa(body.id, 40);
      const raw = id && (await redis(['HGET', K.clientes, id]));
      if (!raw) return res.status(200).json({ ok: true });
      const item = JSON.parse(raw);
      await redis(['HDEL', K.clientes, id]);
      await registrarLog(`${eu.nome} excluiu ${item.email || item.telefone} — ${raw}`);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ erro: 'Método não permitido.' });
  } catch (e) {
    return res.status(500).json({ erro: 'Não foi possível acessar o banco agora. Tente de novo em instantes.' });
  }
};
