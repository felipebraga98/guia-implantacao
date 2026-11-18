// API de agendamento do cliente + aviso no Discord.
// Variáveis de ambiente no Vercel:
//   KV_REST_API_URL / KV_REST_API_TOKEN -> banco Upstash (o mesmo das listas)
//   DISCORD_WEBHOOK_URL                 -> link do webhook do canal do Discord
//
// Para mudar horários, duração ou vagas, edite as constantes abaixo.

const HORARIOS = ['09:00', '10:30', '13:30', '15:00', '16:30']; // início de cada atendimento
const DURACAO_MIN = 90;      // 1h30
const VAGAS = 2;             // clientes por horário
const DIAS_A_FRENTE = 15;    // quantos dias úteis aparecem para escolher
const ANTECEDENCIA_MIN = 60; // não deixa marcar com menos de 1h de antecedência
const FERIADOS = [           // AAAA-MM-DD — dias que não aparecem
  '2026-11-20', '2026-12-25', '2027-01-01', '2027-02-08', '2027-02-09', '2027-03-26',
  '2027-04-21', '2027-05-01', '2027-05-27', '2027-09-07', '2027-10-12', '2027-11-02',
  '2027-11-15', '2027-11-20', '2027-12-25'
];
const TZ_OFFSET_H = -3; // horário de Brasília (sem horário de verão)

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

// "agora" no horário de Brasília, como Date em UTC deslocado
function agoraBR() { return new Date(Date.now() + TZ_OFFSET_H * 3600e3); }
function ymd(d) { return d.toISOString().slice(0, 10); }
function minutosAte(data, hora) {
  const alvo = Date.parse(data + 'T' + hora + ':00Z') - TZ_OFFSET_H * 3600e3; // converte BR -> UTC
  return (alvo - Date.now()) / 60000;
}
function diasDisponiveis() {
  const out = [];
  const d = agoraBR(); d.setUTCHours(0, 0, 0, 0);
  for (let i = 0; out.length < DIAS_A_FRENTE && i < 60; i++) {
    const dia = new Date(d.getTime() + i * 86400e3);
    const dow = dia.getUTCDay();
    const s = ymd(dia);
    if (dow === 0 || dow === 6 || FERIADOS.includes(s)) continue;
    out.push(s);
  }
  return out;
}
function fimDe(hora) {
  const [h, m] = hora.split(':').map(Number);
  const t = h * 60 + m + DURACAO_MIN;
  return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
}
const chaveVaga = (data, hora) => 'agenda:vagas:' + data + ':' + hora;

function limpa(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max); }
const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
function dataBonita(s) {
  const d = new Date(s + 'T12:00:00Z');
  return SEMANA[d.getUTCDay()] + ', ' + s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4);
}

async function avisaDiscord(r) {
  const hook = process.env.DISCORD_WEBHOOK_URL;
  if (!hook) return false;
  const resp = await fetch(hook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'Agenda WhatsMenu',
      allowed_mentions: { parse: [] }, // ninguém é marcado pelo texto do formulário
      embeds: [{
        title: '📅 Novo agendamento',
        color: 0x00a63e,
        fields: [
          { name: 'Data', value: dataBonita(r.data), inline: true },
          { name: 'Horário', value: r.hora + ' às ' + fimDe(r.hora), inline: true },
          { name: 'Vagas restantes nesse horário', value: String(Math.max(0, VAGAS - r.ocupadas)), inline: true },
          { name: 'Nome', value: r.nome, inline: true },
          { name: 'Loja', value: r.loja, inline: true },
          { name: 'WhatsApp', value: r.whatsapp, inline: true },
          { name: 'E-mail', value: r.email, inline: false }
        ],
        footer: { text: 'Código ' + r.id },
        timestamp: new Date(r.criadoEm).toISOString()
      }]
    })
  });
  return resp.ok;
}

// ---- área da equipe: usa o mesmo login da página "Clientes Implantação" ----
const STATUS = ['aguardando', 'atendido', 'nao-atendeu', 'cancelado'];
async function equipeLogada(req) {
  const m = String(req.headers.authorization || '').match(/^Bearer ([a-f0-9]{48})$/);
  if (!m) return null;
  const usuario = await redis(['GET', 'impl:sessao:' + m[1]]);
  if (!usuario) return null;
  const raw = await redis(['HGET', 'impl:usuarios', usuario]);
  if (!raw) return null;
  const u = JSON.parse(raw);
  return { usuario: u.usuario, nome: u.nome || u.usuario };
}
function lerBody(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  return b || {};
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const { url, token } = cfg();
  if (!url || !token) return res.status(500).json({ erro: 'Agenda sem banco de dados conectado.' });

  try {
    const acao = String((req.query && req.query.acao) || new URL(req.url, 'http://x').searchParams.get('acao') || '');
    if (acao === 'lista' || acao === 'status') {
      const eu = await equipeLogada(req);
      if (!eu) return res.status(401).json({ erro: 'Entre com seu login da equipe.' });

      if (acao === 'lista' && req.method === 'GET') {
        const todos = (await redis(['HGETALL', 'agenda:reservas'])) || [];
        const desde = ymd(new Date(agoraBR().getTime() - 7 * 86400e3));
        const lista = [];
        for (let i = 0; i < todos.length; i += 2) {
          try {
            const r = JSON.parse(todos[i + 1]);
            if (r.data < desde) continue;
            delete r.ocupadas;
            r.fim = fimDe(r.hora); r.rotulo = dataBonita(r.data); r.status = r.status || 'aguardando';
            lista.push(r);
          } catch (e) {}
        }
        lista.sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora) || a.criadoEm - b.criadoEm);
        return res.status(200).json({ lista, hoje: ymd(agoraBR()), eu: eu.nome });
      }

      if (acao === 'status' && req.method === 'PATCH') {
        const b = lerBody(req);
        const id = limpa(b.id, 20), novo = limpa(b.status, 20);
        if (!STATUS.includes(novo)) return res.status(400).json({ erro: 'Status inválido.' });
        const raw = await redis(['HGET', 'agenda:reservas', id]);
        if (!raw) return res.status(404).json({ erro: 'Agendamento não encontrado.' });
        const r = JSON.parse(raw);
        const antes = r.status || 'aguardando';
        if (antes !== 'cancelado' && novo === 'cancelado') await redis(['DECR', chaveVaga(r.data, r.hora)]); // libera a vaga
        if (antes === 'cancelado' && novo !== 'cancelado') await redis(['INCR', chaveVaga(r.data, r.hora)]);
        r.status = novo; r.statusPor = eu.nome; r.statusEm = Date.now();
        await redis(['HSET', 'agenda:reservas', id, JSON.stringify(r)]);
        return res.status(200).json({ ok: true });
      }
      return res.status(405).json({ erro: 'Método não permitido.' });
    }

    if (req.method === 'GET') {
      const dias = diasDisponiveis();
      const chaves = [];
      dias.forEach(d => HORARIOS.forEach(h => chaves.push(chaveVaga(d, h))));
      const vals = chaves.length ? await redis(['MGET', ...chaves]) : [];
      let k = 0;
      const agenda = dias.map(d => ({
        data: d,
        rotulo: dataBonita(d),
        horarios: HORARIOS.map(h => {
          const ocup = Number(vals[k++]) || 0;
          const livre = Math.max(0, VAGAS - ocup);
          return { hora: h, fim: fimDe(h), vagas: minutosAte(d, h) < ANTECEDENCIA_MIN ? 0 : livre };
        })
      }));
      return res.status(200).json({ agenda, duracao: DURACAO_MIN });
    }

    if (req.method === 'POST') {
      let b = req.body;
      if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
      b = b || {};
      if (b.site) return res.status(200).json({ ok: true }); // armadilha anti-robô

      const r = {
        data: limpa(b.data, 10), hora: limpa(b.hora, 5),
        nome: limpa(b.nome, 80), loja: limpa(b.loja, 80),
        whatsapp: limpa(b.whatsapp, 20).replace(/[^\d()+\- ]/g, ''),
        email: limpa(b.email, 120)
      };
      if (!diasDisponiveis().includes(r.data) || !HORARIOS.includes(r.hora)) return res.status(400).json({ erro: 'Escolha um dia e horário da lista.' });
      if (minutosAte(r.data, r.hora) < ANTECEDENCIA_MIN) return res.status(400).json({ erro: 'Esse horário já passou. Escolha outro.' });
      if (r.nome.length < 2 || r.loja.length < 2) return res.status(400).json({ erro: 'Preencha seu nome e o nome da loja.' });
      if (r.whatsapp.replace(/\D/g, '').length < 10) return res.status(400).json({ erro: 'Informe o WhatsApp com DDD.' });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) return res.status(400).json({ erro: 'Informe um e-mail válido.' });

      const ip = String(req.headers['x-forwarded-for'] || 'anon').split(',')[0].trim();
      const lim = 'agenda:ip:' + ip + ':' + new Date().toISOString().slice(0, 13);
      const n = await redis(['INCR', lim]); await redis(['EXPIRE', lim, '3700']);
      if (n > 5) return res.status(429).json({ erro: 'Muitas tentativas. Tente de novo mais tarde.' });

      // reserva a vaga de forma segura (dois clientes ao mesmo tempo não estouram o limite)
      const kv = chaveVaga(r.data, r.hora);
      const ocupadas = await redis(['INCR', kv]);
      await redis(['EXPIRE', kv, String(60 * 60 * 24 * 60)]);
      if (ocupadas > VAGAS) {
        await redis(['DECR', kv]);
        return res.status(409).json({ erro: 'Esse horário acabou de lotar. Escolha outro.' });
      }

      r.id = Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
      r.criadoEm = Date.now();
      r.ocupadas = ocupadas;
      await redis(['HSET', 'agenda:reservas', r.id, JSON.stringify(r)]);

      let avisou = false;
      try { avisou = await avisaDiscord(r); } catch (e) { avisou = false; }
      if (!avisou) await redis(['LPUSH', 'agenda:falha-discord', r.id]);

      return res.status(200).json({ ok: true, id: r.id, rotulo: dataBonita(r.data), hora: r.hora, fim: fimDe(r.hora) });
    }

    return res.status(405).json({ erro: 'Método não permitido.' });
  } catch (e) {
    return res.status(500).json({ erro: 'Não foi possível agendar agora: ' + e.message });
  }
};
