// API da agenda de atendimentos WhatsMenu (mesmo arquivo nos dois projetos: guia e agenda-whatsmenu).
//
// Variáveis de ambiente no Vercel:
//   KV_REST_API_URL / KV_REST_API_TOKEN  -> banco Upstash (o mesmo das outras páginas)
//   EMAIL_USUARIO / EMAIL_SENHA_APP      -> Gmail que envia confirmações e lembretes (opcional)
//   AGENDA_URL                           -> endereço do site de agendamento (padrão: https://agenda-whatsmenu.vercel.app)
//   DISCORD_WEBHOOK_URL                  -> aviso no Discord (opcional)
//
// Os horários, feriados, bloqueios e tipos de atendimento são editados pela tela
// "Agendamentos › Configurações" (só administradores). Os valores abaixo são o padrão inicial.

const crypto = require('crypto');
const { cfg, redis, lerBody, limpa, equipeLogada } = require('./_equipe.js');
const MAIL = require('./_email.js');
const { emailConfigurado, enviarEmail, moldura, botao, esc } = MAIL;

const TZ = -3; // horário de Brasília
const K = {
  reservas: 'agenda:reservas',
  tokens: 'agenda:tokens',
  config: 'agenda:config',
  trava: (d) => 'agenda:trava:' + d,
  lembrete: (id, tipo) => 'agenda:lemb:' + id + ':' + tipo,
  ip: (ip) => 'agenda:ip:' + ip + ':' + new Date().toISOString().slice(0, 13),
};

const PADRAO = {
  horarios: { 0: [], 1: [['10:00', '19:30']], 2: [['10:00', '19:30']], 3: [['10:00', '19:30']], 4: [['10:00', '19:30']], 5: [['10:00', '19:30']], 6: [['10:00', '18:00']] },
  passo: 30,              // de quanto em quanto tempo começa um horário (min)
  vagas: 1,               // clientes no mesmo horário (ex.: número de consultores)
  maxPorDia: 0,           // 0 = sem limite
  intervalo: 0,           // folga obrigatória entre atendimentos (min)
  antecedencia: 60,       // antecedência mínima para o cliente marcar (min)
  diasAFrente: 15,        // quantos dias com horário aparecem para o cliente
  feriados: ['2026-11-20', '2026-12-25', '2027-01-01', '2027-02-08', '2027-02-09', '2027-03-26', '2027-04-21', '2027-05-01', '2027-05-27', '2027-09-07', '2027-10-12', '2027-11-02', '2027-11-15', '2027-11-20', '2027-12-25'],
  especiais: {},          // { 'AAAA-MM-DD': [['13:00','17:00']] } ; [] = fechado nesse dia
  bloqueios: {},          // { 'AAAA-MM-DD': ['10:00','10:30'] } ; ['*'] = dia inteiro
  tipos: [{ id: 'implantacao', nome: 'Configuração do painel', descricao: 'Vamos configurar o seu painel com você.', duracao: 60, ativo: true }],
  local: 'Vamos chamar você no WhatsApp informado.',
  linkVideo: '',
  chamadaPropria: true,
  // aviso pelo WhatsApp (TousChat) antes do atendimento — precisa do TOUSCHAT_TOKEN no Vercel
  whats: { ativo: false, minutos: 15, templateId: '', templateNome: '', from: '', params: {} },
  proxQtd: 1,             // quantos próximos clientes aparecem no destaque da página Agendamentos
  alarmeMin: 15,          // quantos minutos antes o alarme da equipe começa a tocar   // cria uma sala de vídeo WhatsMenu diferente para cada agendamento
  lembretes: { confirmacao: true, vespera: true, umaHora: true, naoAtendeu: true },
  confirmarEmail: false,  // exige que o cliente confirme pelo e-mail em até 30 min
  textoSucesso: 'Te espero {quando}, para configurarmos o seu painel e você faturar ainda mais com a WhatsMenu! Desde já, te desejo todo o sucesso! 💚',
  icsChave: '',
};
const STATUS = ['pendente', 'aguardando', 'atendido', 'nao-atendeu', 'cancelado'];
const OCUPA = ['aguardando', 'atendido', 'nao-atendeu'];
const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

// ---------- utilidades de data e hora ----------
const agoraBR = () => new Date(Date.now() + TZ * 3600e3);
const ymd = (d) => d.toISOString().slice(0, 10);
const hojeBR = () => ymd(agoraBR());
const paraMin = (h) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
const deMin = (t) => String(Math.floor(t / 60) % 24).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
const inicioMs = (data, hora) => Date.parse(data + 'T' + hora + ':00Z') - TZ * 3600e3;
const minutosAte = (data, hora) => (inicioMs(data, hora) - Date.now()) / 60000;
function dataBonita(s) {
  const d = new Date(s + 'T12:00:00Z');
  return SEMANA[d.getUTCDay()] + ', ' + s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4);
}
const comArtigo = (rot) => (/^(sábado|domingo)/.test(rot) ? 'no ' : 'na ') + rot;
function faixa(ini, fim, passo) {
  const out = [];
  for (let t = paraMin(ini); t <= paraMin(fim); t += passo) out.push(deMin(t));
  return out;
}

// ---------- configuração ----------
async function lerConfig() {
  const raw = await redis(['GET', K.config]);
  let c = {};
  try { c = raw ? JSON.parse(raw) : {}; } catch (e) { c = {}; }
  const out = Object.assign({}, PADRAO, c);
  out.lembretes = Object.assign({}, PADRAO.lembretes, c.lembretes || {});
  out.whats = Object.assign({}, PADRAO.whats, c.whats || {});
  if (!Array.isArray(out.tipos) || !out.tipos.length) out.tipos = PADRAO.tipos;
  if (!out.icsChave) {
    out.icsChave = crypto.randomBytes(16).toString('hex');
    await redis(['SET', K.config, JSON.stringify(Object.assign({}, c, { icsChave: out.icsChave }))]);
  }
  return out;
}

function validaFaixas(v) {
  if (!Array.isArray(v)) return [];
  return v.filter((f) => Array.isArray(f) && HORA_RE.test(f[0]) && HORA_RE.test(f[1]) && paraMin(f[0]) <= paraMin(f[1]))
    .slice(0, 4).map((f) => [f[0], f[1]]);
}

function normalizaConfig(b, atual) {
  const n = (v, min, max, pad) => { const x = Math.round(Number(v)); return Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : pad; };
  const c = {};
  c.horarios = {};
  for (let d = 0; d < 7; d++) c.horarios[d] = validaFaixas(b.horarios && b.horarios[d]);
  c.passo = [15, 20, 30, 45, 60].includes(Number(b.passo)) ? Number(b.passo) : atual.passo;
  c.vagas = n(b.vagas, 1, 20, atual.vagas);
  c.maxPorDia = n(b.maxPorDia, 0, 200, atual.maxPorDia);
  c.intervalo = n(b.intervalo, 0, 240, atual.intervalo);
  c.antecedencia = n(b.antecedencia, 0, 10080, atual.antecedencia);
  c.diasAFrente = n(b.diasAFrente, 1, 90, atual.diasAFrente);
  c.feriados = Array.from(new Set((Array.isArray(b.feriados) ? b.feriados : []).filter((d) => DATA_RE.test(d)))).sort().slice(0, 200);
  c.especiais = {};
  Object.keys(b.especiais || {}).slice(0, 200).forEach((d) => { if (DATA_RE.test(d)) c.especiais[d] = validaFaixas(b.especiais[d]); });
  c.bloqueios = {};
  Object.keys(b.bloqueios || {}).slice(0, 400).forEach((d) => {
    if (!DATA_RE.test(d) || !Array.isArray(b.bloqueios[d])) return;
    const hs = b.bloqueios[d].filter((h) => h === '*' || HORA_RE.test(h));
    if (hs.length) c.bloqueios[d] = Array.from(new Set(hs)).slice(0, 96);
  });
  c.tipos = (Array.isArray(b.tipos) ? b.tipos : []).slice(0, 10).map((t, i) => ({
    id: limpa(t.id, 30).replace(/[^a-z0-9-]/gi, '').toLowerCase() || 'tipo' + (i + 1),
    nome: limpa(t.nome, 60) || 'Atendimento',
    descricao: limpa(t.descricao, 200),
    duracao: n(t.duracao, 5, 480, 60),
    ativo: t.ativo !== false,
  }));
  if (!c.tipos.some((t) => t.ativo)) c.tipos = atual.tipos;
  c.local = limpa(b.local, 200) || PADRAO.local;
  c.linkVideo = /^https:\/\/\S+$/.test(limpa(b.linkVideo, 300)) ? limpa(b.linkVideo, 300) : '';
  c.lembretes = { confirmacao: !!(b.lembretes && b.lembretes.confirmacao), vespera: !!(b.lembretes && b.lembretes.vespera), umaHora: !!(b.lembretes && b.lembretes.umaHora), naoAtendeu: !(b.lembretes && b.lembretes.naoAtendeu === false) };
  c.confirmarEmail = !!b.confirmarEmail;
  c.chamadaPropria = b.chamadaPropria !== false;
  c.alarmeMin = n(b.alarmeMin, 1, 180, atual.alarmeMin || 15);
  c.proxQtd = n(b.proxQtd, 1, 10, atual.proxQtd || 1);
  const w = b.whats || {}, wa = atual.whats || PADRAO.whats;
  const campos = ['primeiroNome', 'nome', 'hora', 'data', 'link', 'tipo', 'fixo'];
  const params = {};
  Object.keys(w.params || {}).slice(0, 10).forEach((k) => {
    const v = w.params[k] || {}; const nome = limpa(k, 60); if (!nome) return;
    params[nome] = { campo: campos.includes(v.campo) ? v.campo : 'fixo', texto: limpa(v.texto, 200) };
  });
  c.whats = { ativo: !!w.ativo, minutos: n(w.minutos, 1, 180, wa.minutos || 15), templateId: limpa(w.templateId, 60).replace(/[^a-z0-9-]/gi, ''),
    templateNome: limpa(w.templateNome, 120), from: limpa(w.from, 20).replace(/\D/g, ''), params };
  c.textoSucesso = limpa(b.textoSucesso, 400) || PADRAO.textoSucesso;
  c.icsChave = b.novaChave ? crypto.randomBytes(16).toString('hex') : atual.icsChave;
  return c;
}

// ---------- disponibilidade ----------
function horariosDoDia(data, c) {
  if (c.feriados.includes(data)) return [];
  const dow = new Date(data + 'T12:00:00Z').getUTCDay();
  const faixas = Object.prototype.hasOwnProperty.call(c.especiais, data) ? c.especiais[data] : (c.horarios[dow] || []);
  const bloq = c.bloqueios[data] || [];
  if (bloq.includes('*')) return [];
  const set = new Set();
  faixas.forEach((f) => faixa(f[0], f[1], c.passo).forEach((h) => set.add(h)));
  return Array.from(set).filter((h) => !bloq.includes(h)).sort();
}

function ocupa(r) {
  if (OCUPA.includes(r.status || 'aguardando')) return true;
  return r.status === 'pendente' && (r.expiraEm || 0) > Date.now();
}

async function todasReservas() {
  const arr = (await redis(['HGETALL', K.reservas])) || [];
  const out = [];
  for (let i = 0; i < arr.length; i += 2) {
    try { const r = JSON.parse(arr[i + 1]); r.status = r.status || 'aguardando'; out.push(r); } catch (e) {}
  }
  return out;
}

/** Monta os dias e horários livres. ignorarId = reserva que está sendo remarcada. */
function montarAgenda(c, reservas, ignorarId, diasExtras) {
  const porDia = {};
  reservas.forEach((r) => { if (r.id !== ignorarId && ocupa(r)) (porDia[r.data] = porDia[r.data] || []).push(r); });
  const dias = [];
  const base = agoraBR(); base.setUTCHours(0, 0, 0, 0);
  for (let i = 0; dias.length < (diasExtras || c.diasAFrente) && i < 120; i++) {
    const data = ymd(new Date(base.getTime() + i * 86400e3));
    const hs = horariosDoDia(data, c);
    if (!hs.length) continue;
    const doDia = porDia[data] || [];
    const lotadoDia = c.maxPorDia > 0 && doDia.length >= c.maxPorDia;
    const janela = c.passo + c.intervalo;
    dias.push({
      data, rotulo: dataBonita(data),
      horarios: hs.map((h) => {
        const t = paraMin(h);
        const conflitos = doDia.filter((r) => Math.abs(paraMin(r.hora) - t) < janela).length;
        const livre = !lotadoDia && minutosAte(data, h) >= c.antecedencia ? Math.max(0, c.vagas - conflitos) : 0;
        return { hora: h, vagas: livre };
      }),
    });
  }
  return dias;
}

function horarioLivre(c, reservas, data, hora, ignorarId, ignorarAntecedencia) {
  const hs = horariosDoDia(data, c);
  if (!hs.includes(hora)) return 'Escolha um dia e horário da lista.';
  if (!ignorarAntecedencia && minutosAte(data, hora) < c.antecedencia) return 'Esse horário já passou ou está muito próximo. Escolha outro.';
  const doDia = reservas.filter((r) => r.id !== ignorarId && r.data === data && ocupa(r));
  if (c.maxPorDia > 0 && doDia.length >= c.maxPorDia) return 'Esse dia já está lotado. Escolha outro.';
  const t = paraMin(hora);
  const conflitos = doDia.filter((r) => Math.abs(paraMin(r.hora) - t) < c.passo + c.intervalo).length;
  if (conflitos >= c.vagas) return 'Esse horário acabou de ser ocupado. Escolha outro.';
  return '';
}

/** Trava curta por dia, para dois clientes não pegarem a última vaga ao mesmo tempo. */
async function comTrava(data, fn) {
  const chave = K.trava(data);
  const id = crypto.randomBytes(6).toString('hex');
  for (let i = 0; i < 20; i++) {
    const ok = await redis(['SET', chave, id, 'NX', 'PX', '5000']);
    if (ok === 'OK') {
      try { return await fn(); } finally {
        if ((await redis(['GET', chave])) === id) await redis(['DEL', chave]);
      }
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('A agenda está ocupada agora. Tente de novo em alguns segundos.');
}

// ---------- links, calendário e e-mails ----------
const siteAgenda = () => (process.env.AGENDA_URL || 'https://agenda-whatsmenu.vercel.app').replace(/\/+$/, '');
const tipoDe = (c, id) => c.tipos.find((t) => t.id === id) || c.tipos.find((t) => t.ativo) || PADRAO.tipos[0];
const fimDe = (r) => deMin(paraMin(r.hora) + (r.duracao || 60));
const linkGerenciar = (r) => siteAgenda() + '/#g=' + r.token;
const novaSala = () => 'wm-' + Array.from(crypto.randomBytes(10)).map((b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('');
async function garantirSala(r) {
  if (r.sala) return false;
  r.sala = novaSala();
  await redis(['SET', 'chamada:sala:' + r.sala, JSON.stringify({ id: r.id, nome: String(r.nome || '').split(' ')[0] })]);
  return true;
}
const linkSala = (r) => (r.sala ? siteAgenda() + '/chamada.html?sala=' + r.sala : '');
/** Link de vídeo que vale para o atendimento: o link fixo do agendamento, o padrão da config, ou a sala WhatsMenu. */
const linkDaChamada = (r, c) => r.linkVideo || c.linkVideo || (c.chamadaPropria !== false ? linkSala(r) : '');
const icsData = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

function linkGoogle(r, c) {
  const ini = inicioMs(r.data, r.hora), fim = ini + (r.duracao || 60) * 60e3;
  const det = 'Atendimento com a equipe WhatsMenu (' + (r.tipoNome || 'atendimento') + ').\n' + (linkDaChamada(r, c) ? 'Chamada de vídeo: ' + linkDaChamada(r, c) + '\n' : '') + 'Gerenciar: ' + linkGerenciar(r);
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent('WhatsMenu · ' + (r.tipoNome || 'Atendimento')) +
    '&dates=' + icsData(ini) + '/' + icsData(fim) + '&details=' + encodeURIComponent(det) + '&location=' + encodeURIComponent(linkDaChamada(r, c) || 'WhatsApp');
}

const icsTexto = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (m) => '\\' + m);
function eventoIcs(r, c, paraEquipe) {
  const ini = inicioMs(r.data, r.hora), fim = ini + (r.duracao || 60) * 60e3;
  const titulo = paraEquipe ? (r.nome + ' · ' + r.loja + (r.consultorNome ? ' (' + r.consultorNome + ')' : '')) : ('WhatsMenu · ' + (r.tipoNome || 'Atendimento'));
  const desc = paraEquipe
    ? ((r.tipoNome || '') + '\nWhatsApp: ' + r.whatsapp + '\nE-mail: ' + r.email + (r.notas ? '\nNotas: ' + r.notas : ''))
    : ('Atendimento com a equipe WhatsMenu.\nGerenciar: ' + linkGerenciar(r));
  return ['BEGIN:VEVENT', 'UID:' + r.id + '@whatsmenu-agenda', 'DTSTAMP:' + icsData(Date.now()), 'DTSTART:' + icsData(ini), 'DTEND:' + icsData(fim),
    'SUMMARY:' + icsTexto(titulo), 'DESCRIPTION:' + icsTexto(desc), 'LOCATION:' + icsTexto(linkDaChamada(r, c) || 'WhatsApp'),
    'STATUS:' + (r.status === 'cancelado' ? 'CANCELLED' : 'CONFIRMED'),
    'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsTexto(titulo), 'END:VALARM', 'END:VEVENT'].join('\r\n');
}
function calendarioIcs(eventos, nome) {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//WhatsMenu//Agenda//PT-BR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + icsTexto(nome), 'X-WR-TIMEZONE:America/Sao_Paulo']
    .concat(eventos).concat(['END:VCALENDAR']).join('\r\n');
}

function blocoDetalhes(r, c) {
  const link = linkDaChamada(r, c);
  return '<div style="background:#e6f6ec;border-radius:12px;padding:14px 16px;margin:14px 0">' +
    '<div style="font-size:18px;font-weight:bold;color:#007a2e">' + esc(dataBonita(r.data).replace(/^./, (x) => x.toUpperCase())) + ' às ' + r.hora + '</div>' +
    '<div>' + esc(r.tipoNome || 'Atendimento') + ' · cerca de ' + (r.duracao || 60) + ' minutos</div>' +
    '<div style="margin-top:6px">' + esc(c.local) + (link ? '<br>Se combinarmos chamada de vídeo, use este link: <a href="' + esc(link) + '">' + esc(link) + '</a>' : '') + '</div></div>';
}

async function emailCliente(tipo, r, c) {
  if (!emailConfigurado() || !r.email) return false;
  const nome = String(r.nome || '').split(' ')[0];
  const quando = comArtigo(dataBonita(r.data)) + ', às ' + r.hora;
  let assunto, titulo, corpo, extra = '';
  const botoes = botao('Adicionar ao Google Agenda', linkGoogle(r, c)) + botao('Remarcar ou cancelar', linkGerenciar(r), '#14251b');
  if (tipo === 'pendente') {
    assunto = 'Confirme seu agendamento com a WhatsMenu';
    titulo = 'Falta só confirmar, ' + nome + '!';
    corpo = '<p>Para garantir o seu horário, clique no botão abaixo em até 30 minutos.</p>' + blocoDetalhes(r, c) + botao('Confirmar meu horário', siteAgenda() + '/#c=' + r.token);
  } else if (tipo === 'confirmado') {
    assunto = 'Agendamento confirmado: ' + dataBonita(r.data) + ' às ' + r.hora;
    titulo = 'Tudo certo, ' + nome + '! 🎉';
    corpo = '<p>Seu atendimento com a WhatsMenu está confirmado ' + esc(quando) + '.</p>' + blocoDetalhes(r, c) + botoes;
  } else if (tipo === 'vespera') {
    assunto = 'Lembrete: seu atendimento WhatsMenu é amanhã às ' + r.hora;
    titulo = 'Até amanhã, ' + nome + '!';
    corpo = '<p>Passando para lembrar do seu atendimento ' + esc(quando) + '. Deixe o computador ou celular da loja por perto.</p>' + blocoDetalhes(r, c) + botoes;
  } else if (tipo === 'umaHora') {
    assunto = 'Seu atendimento WhatsMenu começa às ' + r.hora;
    titulo = 'Daqui a pouco, ' + nome + '!';
    corpo = '<p>Seu atendimento começa às ' + r.hora + '. Fique de olho no WhatsApp que vamos chamar você.</p>' + blocoDetalhes(r, c) + botao('Precisa remarcar?', linkGerenciar(r), '#14251b');
  } else if (tipo === 'remarcado') {
    assunto = 'Agendamento remarcado: ' + dataBonita(r.data) + ' às ' + r.hora;
    titulo = 'Novo horário confirmado';
    corpo = '<p>Oi, ' + esc(nome) + '! Seu atendimento foi remarcado para ' + esc(quando) + '.</p>' + blocoDetalhes(r, c) + botoes;
  } else if (tipo === 'naoAtendeu') {
    assunto = 'Reagendamento do atendimento';
    titulo = 'Vamos remarcar, ' + nome + '?';
    corpo = '<p>Tentamos falar com você no horário combinado (' + esc(quando) + '), mas não conseguimos contato.</p>' +
      '<p>Sem problema! É só escolher um novo dia e horário para a nossa equipe ligar de novo e continuar a configuração do seu painel WhatsMenu.</p>' +
      botao('Escolher novo horário', linkGerenciar(r)) +
      '<p style="color:#4f6357;font-size:13px">No link, clique em <b>Remarcar</b> e escolha o horário que for melhor para você.</p>';
  } else if (tipo === 'cancelado') {
    assunto = 'Agendamento cancelado';
    titulo = 'Agendamento cancelado';
    corpo = '<p>Oi, ' + esc(nome) + '. O atendimento ' + esc(quando) + ' foi cancelado.</p><p>Quando quiser, escolha um novo horário:</p>' + botao('Agendar de novo', siteAgenda());
  } else return false;
  const texto = titulo + '\n\n' + (tipo === 'naoAtendeu' ? 'Tentamos falar com você ' + quando + ', mas não conseguimos. Escolha um novo horário: ' + linkGerenciar(r) : tipo === 'pendente' ? 'Confirme em até 30 minutos: ' + siteAgenda() + '/#c=' + r.token : 'Quando: ' + quando + '\nRemarcar ou cancelar: ' + linkGerenciar(r)) + extra;
  const anexos = (tipo === 'confirmado' || tipo === 'remarcado') ? [{ filename: 'atendimento-whatsmenu.ics', content: calendarioIcs([eventoIcs(r, c, false)], 'WhatsMenu'), contentType: 'text/calendar; charset=utf-8; method=PUBLISH' }] : undefined;
  return enviarEmail({ para: r.email, assunto, texto, html: moldura(titulo, corpo), anexos });
}

async function avisaDiscord(r) {
  const hook = process.env.DISCORD_WEBHOOK_URL;
  if (!hook) return false;
  const resp = await fetch(hook, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'Agenda WhatsMenu', allowed_mentions: { parse: [] },
      embeds: [{ title: '📅 Novo agendamento', color: 0x00a63e, fields: [
        { name: 'Quando', value: dataBonita(r.data) + ' às ' + r.hora, inline: true },
        { name: 'Tipo', value: r.tipoNome || '-', inline: true },
        { name: 'Cliente', value: r.nome + ' · ' + r.loja, inline: false },
        { name: 'WhatsApp', value: r.whatsapp, inline: true }], footer: { text: 'Código ' + r.id } }],
    }),
  });
  return resp.ok;
}

/** Envia os lembretes que já estão na hora. Chamado pelo agendador diário e pelas telas da equipe abertas. */
async function enviarLembretes(c, reservas) {
  if (!emailConfigurado()) return 0;
  let n = 0;
  const agora = Date.now();
  for (const r of reservas) {
    // importados do Google Agenda não recebem lembrete por e-mail (o Google já avisa o cliente)
    if (r.status !== 'aguardando' || !r.email || r.origem === 'google') continue;
    const ini = inicioMs(r.data, r.hora);
    const falta = (ini - agora) / 60000;
    const antecedenciaCriacao = (ini - (r.criadoEm || 0)) / 60000;
    const envios = [];
    if (c.lembretes.vespera && falta <= 24 * 60 && falta > 120 && antecedenciaCriacao > 26 * 60) envios.push('vespera');
    if (c.lembretes.umaHora && falta <= 70 && falta > 5 && antecedenciaCriacao > 90) envios.push('umaHora');
    for (const tipo of envios) {
      const marca = K.lembrete(r.id + ':' + r.data + r.hora, tipo);
      if ((await redis(['SET', marca, '1', 'NX', 'EX', String(8 * 86400)])) !== 'OK') continue;
      try { if (await emailCliente(tipo, r, c)) n++; } catch (e) { await redis(['DEL', marca]); }
    }
  }
  return n;
}

// ---------- aviso pelo WhatsApp (TousChat) ----------
const TOUSCHAT = 'https://api.app.tous.chat/chat';
const touschatToken = () => process.env.TOUSCHAT_TOKEN || '';
function telefoneWhats(t) {
  let d = String(t || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 10 || d.length === 11) d = '55' + d; // DDD + número
  return d.length >= 12 && d.length <= 13 ? d : '';
}
async function touschat(metodo, caminho, corpo) {
  const r = await fetch(TOUSCHAT + caminho, { method: metodo, headers: { Authorization: 'Bearer ' + touschatToken(), 'Content-Type': 'application/json', Accept: 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error((j && (j.text || j.message || j.title)) || ('TousChat respondeu ' + r.status)); e.status = r.status; throw e; }
  return j;
}
// campos do modelo: a TousChat devolve em "params" ou só no texto, como [p1] ou {{nome}}
function camposModelo(t) {
  const nomes = (t.params || []).map((p) => p.name).filter(Boolean);
  const txt = String(t.text || '');
  let m; const re = /\[([a-z0-9_]+)\]|\{\{\s*([a-z0-9_]+)\s*\}\}/gi;
  while ((m = re.exec(txt))) { const n = m[1] || m[2]; if (!nomes.includes(n)) nomes.push(n); }
  return nomes;
}
function valorParam(campo, texto, r, c) {
  const nome = String(r.nome || '').trim();
  if (campo === 'primeiroNome') return (nome.split(/\s+/)[0] || 'tudo bem').replace(/@.*/, '');
  if (campo === 'nome') return nome;
  if (campo === 'hora') return r.hora;
  if (campo === 'data') return dataBonita(r.data);
  if (campo === 'link') return linkDaChamada(r, c) || '';
  if (campo === 'tipo') return r.tipoNome || 'atendimento';
  return texto || '';
}
async function mandaWhats(r, c) {
  const w = c.whats, to = telefoneWhats(r.whatsapp);
  if (!to) throw new Error('WhatsApp do cliente inválido');
  const parameters = {};
  Object.keys(w.params || {}).forEach((k) => { parameters[k] = valorParam(w.params[k].campo, w.params[k].texto, r, c); });
  const corpo = { to, body: { templateId: w.templateId }, options: { hiddenSession: false } };
  if (Object.keys(parameters).length) corpo.body.parameters = parameters;
  if (w.from) corpo.from = w.from;
  return touschat('POST', '/v1/message/send', corpo);
}
/** Manda o aviso X minutos antes de cada atendimento (uma vez por agendamento). */
async function enviarWhats(c, reservas) {
  const w = c.whats || {};
  if (!w.ativo || !w.templateId || !touschatToken()) return 0;
  const agora = Date.now(); let n = 0;
  for (const r of reservas) {
    if (r.status !== 'aguardando' || !r.whatsapp) continue;
    const falta = (inicioMs(r.data, r.hora) - agora) / 60000;
    if (falta > (w.minutos || 15) || falta < 2) continue;
    const marca = 'agenda:wa:' + r.id + ':' + r.data + r.hora;
    if ((await redis(['SET', marca, '1', 'NX', 'EX', String(3 * 86400)])) !== 'OK') continue;
    let texto;
    try { const j = await mandaWhats(r, c); texto = 'Aviso pelo WhatsApp (TousChat) enviado ' + Math.round(falta) + ' min antes' + (j && j.status ? ' · ' + j.status : ''); n++; }
    catch (e) { texto = 'Aviso pelo WhatsApp não foi enviado: ' + e.message; }
    const atual = await redis(['HGET', K.reservas, r.id]);
    if (atual) { const x = JSON.parse(atual); x.whatsAviso = { quando: Date.now(), ok: !/não foi/.test(texto) }; historico(x, 'Sistema', texto); await salvar(x); }
  }
  return n;
}

// ---------- dados ----------
function publico(r, c) {
  const link = linkDaChamada(r, c);
  return {
    id: r.id, status: r.status, data: r.data, hora: r.hora, fim: fimDe(r), rotulo: dataBonita(r.data),
    nome: r.nome, loja: r.loja, tipoNome: r.tipoNome, duracao: r.duracao || 60, local: c.local, linkVideo: link || '',
    google: linkGoogle(r, c), ics: '/api/agendamento?acao=ics&t=' + r.token,
    podeAlterar: r.status === 'aguardando' || r.status === 'pendente' || r.status === 'nao-atendeu',
  };
}
function paraEquipe(r, c) {
  const o = Object.assign({}, r);
  delete o.token;
  o.linkChamada = c ? linkDaChamada(r, c) : '';
  o.salaWhatsMenu = r.sala ? linkSala(r) + '&equipe=1' : '';
  o.fim = fimDe(r); o.rotulo = dataBonita(r.data);
  return o;
}
async function salvar(r) { await redis(['HSET', K.reservas, r.id, JSON.stringify(r)]); }
function historico(r, quem, texto) { r.hist = [{ quando: Date.now(), quem, texto }].concat(r.hist || []).slice(0, 40); }

async function porToken(t) {
  if (!/^[a-f0-9]{32}$/.test(String(t || ''))) return null;
  const id = await redis(['HGET', K.tokens, t]);
  if (!id) return null;
  const raw = await redis(['HGET', K.reservas, id]);
  if (!raw) return null;
  const r = JSON.parse(raw); r.status = r.status || 'aguardando';
  if (r.status === 'pendente' && (r.expiraEm || 0) < Date.now()) r.expirado = true;
  return r;
}

const DISPOSITIVOS = { computador: '💻 Computador', celular: '📱 Celular' };
function dadosCliente(b) {
  // o link do cliente pergunta o dispositivo (computador ou celular) no lugar do nome da loja
  const disp = DISPOSITIVOS[String(b.dispositivo || '')] || '';
  return {
    nome: limpa(b.nome, 80), loja: limpa(b.loja, 80) || disp,
    whatsapp: limpa(b.whatsapp, 20).replace(/[^\d()+\- ]/g, ''),
    email: limpa(b.email, 120).toLowerCase(),
  };
}
function validaCliente(d) {
  if (d.nome.length < 2) return 'Preencha seu nome.';
  if (d.loja.length < 2) return 'Escolha qual dispositivo você vai usar no atendimento.';
  if (d.whatsapp.replace(/\D/g, '').length < 10) return 'Informe o WhatsApp com DDD.';
  if (!EMAIL_RE.test(d.email)) return 'Informe um e-mail válido.';
  return '';
}

async function criarReserva({ c, data, hora, tipoId, dados, origem, eu, notas, consultor, ignorarAntecedencia, hist }) {
  return comTrava(data, async () => {
    const reservas = await todasReservas();
    const erro = horarioLivre(c, reservas, data, hora, null, ignorarAntecedencia);
    if (erro) { const e = new Error(erro); e.codigo = 409; throw e; }
    const tipo = tipoDe(c, tipoId);
    const r = Object.assign({
      id: Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase(),
      token: crypto.randomBytes(16).toString('hex'),
      data, hora, tipo: tipo.id, tipoNome: tipo.nome, duracao: tipo.duracao,
      status: origem === 'cliente' && c.confirmarEmail ? 'pendente' : 'aguardando',
      criadoEm: Date.now(), origem, notas: notas || '', consultor: '', consultorNome: '', hist: [],
    }, dados);
    if (r.status === 'pendente') r.expiraEm = Date.now() + 30 * 60e3;
    await garantirSala(r);
    if (consultor) { r.consultor = consultor.usuario; r.consultorNome = consultor.nome; }
    if (hist) historico(r, hist.quem, hist.texto); else historico(r, eu ? eu.nome : 'Cliente', eu ? 'Agendado pela equipe' : 'Agendado pelo link');
    await salvar(r);
    await redis(['HSET', K.tokens, r.token, r.id]);
    return r;
  });
}

async function remarcar(c, r, data, hora, quem, ignorarAntecedencia) {
  return comTrava(data, async () => {
    const reservas = await todasReservas();
    const erro = horarioLivre(c, reservas, data, hora, r.id, ignorarAntecedencia);
    if (erro) { const e = new Error(erro); e.codigo = 409; throw e; }
    historico(r, quem, 'Remarcado de ' + dataBonita(r.data) + ' ' + r.hora + ' para ' + dataBonita(data) + ' ' + hora);
    r.data = data; r.hora = hora;
    if (r.status !== 'pendente') r.status = 'aguardando';
    delete r.alarmeParado; delete r.emAtendimento;
    await salvar(r);
    return r;
  });
}

async function usuariosEquipe() {
  const arr = (await redis(['HGETALL', 'impl:usuarios'])) || [];
  const out = [];
  for (let i = 0; i < arr.length; i += 2) {
    try { const u = JSON.parse(arr[i + 1]); if (!u.bloqueado) out.push({ usuario: u.usuario, nome: u.nome || u.usuario }); } catch (e) {}
  }
  return out.sort((a, b) => a.nome.localeCompare(b.nome));
}

// ---------- IA da TousChat (habilidade "Acionar API") ----------
const CHAVE_IA = 'agenda:ia:chave';
async function chaveIA(gerarNova) {
  let k = gerarNova ? '' : await redis(['GET', CHAVE_IA]);
  if (!k) { k = 'wmia-' + crypto.randomBytes(18).toString('hex'); await redis(['SET', CHAVE_IA, k]); }
  return k;
}
function chaveRecebida(req, b) {
  const h = req.headers || {};
  const auth = String(h.authorization || h.Authorization || '').replace(/^Bearer\s+/i, '').trim();
  return auth || String(h['x-chave'] || '').trim() || String(b.chave || '').trim() || param(req, 'chave');
}
// junta o que veio no corpo e na URL (a TousChat pode mandar de um jeito ou de outro)
function camposIA(req) {
  const b = Object.assign({}, lerBody(req));
  try { new URL(req.url, 'http://x').searchParams.forEach((v, k) => { if (b[k] == null || b[k] === '') b[k] = v; }); } catch (e) {}
  return b;
}
// entende "2026-11-25", "25/11", "25/11/2026", "25-11", "hoje", "amanhã"
function dataIA(v) {
  const t = String(v || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!t) return '';
  const hoje = agoraBR(); hoje.setUTCHours(0, 0, 0, 0);
  if (t === 'hoje') return ymd(hoje);
  if (t === 'amanha') return ymd(new Date(hoje.getTime() + 86400e3));
  if (t === 'depois de amanha') return ymd(new Date(hoje.getTime() + 2 * 86400e3));
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
  m = t.match(/(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?/);
  if (m) {
    let ano = m[3] ? (m[3].length === 2 ? '20' + m[3] : m[3]) : String(hoje.getUTCFullYear());
    let d = ano + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
    if (!m[3] && d < ymd(hoje)) d = (+ano + 1) + d.slice(4); // 05/01 dito em dezembro = ano que vem
    return d;
  }
  return '';
}
// entende "10:00", "10h", "10h30", "10", "9:30"
function horaIA(v) {
  const m = String(v || '').trim().toLowerCase().match(/^(\d{1,2})(?:\s*[:h]\s*(\d{2}))?\s*h?(?:rs?)?$/);
  if (!m || +m[1] > 23) return '';
  return m[1].padStart(2, '0') + ':' + (m[2] || '00');
}
function dispositivoIA(v) {
  const t = String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/celular|telefone|smartphone|iphone|android|mobile|cel\b/.test(t)) return 'celular';
  if (/comput|pc|notebook|note\b|desktop|laptop|mac/.test(t)) return 'computador';
  return '';
}
function livresDoDia(dia) { return dia.horarios.filter((h) => h.vagas > 0).map((h) => h.hora); }
function textoHorarios(dias, max) {
  return dias.map((d) => { const hs = livresDoDia(d); const mostra = max && hs.length > max ? hs.slice(0, max).join(', ') + ' (e mais ' + (hs.length - max) + ')' : hs.join(', '); return '• ' + d.rotulo.replace(/\/\d{4}$/, '') + ': ' + mostra; }).join('\n');
}

function acaoDe(req) {
  return String((req.query && req.query.acao) || new URL(req.url, 'http://x').searchParams.get('acao') || '');
}
function param(req, k) {
  return String((req.query && req.query[k]) || new URL(req.url, 'http://x').searchParams.get(k) || '');
}

// ---------- rotas ----------
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const { url, token } = cfg();
  if (!url || !token) return res.status(500).json({ erro: 'Agenda sem banco de dados conectado.' });
  await MAIL.carregar(); // e-mail que envia, escolhido pelos administradores

  try {
    const acao = acaoDe(req);
    const c = await lerConfig();

    // ===== área pública (cliente) =====
    if (!acao && req.method === 'GET') {
      const reservas = await todasReservas();
      return res.status(200).json({
        agenda: montarAgenda(c, reservas),
        tipos: c.tipos.filter((t) => t.ativo).map((t) => ({ id: t.id, nome: t.nome, descricao: t.descricao, duracao: t.duracao })),
        local: c.local, confirmarEmail: c.confirmarEmail && emailConfigurado(), textoSucesso: c.textoSucesso,
      });
    }

    if (!acao && req.method === 'POST') {
      const b = lerBody(req);
      if (b.site) return res.status(200).json({ ok: true }); // armadilha anti-robô
      const data = limpa(b.data, 10), hora = limpa(b.hora, 5);
      const dados = dadosCliente(b);
      const erro = validaCliente(dados);
      if (erro) return res.status(400).json({ erro });
      const ip = String(req.headers['x-forwarded-for'] || 'anon').split(',')[0].trim();
      const n = await redis(['INCR', K.ip(ip)]); if (n === 1) await redis(['EXPIRE', K.ip(ip), '3700']);
      if (n > 6) return res.status(429).json({ erro: 'Muitas tentativas. Tente de novo mais tarde.' });
      if (!DATA_RE.test(data) || !HORA_RE.test(hora)) return res.status(400).json({ erro: 'Escolha um dia e horário da lista.' });
      const cfgEfetiva = Object.assign({}, c, { confirmarEmail: c.confirmarEmail && emailConfigurado() });
      let r;
      try { r = await criarReserva({ c: cfgEfetiva, data, hora, tipoId: limpa(b.tipo, 30), dados, origem: 'cliente' }); }
      catch (e) { return res.status(e.codigo || 500).json({ erro: e.message }); }
      let emailOk = false;
      try { emailOk = await emailCliente(r.status === 'pendente' ? 'pendente' : (c.lembretes.confirmacao ? 'confirmado' : ''), r, c); } catch (e) { emailOk = false; }
      try { await avisaDiscord(r); } catch (e) {}
      return res.status(200).json(Object.assign(publico(r, c), { token: r.token, emailEnviado: emailOk, pendente: r.status === 'pendente', textoSucesso: c.textoSucesso }));
    }

    if (acao === 'reserva' && req.method === 'GET') {
      const r = await porToken(param(req, 't'));
      if (!r) return res.status(404).json({ erro: 'Agendamento não encontrado. Confira o link do e-mail.' });
      if (r.expirado) return res.status(410).json({ erro: 'O prazo para confirmar terminou e o horário foi liberado. Escolha um novo horário.' });
      const reservas = await todasReservas();
      return res.status(200).json({ reserva: publico(r, c), agenda: montarAgenda(c, reservas, r.id) });
    }

    if (acao === 'ics' && req.method === 'GET') {
      const r = await porToken(param(req, 't'));
      if (!r) return res.status(404).send('Agendamento não encontrado.');
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="atendimento-whatsmenu.ics"');
      return res.status(200).send(calendarioIcs([eventoIcs(r, c, false)], 'WhatsMenu'));
    }

    if (acao === 'confirmar' && req.method === 'POST') {
      const r = await porToken(lerBody(req).t);
      if (!r) return res.status(404).json({ erro: 'Agendamento não encontrado.' });
      if (r.expirado) return res.status(410).json({ erro: 'O prazo para confirmar terminou e o horário foi liberado. Escolha um novo horário.' });
      if (r.status === 'pendente') {
        r.status = 'aguardando'; delete r.expiraEm; delete r.expirado;
        historico(r, 'Cliente', 'Confirmou pelo e-mail');
        await salvar(r);
        try { if (c.lembretes.confirmacao) await emailCliente('confirmado', r, c); } catch (e) {}
      }
      return res.status(200).json({ reserva: publico(r, c) });
    }

    if (acao === 'cancelar' && req.method === 'POST') {
      const r = await porToken(lerBody(req).t);
      if (!r) return res.status(404).json({ erro: 'Agendamento não encontrado.' });
      if (r.status === 'aguardando' || r.status === 'pendente') {
        r.status = 'cancelado'; delete r.expirado;
        historico(r, 'Cliente', 'Cancelado pelo cliente');
        r.canceladoPeloCliente = true;
        await salvar(r);
        try { await emailCliente('cancelado', r, c); } catch (e) {}
      }
      return res.status(200).json({ reserva: publico(r, c) });
    }

    if (acao === 'remarcar' && req.method === 'POST') {
      const b = lerBody(req);
      const r = await porToken(b.t);
      if (!r) return res.status(404).json({ erro: 'Agendamento não encontrado.' });
      if (r.status !== 'aguardando' && r.status !== 'pendente' && r.status !== 'nao-atendeu') return res.status(400).json({ erro: 'Este agendamento não pode mais ser remarcado.' });
      const data = limpa(b.data, 10), hora = limpa(b.hora, 5);
      if (!DATA_RE.test(data) || !HORA_RE.test(hora)) return res.status(400).json({ erro: 'Escolha um dia e horário da lista.' });
      try { await remarcar(c, r, data, hora, 'Cliente'); } catch (e) { return res.status(e.codigo || 500).json({ erro: e.message }); }
      r.remarcadoPeloCliente = Date.now(); await salvar(r);
      try { await emailCliente('remarcado', r, c); } catch (e) {}
      return res.status(200).json({ reserva: publico(r, c) });
    }

    // agenda da equipe para assinar no Google Agenda / celular (link secreto)
    if (acao === 'feed' && req.method === 'GET') {
      if (!param(req, 'chave') || param(req, 'chave') !== c.icsChave) return res.status(403).send('Link inválido.');
      const desde = ymd(new Date(agoraBR().getTime() - 30 * 86400e3));
      const so = param(req, 'consultor');
      const eventos = (await todasReservas()).filter((r) => r.data >= desde && r.status !== 'pendente' && (!so || r.consultor === so)).map((r) => eventoIcs(r, c, true));
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      return res.status(200).send(calendarioIcs(eventos, 'Agendamentos WhatsMenu'));
    }

    // agendador diário do Vercel (vercel.json) — também roda quando a equipe está com o guia aberto
    if (acao === 'lembretes') {
      const todas = await todasReservas();
      const enviados = await enviarLembretes(c, todas);
      const whats = await enviarWhats(c, todas).catch(() => 0);
      return res.status(200).json({ ok: true, enviados, whats });
    }

    // ===== IA da TousChat: consultar horários e agendar (protegido pela chave) =====
    if (acao === 'ia-horarios' || acao === 'ia-agendar') {
      const b = camposIA(req);
      const chave = chaveRecebida(req, b);
      const certa = await redis(['GET', CHAVE_IA]);
      if (!certa || !chave || chave !== certa) return res.status(401).json({ ok: false, mensagem: 'Chave da agenda inválida. Confira a chave em Agendamentos › Configurações › WhatsApp (TousChat).' });
      const reservas = await todasReservas();
      const agenda = montarAgenda(c, reservas).filter((d) => livresDoDia(d).length);

      if (acao === 'ia-horarios') {
        const data = dataIA(b.data || b.dia);
        if (data) {
          const dia = agenda.find((d) => d.data === data);
          if (dia) return res.status(200).json({ ok: true, mensagem: 'Horários livres ' + comArtigo(dia.rotulo.replace(/\/\d{4}$/, '')) + ': ' + livresDoDia(dia).join(', ') + '.', dias: [{ data: dia.data, dia: dia.rotulo, horarios: livresDoDia(dia) }] });
          const prox = agenda.filter((d) => d.data > data).slice(0, 3);
          return res.status(200).json({ ok: true, mensagem: 'Não há horários livres em ' + dataBonita(data).replace(/\/\d{4}$/, '') + '.' + (prox.length ? ' Próximos dias com horário:\n' + textoHorarios(prox, 8) : ''), dias: prox.map((d) => ({ data: d.data, dia: d.rotulo, horarios: livresDoDia(d) })) });
        }
        const n = Math.min(14, Math.max(1, parseInt(b.dias, 10) || 5));
        const lista = agenda.slice(0, n);
        if (!lista.length) return res.status(200).json({ ok: true, mensagem: 'No momento não há horários livres na agenda. Ofereça falar com a equipe de Implantação.', dias: [] });
        return res.status(200).json({ ok: true, mensagem: 'Horários livres (horário de Brasília):\n' + textoHorarios(lista, 8), dias: lista.map((d) => ({ data: d.data, dia: d.rotulo, horarios: livresDoDia(d) })) });
      }

      // ia-agendar
      const data = dataIA(b.data || b.dia), hora = horaIA(b.hora || b.horario);
      const disp = dispositivoIA(b.dispositivo || b.aparelho);
      const dados = dadosCliente({ nome: b.nome, whatsapp: b.whatsapp || b.telefone || b.celular, email: b.email, dispositivo: disp });
      const faltando = [];
      if (dados.nome.length < 2) faltando.push('nome completo');
      if (dados.whatsapp.replace(/\D/g, '').length < 10) faltando.push('WhatsApp com DDD');
      if (!EMAIL_RE.test(dados.email)) faltando.push('e-mail');
      if (!disp) faltando.push('se vai usar computador ou celular');
      if (!data) faltando.push('dia');
      if (!hora) faltando.push('horário');
      if (faltando.length) return res.status(200).json({ ok: false, mensagem: 'Não agendei ainda. Falta pedir ao cliente: ' + faltando.join(', ') + '.' });
      // já tem atendimento marcado (ou um "não atendeu" recente) com esse WhatsApp? Então a IA REMARCA esse mesmo agendamento.
      const fone = dados.whatsapp.replace(/\D/g, '').slice(-11);
      const hojeStr = ymd(agoraBR());
      const limiteNA = ymd(new Date(agoraBR().getTime() - 30 * 86400e3));
      const mesmoFone = (x) => String(x.whatsapp || '').replace(/\D/g, '').slice(-11) === fone;
      const ja = reservas.filter((x) => mesmoFone(x) && (
        (['aguardando', 'pendente'].includes(x.status) && x.data >= hojeStr && !(x.status === 'pendente' && (x.expiraEm || 0) < Date.now())) ||
        (x.status === 'nao-atendeu' && x.data >= limiteNA)))
        .sort((x, y) => (y.criadoEm || 0) - (x.criadoEm || 0))[0];
      if (ja) {
        const primeiro = String(ja.nome || dados.nome).split(' ')[0];
        if (ja.data === data && ja.hora === hora && ja.status !== 'nao-atendeu') {
          return res.status(200).json({ ok: true, id: ja.id, data: ja.data, hora: ja.hora, mensagem: primeiro + ', seu atendimento já está marcado ' + comArtigo(dataBonita(ja.data)) + ' às ' + ja.hora + ' (horário de Brasília). Até lá! 💚' + (linkDaChamada(ja, c) ? ' Link da chamada: ' + linkDaChamada(ja, c) : '') });
        }
        const curta = (d) => dataBonita(d).replace(/\/\d{4}$/, '');
        const antes = curta(ja.data) + ' às ' + ja.hora;
        let rr;
        try {
          const atual = JSON.parse(await redis(['HGET', K.reservas, ja.id]));
          atual.status = atual.status || 'aguardando';
          if (atual.status === 'nao-atendeu') atual.status = 'aguardando';
          if (dados.email && !atual.email) atual.email = dados.email;
          rr = await remarcar(c, atual, data, hora, 'IA TousChat');
          historico(rr, 'IA TousChat', 'Remarcado pela IA da TousChat (WhatsApp) a pedido do cliente');
          await salvar(rr);
        } catch (e) {
          const dia = montarAgenda(c, await todasReservas(), ja.id).find((d) => d.data === data);
          const outros = dia ? livresDoDia(dia) : [];
          return res.status(200).json({ ok: false, mensagem: 'Não consegui remarcar: ' + e.message + (outros.length ? ' Horários livres nesse dia: ' + outros.join(', ') + '. Ofereça um deles ao cliente.' : ' Consulte os horários livres de novo e ofereça outro dia ao cliente.') });
        }
        let emailOk = false;
        try { emailOk = await emailCliente('remarcado', rr, c); } catch (e) { emailOk = false; }
        const chamada = linkDaChamada(rr, c);
        return res.status(200).json({
          ok: true, remarcado: true, id: rr.id, data: rr.data, hora: rr.hora,
          mensagem: 'Pronto, ' + primeiro + '! Remarquei seu atendimento de ' + antes + ' para ' + curta(rr.data) + ' às ' + rr.hora + ' (horário de Brasília). 💚' +
            (emailOk ? ' Você vai receber a confirmação no e-mail ' + rr.email + '.' : '') + (chamada ? ' Link da chamada: ' + chamada : ''),
          linkChamada: chamada || '', emailEnviado: emailOk,
        });
      }
      let r;
      try {
        r = await criarReserva({ c, data, hora, tipoId: limpa(b.tipo, 30), dados, origem: 'touschat', hist: { quem: 'IA TousChat', texto: 'Agendado pela IA da TousChat (WhatsApp)' } });
      } catch (e) {
        const dia = montarAgenda(c, await todasReservas()).find((d) => d.data === data);
        const outros = dia ? livresDoDia(dia) : [];
        return res.status(200).json({ ok: false, mensagem: 'Não consegui agendar: ' + e.message + (outros.length ? ' Horários livres nesse dia: ' + outros.join(', ') + '.' : ' Consulte os horários livres de novo e ofereça outro dia.') });
      }
      let emailOk = false;
      try { emailOk = c.lembretes.confirmacao ? await emailCliente('confirmado', r, c) : false; } catch (e) { emailOk = false; }
      try { await avisaDiscord(r); } catch (e) {}
      const chamada = linkDaChamada(r, c);
      return res.status(200).json({
        ok: true, id: r.id, data: r.data, hora: r.hora,
        mensagem: 'Agendado! ' + r.nome.split(' ')[0] + ', seu atendimento com a equipe WhatsMenu ficou marcado ' + comArtigo(dataBonita(r.data)) + ' às ' + r.hora + ' (horário de Brasília).' +
          (emailOk ? ' Você vai receber a confirmação no e-mail ' + r.email + '.' : '') +
          (chamada ? ' Link da chamada: ' + chamada : '') + ' Para remarcar ou cancelar: ' + linkGerenciar(r),
        linkChamada: chamada || '', linkGerenciar: linkGerenciar(r), emailEnviado: emailOk,
      });
    }

    // ===== área da equipe =====
    const eu = await equipeLogada(req);
    if (!eu) return res.status(401).json({ erro: 'Entre com seu login da equipe.' });

    if (acao === 'alertas' && req.method === 'GET') {
      const reservas = await todasReservas();
      enviarLembretes(c, reservas).catch(() => {});
      await enviarWhats(c, reservas).catch(() => {});
      const agora = Date.now();
      const desde = Number(param(req, 'desde')) || agora - 5 * 60e3;
      const alarmes = reservas.filter((r) => {
        if (r.status !== 'aguardando' || r.alarmeParado || r.emAtendimento) return false;
        const ini = inicioMs(r.data, r.hora);
        return agora >= ini - (c.alarmeMin || 15) * 60e3 && agora <= ini + 120 * 60e3;
      }).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora)).map((r) => ({
        id: r.id, nome: r.nome, loja: r.loja, data: r.data, hora: r.hora, whatsapp: r.whatsapp,
        min: Math.round((inicioMs(r.data, r.hora) - agora) / 60000), consultorNome: r.consultorNome || '', tipoNome: r.tipoNome || '',
        sala: r.sala && c.chamadaPropria !== false && !r.linkVideo && !c.linkVideo ? linkSala(r) + '&equipe=1' : (r.linkVideo || c.linkVideo || ''),
      }));
      const novos = reservas.filter((r) => r.criadoEm > desde && r.origem !== 'equipe' && OCUPA.concat(['pendente']).includes(r.status))
        .slice(-10).map((r) => ({ id: r.id, nome: r.nome, loja: r.loja, rotulo: dataBonita(r.data), hora: r.hora, criadoEm: r.criadoEm }));
      return res.status(200).json({ agora, eu: { usuario: eu.usuario, nome: eu.nome, admin: eu.admin, trocarSenha: eu.trocarSenha }, alarmes, novos });
    }

    if (acao === 'em-atendimento' && req.method === 'POST') {
      const b = lerBody(req);
      const raw = await redis(['HGET', K.reservas, limpa(b.id, 30)]);
      if (!raw) return res.status(404).json({ erro: 'Agendamento não encontrado.' });
      const r = JSON.parse(raw);
      if (b.desfazer) { if (r.emAtendimento) { delete r.emAtendimento; historico(r, eu.nome, 'Soltou o cliente (saiu de "em atendimento")'); } }
      else if (r.emAtendimento && r.emAtendimento.usuario && r.emAtendimento.usuario !== eu.usuario) {
        return res.status(409).json({ erro: 'Esse cliente já foi puxado por ' + r.emAtendimento.por + '.', reserva: paraEquipe(r, c) });
      }
      else if (!r.emAtendimento) {
        if ((r.status || 'aguardando') !== 'aguardando') return res.status(400).json({ erro: 'Só dá para puxar clientes que estão aguardando.' });
        r.emAtendimento = { por: eu.nome, usuario: eu.usuario, em: Date.now() };
        if (!r.alarmeParado) r.alarmeParado = { por: eu.nome, em: Date.now() };
        if (!r.consultor) { r.consultor = eu.usuario; r.consultorNome = eu.nome; }
        historico(r, eu.nome, 'Iniciou o atendimento');
      }
      await salvar(r);
      return res.status(200).json({ reserva: paraEquipe(r, c) });
    }

    if (acao === 'parar' && req.method === 'POST') {
      const raw = await redis(['HGET', K.reservas, limpa(lerBody(req).id, 30)]);
      if (!raw) return res.status(404).json({ erro: 'Agendamento não encontrado.' });
      const r = JSON.parse(raw);
      if (!r.alarmeParado) { r.alarmeParado = { por: eu.nome, em: Date.now() }; historico(r, eu.nome, 'Parou o alarme'); await salvar(r); }
      return res.status(200).json({ ok: true, por: r.alarmeParado.por });
    }

    if (acao === 'lista' && req.method === 'GET') {
      const desde = ymd(new Date(agoraBR().getTime() - 120 * 86400e3));
      const todas = await todasReservas();
      for (const r of todas) { if (r.data >= hojeBR() && r.status !== 'cancelado' && (await garantirSala(r))) await salvar(r); }
      const lista = todas.filter((r) => r.data >= desde && !(r.status === 'pendente' && (r.expiraEm || 0) < Date.now()))
        .map((r) => paraEquipe(r, c)).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora) || a.criadoEm - b.criadoEm);
      const cfgVisivel = Object.assign({}, c);
      if (!eu.admin) delete cfgVisivel.icsChave;
      return res.status(200).json({
        lista, hoje: hojeBR(), eu: { usuario: eu.usuario, nome: eu.nome, admin: eu.admin },
        config: cfgVisivel, equipe: await usuariosEquipe(), emailConfigurado: emailConfigurado(), touschatOk: !!touschatToken(), siteAgenda: siteAgenda(),
      });
    }

    if (acao === 'horarios' && req.method === 'GET') {
      // horários livres para a equipe remarcar ou agendar (ignora a antecedência mínima)
      const reservas = await todasReservas();
      const ignorar = param(req, 'id');
      const cSem = Object.assign({}, c, { antecedencia: 0 });
      return res.status(200).json({ agenda: montarAgenda(cSem, reservas, ignorar, 45) });
    }

    if (acao === 'status' && req.method === 'PATCH') {
      const b = lerBody(req);
      const novo = limpa(b.status, 20);
      if (!STATUS.includes(novo) || novo === 'pendente') return res.status(400).json({ erro: 'Status inválido.' });
      const raw = await redis(['HGET', K.reservas, limpa(b.id, 30)]);
      if (!raw) return res.status(404).json({ erro: 'Agendamento não encontrado.' });
      const r = JSON.parse(raw);
      const antes = r.status || 'aguardando';
      if (antes === 'cancelado' && novo !== 'cancelado') {
        const reservas = await todasReservas();
        const erro = horarioLivre(c, reservas, r.data, r.hora, r.id, true);
        if (erro) return res.status(409).json({ erro: 'Não dá para reativar: ' + erro.toLowerCase() });
      }
      r.status = novo; r.statusPor = eu.nome; r.statusEm = Date.now();
      if (novo !== 'aguardando' || antes !== 'aguardando') delete r.emAtendimento;
      historico(r, eu.nome, 'Status: ' + novo);
      await salvar(r);
      if (novo === 'cancelado' && antes !== 'cancelado' && b.avisar) { try { await emailCliente('cancelado', r, c); } catch (e) {} }
      // não atendeu a ligação: e-mail para o cliente escolher um novo horário (uma vez por horário)
      let emailRemarcar = '';
      if (novo === 'nao-atendeu' && antes !== 'nao-atendeu' && c.lembretes.naoAtendeu !== false) {
        const marca = 'agenda:naoatendeu:' + r.id + ':' + r.data + r.hora;
        if (!r.email) emailRemarcar = 'sem-email';
        else if (!emailConfigurado()) emailRemarcar = 'sem-config';
        else if ((await redis(['SET', marca, '1', 'NX', 'EX', String(30 * 86400)])) === 'OK') {
          let ok = false; try { ok = await emailCliente('naoAtendeu', r, c); } catch (e) { ok = false; }
          if (!ok) await redis(['DEL', marca]);
          emailRemarcar = ok ? 'enviado' : 'falhou';
          historico(r, 'Sistema', ok ? 'E-mail para remarcar enviado para ' + r.email : 'Não foi possível enviar o e-mail para remarcar');
          await salvar(r);
        } else emailRemarcar = 'ja-enviado';
      }
      return res.status(200).json({ reserva: paraEquipe(r, c), emailRemarcar });
    }

    if (acao === 'editar' && req.method === 'PATCH') {
      const b = lerBody(req);
      const raw = await redis(['HGET', K.reservas, limpa(b.id, 30)]);
      if (!raw) return res.status(404).json({ erro: 'Agendamento não encontrado.' });
      const r = JSON.parse(raw);
      const mud = [];
      if ('notas' in b) { r.notas = limpa(b.notas, 4000); mud.push('notas'); }
      if ('linkVideo' in b) { const l = limpa(b.linkVideo, 300); r.linkVideo = /^https:\/\/\S+$/.test(l) ? l : ''; mud.push('link da chamada'); }
      if ('consultor' in b) {
        const quem = (await usuariosEquipe()).find((u) => u.usuario === limpa(b.consultor, 30));
        r.consultor = quem ? quem.usuario : ''; r.consultorNome = quem ? quem.nome : '';
        mud.push('consultor: ' + (r.consultorNome || 'ninguém'));
      }
      ['nome', 'loja', 'whatsapp', 'email'].forEach((k) => {
        if (k in b) {
          const d = dadosCliente(Object.assign({ nome: r.nome, loja: r.loja, whatsapp: r.whatsapp, email: r.email }, { [k]: b[k] }));
          if (d[k] && d[k] !== r[k]) { r[k] = d[k]; mud.push(k); }
        }
      });
      if (mud.length) { historico(r, eu.nome, 'Editou ' + mud.join(', ')); await salvar(r); }
      return res.status(200).json({ reserva: paraEquipe(r, c) });
    }

    if (acao === 'remarcar-equipe' && req.method === 'POST') {
      const b = lerBody(req);
      const raw = await redis(['HGET', K.reservas, limpa(b.id, 30)]);
      if (!raw) return res.status(404).json({ erro: 'Agendamento não encontrado.' });
      const r = JSON.parse(raw);
      const data = limpa(b.data, 10), hora = limpa(b.hora, 5);
      if (!DATA_RE.test(data) || !HORA_RE.test(hora)) return res.status(400).json({ erro: 'Escolha dia e horário.' });
      try { await remarcar(c, r, data, hora, eu.nome, true); } catch (e) { return res.status(e.codigo || 500).json({ erro: e.message }); }
      let avisou = false;
      if (b.avisar) { try { avisou = await emailCliente('remarcado', r, c); } catch (e) {} }
      return res.status(200).json({ reserva: paraEquipe(r, c), emailEnviado: avisou });
    }

    if (acao === 'novo' && req.method === 'POST') {
      const b = lerBody(req);
      const data = limpa(b.data, 10), hora = limpa(b.hora, 5);
      if (!DATA_RE.test(data) || !HORA_RE.test(hora)) return res.status(400).json({ erro: 'Escolha dia e horário.' });
      const dados = dadosCliente(b);
      if (dados.nome.length < 2 || dados.loja.length < 2) return res.status(400).json({ erro: 'Preencha o nome e a loja.' });
      if (dados.whatsapp.replace(/\D/g, '').length < 10) return res.status(400).json({ erro: 'Informe o WhatsApp com DDD.' });
      if (dados.email && !EMAIL_RE.test(dados.email)) return res.status(400).json({ erro: 'E-mail inválido.' });
      const consultor = b.consultor ? (await usuariosEquipe()).find((u) => u.usuario === limpa(b.consultor, 30)) : null;
      let r;
      try { r = await criarReserva({ c, data, hora, tipoId: limpa(b.tipo, 30), dados, origem: 'equipe', eu, notas: limpa(b.notas, 4000), consultor, ignorarAntecedencia: true }); }
      catch (e) { return res.status(e.codigo || 500).json({ erro: e.message }); }
      let avisou = false;
      if (b.avisar && r.email) { try { avisou = await emailCliente('confirmado', r, c); } catch (e) {} }
      return res.status(200).json({ reserva: paraEquipe(r, c), emailEnviado: avisou });
    }

    // ---------- importar do Google Agenda (só administradores) ----------
    if (acao === 'importar' && req.method === 'POST') {
      if (!eu.admin) return res.status(403).json({ erro: 'Só administradores podem importar agendamentos.' });
      const b = lerBody(req);
      const evs = Array.isArray(b.eventos) ? b.eventos.slice(0, 100) : [];
      let criados = 0, repetidos = 0, erros = 0;
      for (const ev of evs) {
        try {
          const data = limpa(ev.data, 10), hora = limpa(ev.hora, 5), uid = limpa(ev.uid, 300);
          if (!DATA_RE.test(data) || !HORA_RE.test(hora)) { erros++; continue; }
          // não importa duas vezes o mesmo evento do Google
          if (uid && (await redis(['HGET', 'agenda:importados', uid]))) { repetidos++; continue; }
          const tipo = tipoDe(c, '');
          const dur = Math.max(10, Math.min(480, parseInt(ev.duracao, 10) || tipo.duracao || 30));
          const r = Object.assign({
            id: Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase(),
            token: crypto.randomBytes(16).toString('hex'),
            data, hora, tipo: tipo.id, tipoNome: limpa(ev.titulo, 80) || tipo.nome, duracao: dur,
            status: (new Date(data + 'T' + hora + ':00-03:00').getTime() < Date.now() - 2 * 3600e3) ? 'atendido' : 'aguardando',
            criadoEm: Date.now(), origem: 'google',
            notas: ('Importado do Google Agenda' + (ev.agenda ? ' (' + limpa(ev.agenda, 80) + ')' : '') + '.' + (ev.descricao ? '\n\n' + String(ev.descricao).slice(0, 3000) : '')).trim(),
            consultor: '', consultorNome: '', hist: [],
          }, {
            nome: limpa(ev.nome, 80) || limpa(ev.titulo, 80) || 'Cliente',
            loja: limpa(ev.loja, 80) || limpa(ev.titulo, 80) || '—',
            whatsapp: limpa(ev.whatsapp, 20).replace(/[^\d()+\- ]/g, ''),
            email: EMAIL_RE.test(limpa(ev.email, 120)) ? limpa(ev.email, 120).toLowerCase() : '',
          });
          const link = limpa(ev.link, 300);
          if (/^https:\/\//.test(link)) r.linkVideo = link;
          await garantirSala(r);
          historico(r, eu.nome, 'Importado do Google Agenda');
          await salvar(r);
          await redis(['HSET', K.tokens, r.token, r.id]);
          if (uid) await redis(['HSET', 'agenda:importados', uid, r.id]);
          criados++;
        } catch (e) { erros++; }
      }
      return res.status(200).json({ criados, repetidos, erros });
    }

    if (acao === 'bloqueio' && req.method === 'POST') {
      // qualquer pessoa da equipe pode bloquear ou liberar um horário específico
      const b = lerBody(req);
      const data = limpa(b.data, 10), hora = limpa(b.hora, 5);
      if (!DATA_RE.test(data) || !(hora === '*' || HORA_RE.test(hora))) return res.status(400).json({ erro: 'Dia ou horário inválido.' });
      const atual = JSON.parse((await redis(['GET', K.config])) || '{}');
      atual.bloqueios = atual.bloqueios || {};
      const lista = new Set(atual.bloqueios[data] || []);
      if (b.liberar) lista.delete(hora); else lista.add(hora);
      if (lista.size) atual.bloqueios[data] = Array.from(lista); else delete atual.bloqueios[data];
      await redis(['SET', K.config, JSON.stringify(atual)]);
      return res.status(200).json({ ok: true, bloqueios: atual.bloqueios });
    }

    // ---------- e-mail que envia (só administradores) ----------
    if (acao === 'email-remetente' || acao === 'email-teste') {
      if (!eu.admin) return res.status(403).json({ erro: 'Só administradores.' });
      if (acao === 'email-remetente' && req.method === 'GET') return res.status(200).json(MAIL.infoRemetente());
      const b = lerBody(req);
      if (acao === 'email-remetente') {
        if (b.remover) { await MAIL.salvarRemetente(null); return res.status(200).json(MAIL.infoRemetente()); }
        const servico = b.servico === 'brevo' ? 'brevo' : 'gmail';
        const usuario = limpa(b.usuario, 120).toLowerCase(), nome = limpa(b.nome, 60) || 'WhatsMenu';
        const login = servico === 'brevo' ? limpa(b.login, 120).toLowerCase() : usuario;
        const senha = String(b.senha || '').replace(/\s+/g, '').slice(0, 200);
        if (!EMAIL_RE.test(usuario)) return res.status(400).json({ erro: 'Digite o e-mail que vai aparecer como remetente.' });
        if (servico === 'brevo' && !EMAIL_RE.test(login)) return res.status(400).json({ erro: 'Digite o "Login SMTP" do Brevo (fica em Brevo › SMTP e API › SMTP).' });
        const atual = await MAIL.carregar(true);
        const mesmo = atual && atual.usuario === usuario && (atual.servico || 'gmail') === servico && (servico !== 'brevo' || atual.login === login);
        const senhaFinal = senha || (mesmo ? atual.senha : '');
        if (!senhaFinal) return res.status(400).json({ erro: servico === 'brevo' ? 'Cole a chave SMTP do Brevo.' : 'Digite a senha de app do Gmail desse e-mail.' });
        await MAIL.salvarRemetente({ servico, usuario, login, nome, senha: senhaFinal, por: eu.nome, quando: Date.now() });
        return res.status(200).json(MAIL.infoRemetente());
      }
      // teste: manda um e-mail e devolve o erro do Gmail, se houver
      const para = limpa(b.para, 120);
      if (!EMAIL_RE.test(para)) return res.status(400).json({ erro: 'Digite um e-mail para receber o teste.' });
      if (!emailConfigurado()) return res.status(400).json({ erro: 'Nenhum e-mail de envio configurado ainda.' });
      try {
        await enviarEmail({ para, assunto: 'Teste de e-mail da agenda WhatsMenu', texto: 'Se você recebeu esta mensagem, os e-mails da agenda estão funcionando.', html: moldura('Teste de e-mail ✅', '<p>Se você recebeu esta mensagem, os e-mails de confirmação e lembrete da agenda estão funcionando.</p>') });
        return res.status(200).json({ ok: true });
      } catch (e) {
        const m = String(e && e.message || '');
        const brevo = (MAIL.credenciais() || {}).servico === 'brevo';
        let dica = m;
        if (/Invalid login|Username and Password not accepted|535|BadCredentials|Authentication failed/i.test(m)) dica = brevo ? 'O Brevo recusou o login. Confira o "Login SMTP" e a chave SMTP (Brevo › SMTP e API › SMTP).' : 'O Gmail recusou o login. Confira o e-mail e use uma SENHA DE APP (não a senha normal da conta).';
        else if (brevo && /sender|remetente|not (valid|verified)|unauthori[sz]ed/i.test(m)) dica = 'O Brevo não aceitou o remetente. Confirme o e-mail em Brevo › Remetentes (clique no link que chega nesse e-mail). Detalhe: ' + m;
        return res.status(502).json({ erro: dica });
      }
    }

    if (acao === 'ia-chave') {
      if (!eu.admin) return res.status(403).json({ erro: 'Só administradores.' });
      const nova = req.method === 'POST' && lerBody(req).gerar;
      return res.status(200).json({ chave: await chaveIA(!!nova), site: siteAgenda() });
    }

    // ---------- TousChat (só administradores) ----------
    if (acao === 'touschat-modelos' || acao === 'touschat-teste') {
      if (!eu.admin) return res.status(403).json({ erro: 'Só administradores.' });
      if (!touschatToken()) return res.status(400).json({ erro: 'Falta colocar o TOUSCHAT_TOKEN nas variáveis de ambiente do Vercel (e fazer um novo deploy).', semToken: true });
      try {
        if (acao === 'touschat-modelos') {
          // a TousChat devolve no máximo 100 modelos por página: busca todas as páginas
          let todos = [], pagina = 1;
          while (pagina <= 30) {
            const j = await touschat('GET', '/v1/template?pageNumber=' + pagina + '&pageSize=100&Archived=false');
            const lote = j.items || [];
            todos = todos.concat(lote);
            const mais = j.hasMorePages != null ? j.hasMorePages : (j.totalPages ? pagina < j.totalPages : lote.length >= 100);
            if (!mais || !lote.length) break;
            pagina++;
          }
          const vistos = {};
          todos = todos.filter((t) => t && t.id && !vistos[t.id] && (vistos[t.id] = 1));
          const itens = todos.map((t) => ({ id: t.id, nome: t.name || t.internalName || 'Sem nome', texto: t.text || '', status: t.status, ativo: t.active, params: camposModelo(t) }))
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
          return res.status(200).json({ modelos: itens });
        }
        const b = lerBody(req);
        const wteste = Object.assign({}, c.whats, b.whats || {});
        if (!wteste.templateId) return res.status(400).json({ erro: 'Escolha o modelo de mensagem.' });
        const falso = { nome: limpa(b.nome, 60) || eu.nome, whatsapp: limpa(b.telefone, 20), hora: '10:00', data: new Date(Date.now() + TZ * 3600e3).toISOString().slice(0, 10), tipoNome: 'Teste', sala: 'wm-teste' };
        const j = await mandaWhats(falso, Object.assign({}, c, { whats: wteste }));
        return res.status(200).json({ ok: true, status: j && j.status, id: j && j.id });
      } catch (e) {
        return res.status(e.status === 401 || e.status === 403 ? 400 : 502).json({ erro: (e.status === 401 || e.status === 403) ? 'A TousChat recusou o token. Gere um token novo e atualize o TOUSCHAT_TOKEN no Vercel.' : 'TousChat: ' + e.message });
      }
    }

    if (acao === 'config' && (req.method === 'PUT' || req.method === 'POST')) {
      if (!eu.admin) return res.status(403).json({ erro: 'Só administradores podem mudar as configurações da agenda.' });
      const nova = normalizaConfig(lerBody(req), c);
      await redis(['SET', K.config, JSON.stringify(nova)]);
      return res.status(200).json({ config: Object.assign({}, PADRAO, nova) });
    }

    return res.status(405).json({ erro: 'Ação não reconhecida.' });
  } catch (e) {
    return res.status(500).json({ erro: 'Não foi possível acessar a agenda agora: ' + e.message });
  }
};
