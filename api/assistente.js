// API do "Assistente WhatsMenu": responde dúvidas do suporte usando a base de conhecimento.
// Variáveis de ambiente no Vercel:
//   GEMINI_API_KEY  -> obrigatória (chave criada no Google AI Studio)
//   GEMINI_MODEL    -> opcional (padrão: gemini-3.5-flash-lite)
//   SENHA_EQUIPE    -> opcional; se existir, a página pede essa senha
//   KV_REST_API_URL / KV_REST_API_TOKEN -> opcionais; se existirem, limita 60 perguntas por hora por pessoa

const BASE = require('./_base-conhecimento.js');
const BASE_TI = require('./_base-informatica.js');
const crypto = require('crypto');
const { cfg, redis, equipeLogada, limpa } = require('./_equipe.js');
const temBanco = () => { const c = cfg(); return !!(c.url && c.token); };
async function r(cmd) { try { return await redis(cmd); } catch (e) { return null; } }
const hoje = (d = 0) => new Date(Date.now() - d * 86400e3 - 3 * 3600e3).toISOString().slice(0, 10);

const MODELO_PADRAO = 'gemini-3.5-flash-lite';
const MODELO_RESERVA = 'gemini-2.5-flash';
const LIMITE_HORA = 60;

const INSTRUCOES = `Você é o Assistente WhatsMenu, que ajuda a EQUIPE DE SUPORTE e IMPLANTAÇÃO do WhatsMenu (não o cliente final).
Responda sempre em português do Brasil, de forma direta e prática, com o caminho exato no menu (ex.: Configurações › Caixas) e passo a passo numerado quando for um procedimento.
Use SOMENTE as informações das duas bases abaixo: a BASE DE CONHECIMENTO do WhatsMenu e a BASE DE SUPORTE TÉCNICO GERAL (informática, impressoras térmicas 58/80 mm, internet e rede, Windows, navegador, Android, iPhone, Mac, e-mail, acesso remoto, hardware de PDV, nota fiscal, segurança e como analisar prints).
- Para telas, menus, botões, configurações, planos, preços e prazos DO WHATSMENU, vale só a base do WhatsMenu. Nunca invente telas ou botões do WhatsMenu a partir da base geral.
- Para problemas fora do sistema (impressora, driver, Windows, internet, celular, navegador, equipamento), use a base de suporte técnico geral.
- Quando o problema envolver as duas (ex.: impressora não imprime os pedidos), responda primeiro o que conferir no WhatsMenu e depois os passos gerais de diagnóstico, do mais simples para o mais complexo.
- Em problemas técnicos, comece pelas perguntas de diagnóstico que faltam (se o atendente não informou) e depois dê os passos numerados.
Se a resposta não estiver em nenhuma das duas bases, diga claramente "Isso não está na minha base" e sugira confirmar com o líder do suporte. Nunca invente telas, botões, preços ou prazos.
Nunca peça, guarde ou repita senhas, dados de cartão ou dados pessoais de clientes. Se o atendente colar algo assim, avise para não compartilhar.
Quando fizer sentido, termine com uma sugestão de mensagem curta que o atendente pode mandar para o cliente.

RESPOSTAS RÁPIDAS (AS "BARRAS" /):
- A seção 19 da base lista todas as respostas rápidas. Sempre que a pergunta for sobre uma "barra", "/", "resposta rápida", "mensagem pronta" ou "o que mandar para o cliente" sobre um assunto (ex.: "/ para cashback", "qual a barra do anydesk", "tem barra de impressora?"), procure na seção 19 e responda neste formato:
  1. A barra exata em destaque, com a barra na frente (ex.: **/cashback**), e o nome dela.
  2. Uma linha dizendo quando usar.
  3. O texto completo da resposta rápida, copiado exatamente como está na base, dentro de um bloco de citação, para o atendente conferir. Avise se ela "acompanha imagem" e lembre de trocar [nome] pelo nome do cliente.
- Se mais de uma barra servir (ex.: /cashback e /cashback_e_cupom), mostre a mais indicada primeiro e liste as outras opções com uma linha cada.
- Se o atendente pedir "todas as barras de" um assunto ou categoria, liste só os atalhos com uma linha cada, sem o texto completo.
- Nunca invente uma barra que não esteja na seção 19. Se não existir, diga que não há resposta rápida para isso e, se ajudar, sugira uma mensagem escrita por você deixando claro que ela não é uma barra.
- Quando a pergunta for sobre como fazer algo no sistema e existir uma barra sobre o assunto, responda a dúvida e no final indique a barra correspondente.

===== BASE DE CONHECIMENTO =====
${BASE}

===== BASE DE SUPORTE TÉCNICO GERAL =====
${BASE_TI}`;

function kv() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function contaUso(ip) {
  const c = kv();
  if (!c) return 0;
  try {
    const chave = 'assistente:uso:' + ip + ':' + new Date().toISOString().slice(0, 13);
    const r = await fetch(c.url + '/pipeline', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + c.token, 'Content-Type': 'application/json' },
      body: JSON.stringify([['INCR', chave], ['EXPIRE', chave, '3700']])
    });
    const j = await r.json();
    return Number(j[0] && j[0].result) || 0;
  } catch (e) { return 0; }
}

async function chamaGemini(modelo, contents, extra) {
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(modelo) + ':generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: INSTRUCOES + (extra || '') }] },
      contents,
      generationConfig: { temperature: 0.2, maxOutputTokens: 3000 }
    })
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, j };
}

// Conhecimento ensinado pela equipe na página "Ensinar a IA" (tem prioridade sobre a base)
async function ensinado() {
  if (!temBanco()) return '';
  const h = await r(['HGETALL', 'ia:ensinado']);
  if (!Array.isArray(h) || !h.length) return '';
  const itens = [];
  for (let i = 0; i < h.length; i += 2) { try { itens.push(JSON.parse(h[i + 1])); } catch (e) {} }
  if (!itens.length) return '';
  return '\n\n===== CONHECIMENTO ENSINADO PELA EQUIPE (PRIORIDADE MÁXIMA) =====\n' +
    'Estas respostas foram escritas e conferidas pelos líderes do suporte. Se alguma delas responder a pergunta, use-a e ela vale mais do que a base acima.\n\n' +
    itens.map((x, n) => (n + 1) + '. PERGUNTA: ' + x.pergunta + '\nRESPOSTA CERTA: ' + x.resposta).join('\n\n');
}

async function admin(req, res) {
  const eu = temBanco() && await equipeLogada(req);
  if (!eu) { res.status(401).json({ erro: 'Entre com seu login da equipe.' }); return null; }
  if (!eu.admin) { res.status(403).json({ erro: 'Somente administradores.' }); return null; }
  return eu;
}

async function lerResps(ids) {
  if (!ids.length) return [];
  const v = (await r(['MGET', ...ids.map((i) => 'ia:resp:' + i)])) || [];
  const av = (await r(['HMGET', 'ia:aval', ...ids])) || [];
  return ids.map((id, n) => {
    let o = null; try { o = JSON.parse(v[n]); } catch (e) {}
    let a = null; try { a = JSON.parse(av[n]); } catch (e) {}
    return o ? Object.assign({ id }, o, { aval: a }) : null;
  }).filter(Boolean);
}

module.exports = async function handler(req, res) {
  const acao = String((req.query && req.query.acao) || '');
  res.setHeader('Cache-Control', 'no-store');

  // ===== página "Ensinar a IA" (somente administradores) =====
  if (['revisar', 'descartar', 'ensinados', 'ensinar', 'apagar-ensinado', 'stats'].includes(acao)) {
    if (!temBanco()) return res.status(500).json({ erro: 'Banco (Upstash) não configurado.' });
    const eu = await admin(req, res); if (!eu) return;
    let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } } b = b || {};
    if (acao === 'revisar') {
      const ids = ((await r(['SMEMBERS', 'ia:revisar'])) || []).slice(0, 200);
      const itens = (await lerResps(ids)).sort((x, y) => y.t - x.t);
      return res.status(200).json({ itens });
    }
    if (acao === 'descartar') { await r(['SREM', 'ia:revisar', limpa(b.id, 24)]); return res.status(200).json({ ok: true }); }
    if (acao === 'ensinados') {
      const h = (await r(['HGETALL', 'ia:ensinado'])) || [], itens = [];
      for (let i = 0; i < h.length; i += 2) { try { itens.push(Object.assign({ id: h[i] }, JSON.parse(h[i + 1]))); } catch (e) {} }
      itens.sort((x, y) => String(y.quando).localeCompare(String(x.quando)));
      return res.status(200).json({ itens });
    }
    if (acao === 'ensinar') {
      const pergunta = limpa(b.pergunta, 500), resposta = String(b.resposta || '').trim().slice(0, 4000);
      if (!pergunta || !resposta) return res.status(400).json({ erro: 'Preencha a pergunta e a resposta certa.' });
      const total = (await r(['HLEN', 'ia:ensinado'])) || 0;
      const id = /^[a-f0-9]{12}$/.test(String(b.id || '')) ? b.id : crypto.randomBytes(6).toString('hex');
      if (!b.id && total >= 400) return res.status(400).json({ erro: 'Limite de 400 respostas ensinadas. Apague ou junte algumas.' });
      await r(['HSET', 'ia:ensinado', id, JSON.stringify({ pergunta, resposta, autor: eu.nome, quando: new Date().toISOString() })]);
      if (b.origem) await r(['SREM', 'ia:revisar', limpa(b.origem, 24)]);
      return res.status(200).json({ ok: true, id });
    }
    if (acao === 'apagar-ensinado') { await r(['HDEL', 'ia:ensinado', limpa(b.id, 24)]); return res.status(200).json({ ok: true }); }
    if (acao === 'stats') {
      const dias = []; for (let d = 6; d >= 0; d--) dias.push(hoje(d));
      const tot = (await r(['MGET', ...dias.map((d) => 'ia:total:' + d)])) || [];
      const [bom, ruim, ens, rev] = [await r(['GET', 'ia:bom']), await r(['GET', 'ia:ruim']), await r(['HLEN', 'ia:ensinado']), await r(['SCARD', 'ia:revisar'])];
      const ultimos = await lerResps(((await r(['LRANGE', 'ia:log', '0', '59'])) || []));
      return res.status(200).json({ dias: dias.map((d, i) => ({ dia: d, total: +tot[i] || 0 })), bom: +bom || 0, ruim: +ruim || 0, ensinados: +ens || 0, revisar: +rev || 0,
        ultimas: ultimos.map((x) => ({ id: x.id, p: x.p, t: x.t, img: x.img, voz: x.voz, semResposta: x.semResposta, aval: x.aval && x.aval.nota })) });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ erro: 'Use POST.' });
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ erro: 'Falta a chave do Gemini. No Vercel, crie a variável GEMINI_API_KEY e faça um novo deploy.' });
  }
  const senha = process.env.SENHA_EQUIPE;
  if (senha && req.headers['x-senha'] !== senha) return res.status(401).json({ erro: 'Senha da equipe incorreta.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  if (acao === 'avaliar') {
    const id = String(body.id || '');
    if (!/^[a-f0-9]{16}$/.test(id) || !temBanco()) return res.status(400).json({ erro: 'Resposta não encontrada.' });
    if (!(await r(['EXISTS', 'ia:resp:' + id]))) return res.status(404).json({ erro: 'Essa resposta é antiga demais para avaliar.' });
    const nota = Number(body.nota) > 0 ? 1 : -1;
    const antes = await r(['HGET', 'ia:aval', id]);
    await r(['HSET', 'ia:aval', id, JSON.stringify({ nota, comentario: limpa(body.comentario, 600), t: Date.now() })]);
    if (!antes) await r(['INCR', nota > 0 ? 'ia:bom' : 'ia:ruim']);
    if (nota < 0) await r(['SADD', 'ia:revisar', id]);
    return res.status(200).json({ ok: true });
  }
  const pergunta = String((body && body.pergunta) || '').trim().slice(0, 2000);
  // pergunta por voz: áudio em base64 (até ~1,5 MB, cerca de 1 minuto)
  const audio = typeof body.audio === 'string' && /^[A-Za-z0-9+/=]+$/.test(body.audio.slice(0, 200)) ? body.audio : '';
  const mime = /^audio\/(webm|ogg|mp4|mpeg|wav|aac)$/.test(String(body.mime || '')) ? String(body.mime) : 'audio/webm';
  if (audio && audio.length > 2000000) return res.status(413).json({ erro: 'Áudio muito longo. Faça uma pergunta mais curta.' });
  const img = body.imagem && typeof body.imagem.data === 'string' && /^image\/(png|jpeg|webp|gif)$/.test(String(body.imagem.mime || '')) ? body.imagem : null;
  if (img && img.data.length > 3000000) return res.status(413).json({ erro: 'Imagem muito grande. Mande um print menor.' });
  if (!pergunta && !audio && !img) return res.status(400).json({ erro: 'Escreva uma pergunta.' });

  const ip = String(req.headers['x-forwarded-for'] || 'anon').split(',')[0].trim();
  if (await contaUso(ip) > LIMITE_HORA) {
    return res.status(429).json({ erro: 'Muitas perguntas nesta hora. Tente de novo daqui a pouco.' });
  }

  const hist = Array.isArray(body.historico) ? body.historico.slice(-10) : [];
  const contents = hist
    .filter(m => m && (m.papel === 'user' || m.papel === 'model') && m.texto)
    .map(m => ({ role: m.papel, parts: [{ text: String(m.texto).slice(0, 4000) }] }));
  if (audio) {
    const dica = String(body.dica || '').slice(0, 300);
    contents.push({ role: 'user', parts: [
      { inline_data: { mime_type: mime, data: audio } },
      { text: 'O atendente fez a pergunta acima POR ÁUDIO, em português do Brasil.' + (dica ? ' O reconhecimento do navegador entendeu parte assim (pode estar errado): "' + dica + '".' : '') +
        ' Ignore palavras de chamada como "IA", "ei IA" ou "e" no começo. Responda EXATAMENTE neste formato: primeira linha "PERGUNTA: " seguida da pergunta transcrita e corrigida (curta, como o atendente escreveria); depois uma linha em branco; depois a resposta normal seguindo todas as instruções. Se o áudio não tiver uma pergunta compreensível, responda somente "PERGUNTA: -".' }
    ] });
  } else if (img) {
    contents.push({ role: 'user', parts: [
      { inline_data: { mime_type: img.mime, data: img.data } },
      { text: 'O atendente mandou este print ou foto (pode ser do painel/PDV/WhatsMenu Desktop, de uma janela do Windows, do navegador, de um celular Android ou iPhone, de uma conversa com o cliente, ou foto de impressora, cupom ou equipamento). Siga o método da seção T16 da base de suporte técnico: 1) diga em 1 ou 2 linhas onde é e o que aparece, repetindo o texto/código exato do erro se houver; 2) dê a causa mais provável; 3) passe o passo a passo para resolver, do mais simples ao mais complexo; 4) se o print não for suficiente, diga exatamente que outro print ou informação pedir. Se não der para ler ou identificar algo com segurança, diga isso em vez de adivinhar. Não repita nomes, telefones, endereços, e-mails, valores ou outros dados pessoais do print; se aparecer senha, token ou dado de cartão, avise para apagar o print.\n\nDúvida do atendente: ' + (pergunta || 'O que está acontecendo neste print e como resolvo?') }
    ] });
  } else contents.push({ role: 'user', parts: [{ text: pergunta }] });

  try {
    const modelo = process.env.GEMINI_MODEL || MODELO_PADRAO;
    const extra = await ensinado();
    let { status, j } = await chamaGemini(modelo, contents, extra);
    if (status === 404 && !process.env.GEMINI_MODEL) ({ status, j } = await chamaGemini(MODELO_RESERVA, contents, extra));
    if (status === 429) return res.status(429).json({ erro: 'O limite gratuito do Gemini foi atingido. Espere um minuto e tente de novo.' });
    if (status !== 200) {
      const msg = (j.error && j.error.message) || ('Gemini respondeu ' + status);
      return res.status(502).json({ erro: 'Erro no Gemini: ' + msg });
    }
    const cand = j.candidates && j.candidates[0];
    const texto = cand && cand.content && cand.content.parts ? cand.content.parts.map(p => p.text || '').join('').trim() : '';
    if (!texto) return res.status(502).json({ erro: 'O Gemini não devolveu resposta. Tente reformular a pergunta.' });
    // guarda a resposta para 👍/👎 e para a página "Ensinar a IA"
    const registra = async (p, resp) => {
      if (!temBanco()) return undefined;
      const id = crypto.randomBytes(8).toString('hex');
      const semResposta = /não está na minha base/i.test(resp);
      await r(['SET', 'ia:resp:' + id, JSON.stringify({ p: String(p).slice(0, 600), r: resp.slice(0, 6000), t: Date.now(), img: !!img, voz: !!audio, semResposta }), 'EX', String(60 * 86400)]);
      await r(['LPUSH', 'ia:log', id]); await r(['LTRIM', 'ia:log', '0', '499']);
      const k = 'ia:total:' + hoje(); await r(['INCR', k]); await r(['EXPIRE', k, String(40 * 86400)]);
      if (semResposta) await r(['SADD', 'ia:revisar', id]);
      return id;
    };
    if (audio) {
      const m = texto.match(/^\s*\**PERGUNTA:?\**\s*(.*)\n?([\s\S]*)$/i);
      const perg = m ? m[1].replace(/\*+/g, '').trim() : '';
      const resp = m ? m[2].trim() : texto;
      if (!perg || perg === '-' || !resp) return res.status(200).json({ vazio: true });
      return res.status(200).json({ pergunta: perg, resposta: resp, id: await registra('🎙️ ' + perg, resp) });
    }
    return res.status(200).json({ resposta: texto, id: await registra((img ? '🖼️ ' : '') + (pergunta || '(print sem texto)'), texto) });
  } catch (e) {
    return res.status(500).json({ erro: 'Falha ao falar com o Gemini: ' + e.message });
  }
};
