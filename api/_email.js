// Envio de e-mail pelo Gmail ou pelo Brevo (serviço de envio grátis, não precisa de senha de app).
// O e-mail que envia pode ser escolhido pelos administradores na página Agendamentos (fica guardado no banco),
// ou vir das variáveis EMAIL_USUARIO + EMAIL_SENHA_APP do Vercel. Sem nada disso, os e-mails são pulados.

const CHAVE = 'email:remetente';
let remetente = null, lidoEm = 0;

async function redisCmd(cmd) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const r = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || 'banco');
  return j.result;
}
/** Lê o remetente escolhido no painel (guarda por 30 s para não ler o banco toda hora). */
async function carregar(forcar) {
  if (!forcar && Date.now() - lidoEm < 30000) return remetente;
  try { const raw = await redisCmd(['GET', CHAVE]); remetente = raw ? JSON.parse(raw) : null; } catch (e) { /* mantém o que tinha */ }
  lidoEm = Date.now();
  return remetente;
}
function credenciais() {
  if (remetente && remetente.usuario && remetente.senha) {
    const brevo = remetente.servico === 'brevo';
    return { user: remetente.usuario, login: brevo ? (remetente.login || remetente.usuario) : remetente.usuario, pass: remetente.senha, nome: remetente.nome || 'WhatsMenu', origem: 'painel', servico: brevo ? 'brevo' : 'gmail' };
  }
  if (process.env.EMAIL_USUARIO && process.env.EMAIL_SENHA_APP) return { user: process.env.EMAIL_USUARIO, login: process.env.EMAIL_USUARIO, pass: process.env.EMAIL_SENHA_APP, nome: 'WhatsMenu', origem: 'vercel', servico: 'gmail' };
  return null;
}
function emailConfigurado() { return !!credenciais(); }

let transporte = null, chaveTransporte = '';
async function enviarEmail({ para, assunto, texto, html, anexos }) {
  const cr = credenciais();
  if (!cr || !para) return false;
  const nodemailer = require('nodemailer');
  const k = cr.servico + '|' + cr.login + '|' + cr.pass;
  if (!transporte || chaveTransporte !== k) {
    transporte = cr.servico === 'brevo'
      ? nodemailer.createTransport({ host: 'smtp-relay.brevo.com', port: 587, secure: false, auth: { user: cr.login, pass: cr.pass } })
      : nodemailer.createTransport({ service: 'gmail', auth: { user: cr.login, pass: cr.pass } });
    chaveTransporte = k;
  }
  await transporte.sendMail({
    from: '"' + String(cr.nome).replace(/"/g, '') + '" <' + cr.user + '>',
    to: para,
    subject: assunto,
    text: texto,
    html,
    attachments: anexos,
  });
  return true;
}

/** Salva (ou apaga) o remetente escolhido pelos administradores. A senha nunca volta para a tela. */
async function salvarRemetente(dados) {
  if (!dados) { await redisCmd(['DEL', CHAVE]); remetente = null; lidoEm = Date.now(); return; }
  await redisCmd(['SET', CHAVE, JSON.stringify(dados)]);
  remetente = dados; lidoEm = Date.now(); transporte = null;
}
function infoRemetente() {
  const cr = credenciais();
  return { usuario: cr ? cr.user : '', nome: cr ? cr.nome : 'WhatsMenu', origem: cr ? cr.origem : 'nenhum', servico: cr ? cr.servico : 'gmail', login: cr && cr.servico === 'brevo' ? cr.login : '', temSenha: !!(remetente && remetente.senha) };
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Moldura visual dos e-mails, com a cor da WhatsMenu. */
function moldura(titulo, corpoHtml) {
  return '<div style="background:#f2faf5;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">' +
    '<div style="max-width:540px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #d7e6dc">' +
    '<div style="background:#00a63e;color:#ffffff;padding:18px 24px;font-size:20px;font-weight:bold">WhatsMenu</div>' +
    '<div style="padding:24px;color:#14251b;font-size:15px;line-height:1.55">' +
    '<h1 style="font-size:20px;margin:0 0 14px">' + esc(titulo) + '</h1>' + corpoHtml +
    '</div><div style="padding:14px 24px;color:#4f6357;font-size:12px;border-top:1px solid #d7e6dc">Equipe de suporte e implantação WhatsMenu</div></div></div>';
}

function botao(texto, link, cor) {
  return '<a href="' + esc(link) + '" style="display:inline-block;background:' + (cor || '#00a63e') + ';color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:10px;margin:4px 6px 4px 0">' + esc(texto) + '</a>';
}

module.exports = { emailConfigurado, enviarEmail, moldura, botao, esc, carregar, salvarRemetente, infoRemetente, credenciais };
