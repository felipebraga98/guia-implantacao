// API do "Assistente WhatsMenu": responde dúvidas do suporte usando a base de conhecimento.
// Variáveis de ambiente no Vercel:
//   GEMINI_API_KEY  -> obrigatória (chave criada no Google AI Studio)
//   GEMINI_MODEL    -> opcional (padrão: gemini-3.5-flash-lite)
//   SENHA_EQUIPE    -> opcional; se existir, a página pede essa senha
//   KV_REST_API_URL / KV_REST_API_TOKEN -> opcionais; se existirem, limita 60 perguntas por hora por pessoa

const BASE = require('./_base-conhecimento.js');

const MODELO_PADRAO = 'gemini-3.5-flash-lite';
const MODELO_RESERVA = 'gemini-2.5-flash';
const LIMITE_HORA = 60;

const INSTRUCOES = `Você é o Assistente WhatsMenu, que ajuda a EQUIPE DE SUPORTE e IMPLANTAÇÃO do WhatsMenu (não o cliente final).
Responda sempre em português do Brasil, de forma direta e prática, com o caminho exato no menu (ex.: Configurações › Caixas) e passo a passo numerado quando for um procedimento.
Use SOMENTE as informações da BASE DE CONHECIMENTO abaixo. Se a resposta não estiver na base, diga claramente "Isso não está na minha base" e sugira confirmar com o líder do suporte. Nunca invente telas, botões, preços ou prazos.
Nunca peça, guarde ou repita senhas, dados de cartão ou dados pessoais de clientes. Se o atendente colar algo assim, avise para não compartilhar.
Quando fizer sentido, termine com uma sugestão de mensagem curta que o atendente pode mandar para o cliente.

===== BASE DE CONHECIMENTO =====
${BASE}`;

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

async function chamaGemini(modelo, contents) {
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(modelo) + ':generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: INSTRUCOES }] },
      contents,
      generationConfig: { temperature: 0.2, maxOutputTokens: 1500 }
    })
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, j };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Use POST.' });
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ erro: 'Falta a chave do Gemini. No Vercel, crie a variável GEMINI_API_KEY e faça um novo deploy.' });
  }
  const senha = process.env.SENHA_EQUIPE;
  if (senha && req.headers['x-senha'] !== senha) return res.status(401).json({ erro: 'Senha da equipe incorreta.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const pergunta = String((body && body.pergunta) || '').trim().slice(0, 2000);
  if (!pergunta) return res.status(400).json({ erro: 'Escreva uma pergunta.' });

  const ip = String(req.headers['x-forwarded-for'] || 'anon').split(',')[0].trim();
  if (await contaUso(ip) > LIMITE_HORA) {
    return res.status(429).json({ erro: 'Muitas perguntas nesta hora. Tente de novo daqui a pouco.' });
  }

  const hist = Array.isArray(body.historico) ? body.historico.slice(-10) : [];
  const contents = hist
    .filter(m => m && (m.papel === 'user' || m.papel === 'model') && m.texto)
    .map(m => ({ role: m.papel, parts: [{ text: String(m.texto).slice(0, 4000) }] }));
  contents.push({ role: 'user', parts: [{ text: pergunta }] });

  try {
    const modelo = process.env.GEMINI_MODEL || MODELO_PADRAO;
    let { status, j } = await chamaGemini(modelo, contents);
    if (status === 404 && !process.env.GEMINI_MODEL) ({ status, j } = await chamaGemini(MODELO_RESERVA, contents));
    if (status === 429) return res.status(429).json({ erro: 'O limite gratuito do Gemini foi atingido. Espere um minuto e tente de novo.' });
    if (status !== 200) {
      const msg = (j.error && j.error.message) || ('Gemini respondeu ' + status);
      return res.status(502).json({ erro: 'Erro no Gemini: ' + msg });
    }
    const cand = j.candidates && j.candidates[0];
    const texto = cand && cand.content && cand.content.parts ? cand.content.parts.map(p => p.text || '').join('').trim() : '';
    if (!texto) return res.status(502).json({ erro: 'O Gemini não devolveu resposta. Tente reformular a pergunta.' });
    return res.status(200).json({ resposta: texto });
  } catch (e) {
    return res.status(500).json({ erro: 'Falha ao falar com o Gemini: ' + e.message });
  }
};
