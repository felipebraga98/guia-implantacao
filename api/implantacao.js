// API da aba "Clientes Implantação".
// Cada pessoa entra com usuário e senha; tudo que ela cria ou altera fica registrado com o nome dela.
// Usa o mesmo banco Upstash Redis das outras listas (KV_REST_API_URL / KV_REST_API_TOKEN).
// Se a variável SENHA_EQUIPE existir, ela é pedida para CRIAR conta (evita estranho criando login).
// ADMINS_IMPLANTACAO: usuários que podem excluir clientes, separados por vírgula (ex.: felipebraga,kevin).
// Recuperação de senha por e-mail (Gmail): EMAIL_USUARIO (o endereço Gmail que envia) e EMAIL_SENHA_APP (senha de app do Google).
// SITE_URL (opcional): endereço do site usado no link do e-mail. Sem ela, usa o endereço que a pessoa está acessando.

const crypto = require('crypto');
const DADOS_INICIAIS = require('./_implantacao-dados.js');

const K = {
  usuarios: 'impl:usuarios',
  clientes: 'impl:clientes',
  // trocar a versão (v2 → v3…) recomeça a lista do zero a partir da planilha
  seed: 'impl:seed:v2',
  log: 'impl:log',
  sessao: (t) => 'impl:sessao:' + t,
  tentativas: (u) => 'impl:tent:' + u,
  emails: 'impl:emails',                 // e-mail -> usuário
  reset: (t) => 'impl:reset:' + t,       // link de redefinição (vale 1 hora)
  limite: (k) => 'impl:lim:' + k,
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SESSAO_DIAS = 30;
const ABAS = ['Implantação 1', 'Implantação 3'];
const CAMPOS = ['aba', 'dataEntrada', 'email', 'telefone', 'status', 'falta'];
const NOMES_CAMPOS = { aba: 'Aba', dataEntrada: 'Data entrada', email: 'E-mail', telefone: 'Telefone', status: 'Status', falta: 'O que falta' };

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
  return { usuario: u.usuario, nome: u.nome, email: u.email || '', token: m[1], admin: ehAdmin(u.usuario) };
}

/** Conta quantas vezes uma ação aconteceu na janela (segundos) e diz se passou do limite. */
async function passouLimite(chave, max, janela) {
  const n = await redis(['INCR', K.limite(chave)]);
  if (n === 1) await redis(['EXPIRE', K.limite(chave), String(janela)]);
  return n > max;
}

async function enviarEmailRedefinicao(para, nome, link) {
  const nodemailer = require('nodemailer');
  const t = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.EMAIL_USUARIO, pass: process.env.EMAIL_SENHA_APP } });
  const primeiro = String(nome || '').split(' ')[0] || 'tudo bem';
  await t.sendMail({
    from: '"Suporte WhatsMenu" <' + process.env.EMAIL_USUARIO + '>',
    to: para,
    subject: 'Redefinir sua senha — Suporte WhatsMenu',
    text: 'Oi, ' + primeiro + '!\n\nRecebemos um pedido para redefinir a sua senha do guia do Suporte WhatsMenu.\nAbra este link para criar uma senha nova (vale por 1 hora):\n' + link + '\n\nSe não foi você, é só ignorar este e-mail.',
    html: '<div style="font-family:Arial,sans-serif;font-size:15px;color:#14251b;max-width:520px">' +
      '<p>Oi, ' + primeiro.replace(/[<>&]/g, '') + '!</p>' +
      '<p>Recebemos um pedido para redefinir a sua senha do guia do <b>Suporte WhatsMenu</b>.</p>' +
      '<p><a href="' + link + '" style="display:inline-block;background:#00a63e;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px">Criar senha nova</a></p>' +
      '<p style="color:#4f6357;font-size:13px">O link vale por 1 hora e só pode ser usado uma vez. Se não foi você, é só ignorar este e-mail.</p></div>',
  });
}

/** Uma única vez por versão: apaga a lista e recomeça com os dados da planilha (as contas de login continuam). */
async function importarPlanilha() {
  const primeiraVez = await redis(['SET', K.seed, agora(), 'NX']);
  if (primeiraVez !== 'OK') return;
  await redis(['DEL', K.clientes]);
  const cmd = ['HSET', K.clientes];
  const quando = agora();
  DADOS_INICIAIS.forEach((d, i) => {
    const id = 'p' + String(i + 1).padStart(3, '0');
    cmd.push(id, JSON.stringify({
      id, aba: d.aba || ABAS[0], dataEntrada: d.dataEntrada, email: d.email, telefone: d.telefone, status: d.status, falta: d.falta,
      criadoPor: 'Planilha · ' + (d.aba || 'importado'), criadoEm: quando, atualizadoPor: 'Planilha · ' + (d.aba || 'importado'), atualizadoEm: quando, hist: [],
    }));
  });
  if (cmd.length > 2) await redis(cmd);
}

function ehAdmin(usuario) {
  return String(process.env.ADMINS_IMPLANTACAO || '')
    .split(',')
    .map((u) => u.trim().toLowerCase())
    .filter(Boolean)
    .includes(usuario);
}

async function registrarLog(texto) {
  await redis(['LPUSH', K.log, JSON.stringify({ quando: agora(), texto })]);
  await redis(['LTRIM', K.log, '0', '999']);
}

/** Clientes antigos não tinham o campo "aba": descobre pela origem da importação. */
function comAba(item) {
  if (!item.aba) {
    const m = String(item.criadoPor || '').match(/Implantação \d+/);
    item.aba = m && ABAS.includes(m[0]) ? m[0] : ABAS[0];
  }
  return item;
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
      const email = limpa(body.email, 120).toLowerCase();
      if (!EMAIL_RE.test(email)) return res.status(400).json({ erro: 'Informe um e-mail válido. Ele serve para recuperar a senha.' });
      const dono = await redis(['HGET', K.emails, email]);
      if (dono) return res.status(409).json({ erro: 'Esse e-mail já está em uma conta. Use "Esqueci minha senha".' });

      const salt = crypto.randomBytes(16).toString('hex');
      const user = { usuario, nome, email, salt, hash: hashSenha(senha, salt), criadoEm: agora() };
      const criado = await redis(['HSETNX', K.usuarios, usuario, JSON.stringify(user)]);
      if (!criado) return res.status(409).json({ erro: 'Esse usuário já existe. Escolha outro ou entre com ele.' });
      await redis(['HSET', K.emails, email, usuario]);

      await registrarLog(`${nome} (${usuario}) criou a conta`);
      return res.status(201).json({ token: await criarSessao(usuario), usuario, nome, email, admin: ehAdmin(usuario) });
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
      return res.status(200).json({ token: await criarSessao(usuario), usuario, nome: user.nome, email: user.email || '', admin: ehAdmin(usuario) });
    }

    // ---------- esqueci minha senha ----------
    if (acao === 'esqueci' && req.method === 'POST') {
      if (!process.env.EMAIL_USUARIO || !process.env.EMAIL_SENHA_APP) {
        return res.status(503).json({ erro: 'A recuperação por e-mail ainda não foi configurada. Fale com um administrador.' });
      }
      const email = limpa(body.email, 120).toLowerCase();
      if (!EMAIL_RE.test(email)) return res.status(400).json({ erro: 'Informe o e-mail da sua conta.' });
      const ip = String(req.headers['x-forwarded-for'] || 'anon').split(',')[0].trim();
      if (await passouLimite('ip:' + ip, 8, 3600) || await passouLimite('em:' + email, 3, 3600)) {
        return res.status(429).json({ erro: 'Muitos pedidos. Espere um pouco e tente de novo.' });
      }
      const resposta = { ok: true, msg: 'Se esse e-mail estiver cadastrado, enviamos um link para criar uma senha nova. Confira a caixa de entrada e o spam.' };
      const usuario = await redis(['HGET', K.emails, email]);
      if (!usuario) return res.status(200).json(resposta);
      const raw = await redis(['HGET', K.usuarios, usuario]);
      if (!raw) return res.status(200).json(resposta);
      const user = JSON.parse(raw);
      const tk = crypto.randomBytes(24).toString('hex');
      await redis(['SET', K.reset(tk), usuario, 'EX', '3600']);
      const base = (process.env.SITE_URL || ('https://' + (req.headers['x-forwarded-host'] || req.headers.host))).replace(/\/+$/, '');
      try {
        await enviarEmailRedefinicao(email, user.nome, base + '/clientes-implantacao.html#redefinir=' + tk);
      } catch (e) {
        await redis(['DEL', K.reset(tk)]);
        return res.status(502).json({ erro: 'Não consegui enviar o e-mail agora. Avise um administrador.' });
      }
      await registrarLog(`Pedido de nova senha enviado para ${user.nome} (${usuario})`);
      return res.status(200).json(resposta);
    }

    if (acao === 'redefinir' && req.method === 'POST') {
      const tk = limpa(body.token, 60);
      const senha = String(body.senha || '');
      if (!/^[a-f0-9]{48}$/.test(tk)) return res.status(400).json({ erro: 'Link inválido. Peça um novo em "Esqueci minha senha".' });
      if (senha.length < 6) return res.status(400).json({ erro: 'A senha precisa ter pelo menos 6 caracteres.' });
      const usuario = await redis(['GET', K.reset(tk)]);
      if (!usuario) return res.status(400).json({ erro: 'Esse link já foi usado ou expirou. Peça um novo em "Esqueci minha senha".' });
      const raw = await redis(['HGET', K.usuarios, usuario]);
      if (!raw) return res.status(400).json({ erro: 'Conta não encontrada.' });
      const user = JSON.parse(raw);
      user.salt = crypto.randomBytes(16).toString('hex');
      user.hash = hashSenha(senha, user.salt);
      user.senhaTrocadaEm = agora();
      await redis(['HSET', K.usuarios, usuario, JSON.stringify(user)]);
      await redis(['DEL', K.reset(tk)]);
      await redis(['DEL', K.tentativas(usuario)]);
      await registrarLog(`${user.nome} (${usuario}) criou uma senha nova pelo e-mail`);
      return res.status(200).json({ token: await criarSessao(usuario), usuario, nome: user.nome, email: user.email || '', admin: ehAdmin(usuario) });
    }

    // daqui pra baixo precisa estar logado
    const eu = await usuarioLogado(req);
    if (!eu) return res.status(401).json({ erro: 'Entre com seu usuário e senha.', precisaLogin: true });

    if (acao === 'eu') return res.status(200).json({ usuario: eu.usuario, nome: eu.nome, email: eu.email, admin: eu.admin });

    // cadastrar ou trocar o e-mail da própria conta (contas antigas não tinham e-mail)
    if (acao === 'meuemail' && req.method === 'POST') {
      const email = limpa(body.email, 120).toLowerCase();
      if (!EMAIL_RE.test(email)) return res.status(400).json({ erro: 'Informe um e-mail válido.' });
      const dono = await redis(['HGET', K.emails, email]);
      if (dono && dono !== eu.usuario) return res.status(409).json({ erro: 'Esse e-mail já está em outra conta.' });
      const raw = await redis(['HGET', K.usuarios, eu.usuario]);
      const user = JSON.parse(raw);
      if (user.email && user.email !== email) await redis(['HDEL', K.emails, user.email]);
      user.email = email;
      await redis(['HSET', K.usuarios, eu.usuario, JSON.stringify(user)]);
      await redis(['HSET', K.emails, email, eu.usuario]);
      return res.status(200).json({ ok: true, email });
    }

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
        try { lista.push(comAba(JSON.parse(arr[i + 1]))); } catch (e) {}
      }
      lista.sort((a, b) =>
        String(b.dataEntrada).localeCompare(String(a.dataEntrada)) || String(b.criadoEm).localeCompare(String(a.criadoEm)) || String(a.id).localeCompare(String(b.id)));
      return res.status(200).json({ clientes: lista, abas: ABAS, eu: { usuario: eu.usuario, nome: eu.nome, admin: eu.admin } });
    }

    if (req.method === 'POST') {
      const item = {
        id: novoId(),
        aba: ABAS.includes(body.aba) ? body.aba : ABAS[0],
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
      const item = comAba(JSON.parse(raw));
      const max = { aba: 40, dataEntrada: 10, email: 200, telefone: 40, status: 60, falta: 4000 };
      const mudancas = [];
      for (const campo of CAMPOS) {
        if (!(campo in body)) continue;
        const novo = limpa(body[campo], max[campo]);
        if (campo === 'aba' && !ABAS.includes(novo)) continue;
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
      if (!eu.admin) return res.status(403).json({ erro: 'Só administradores podem excluir clientes.' });
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
