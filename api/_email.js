// Envio de e-mail pelo Gmail (EMAIL_USUARIO + EMAIL_SENHA_APP).
// Sem essas variáveis, os e-mails são simplesmente pulados (o resto continua funcionando).

function emailConfigurado() {
  return !!(process.env.EMAIL_USUARIO && process.env.EMAIL_SENHA_APP);
}

let transporte = null;
async function enviarEmail({ para, assunto, texto, html, anexos }) {
  if (!emailConfigurado() || !para) return false;
  const nodemailer = require('nodemailer');
  transporte = transporte || nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USUARIO, pass: process.env.EMAIL_SENHA_APP },
  });
  await transporte.sendMail({
    from: '"WhatsMenu" <' + process.env.EMAIL_USUARIO + '>',
    to: para,
    subject: assunto,
    text: texto,
    html,
    attachments: anexos,
  });
  return true;
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

module.exports = { emailConfigurado, enviarEmail, moldura, botao, esc };
