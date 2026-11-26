// Liga o quadro do GitHub (Projects) ao mural de Novidades:
// quando um card vai para a coluna configurada (padrão: Beta), vira uma novidade automática no guia.
//
// Variáveis no Vercel (Settings › Environment Variables):
//   GITHUB_TOKEN    token de LEITURA aprovado pela organização (permissão "Projects: read" e "Issues: read")
//   GITHUB_ORG      organização (padrão: Grove-Company)
//   GITHUB_PROJETO  número do projeto (padrão: 11 → "Tarefas TI")
//   GITHUB_COLUNA   coluna(s) que geram novidade, separadas por vírgula (padrão: Beta; ex.: "Beta,Produção")
//
//   GET/POST /api/github-projeto?acao=sincronizar   lê o quadro (no máximo a cada 3 minutos) e cria as novidades
//   GET      /api/github-projeto?acao=status        (admin) situação da ligação
// Na primeira leitura, só memoriza onde cada card está (não cria novidades dos cards que já estavam em produção).

const EQUIPE = require('./_equipe.js');

const CHAVE_NOV = 'novidades:itens';
const K = { status: 'gh:status', publicados: 'gh:publicados', info: 'gh:info', trava: 'gh:trava', cards: 'gh:cards', cardsInfo: 'gh:cards:info' };

function conf() {
  return {
    token: process.env.GITHUB_TOKEN || '',
    org: process.env.GITHUB_ORG || 'Grove-Company',
    projeto: parseInt(process.env.GITHUB_PROJETO || '11', 10),
    coluna: process.env.GITHUB_COLUNA || 'Beta',
  };
}
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

async function gql(token, query, variables) {
  const r = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', 'User-Agent': 'guia-whatsmenu' },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) throw new Error('O GitHub recusou o token (inválido ou expirado).');
  if (!r.ok) throw new Error('GitHub respondeu ' + r.status);
  if (j.errors && j.errors.length) throw new Error('GitHub: ' + j.errors[0].message);
  return j.data;
}

const QUERY = `query($org:String!,$num:Int!,$cursor:String){
  organization(login:$org){ projectV2(number:$num){ title
    items(first:100, after:$cursor){ pageInfo{ hasNextPage endCursor }
      nodes{ id
        fieldValueByName(name:"Status"){ ... on ProjectV2ItemFieldSingleSelectValue{ name } }
        content{
          ... on Issue{ title number url createdAt updatedAt author{ login } assignees(first:5){ nodes{ login } } repository{ nameWithOwner } labels(first:20){ nodes{ name } } }
          ... on PullRequest{ title number url createdAt updatedAt author{ login } assignees(first:5){ nodes{ login } } repository{ nameWithOwner } labels(first:20){ nodes{ name } } }
          ... on DraftIssue{ title }
        }
      }
    }
  } }
}`;

async function lerQuadro(c) {
  const itens = [];
  let cursor = null, titulo = '';
  for (let pagina = 0; pagina < 40; pagina++) {
    const d = await gql(c.token, QUERY, { org: c.org, num: c.projeto, cursor });
    const p = d && d.organization && d.organization.projectV2;
    if (!p) throw new Error('Projeto ' + c.projeto + ' não encontrado na organização ' + c.org + ' (ou o token não tem acesso).');
    titulo = p.title;
    p.items.nodes.forEach((n) => {
      const ct = n.content || {};
      itens.push({
        id: n.id,
        status: (n.fieldValueByName && n.fieldValueByName.name) || '',
        titulo: ct.title || '',
        numero: ct.number || 0,
        url: ct.url || '',
        repo: (ct.repository && ct.repository.nameWithOwner) || '',
        labels: ((ct.labels && ct.labels.nodes) || []).map((l) => l.name),
        autor: (ct.author && ct.author.login) || '',
        responsaveis: ((ct.assignees && ct.assignees.nodes) || []).map((a) => a.login),
        criadoEm: ct.createdAt || '', atualizadoEm: ct.updatedAt || '',
      });
    });
    if (!p.items.pageInfo.hasNextPage) break;
    cursor = p.items.pageInfo.endCursor;
  }
  return { titulo, itens };
}

function novidadeDe(it, coluna) {
  const bug = it.labels.some((l) => /bug|erro|corre/i.test(l));
  const beta = /beta/i.test(coluna), prod = /produ/i.test(semAcento(coluna));
  const titulo = ((beta ? '🧪 Em beta: ' : prod ? '✅ Em produção: ' : '🔄 ' + coluna + ': ') + it.titulo).slice(0, 120);
  const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const texto = [
    it.titulo,
    '',
    beta ? (bug ? 'Correção' : 'Melhoria') + ' disponível no ambiente BETA desde ' + hoje + ' (ainda em validação, antes de ir para todos os clientes).'
      : prod ? (bug ? 'Correção' : 'Melhoria') + ' liberada em produção em ' + hoje + '.'
      : 'Card movido para "' + coluna + '" em ' + hoje + '.',
    it.repo ? 'Card: ' + it.repo + (it.numero ? ' #' + it.numero : '') : '',
    it.url ? 'Ver no GitHub: ' + it.url : '',
    '',
    'Publicado automaticamente pelo quadro do GitHub (coluna "' + coluna + '").',
  ].join('\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 5000);
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    titulo, texto, categoria: bug ? 'Correção de bug' : 'Atualização',
    autor: 'GitHub (automático)', autorUsuario: 'github', criadoEm: Date.now(), fixada: false,
    origem: 'github', ghItem: it.id,
  };
}

async function sincronizar(c) {
  const quadro = await lerQuadro(c);
  const antigo = {};
  const arr = (await EQUIPE.redis(['HGETALL', K.status])) || [];
  for (let i = 0; i < arr.length; i += 2) antigo[arr[i]] = arr[i + 1];
  const primeira = !arr.length;
  const alvos = c.coluna.split(',').map((x) => x.trim()).filter(Boolean);
  const novas = [];
  const set = [];
  for (const it of quadro.itens) {
    const antes = antigo[it.id];
    if (antes !== it.status) set.push(it.id, it.status);
    if (primeira || !it.titulo) continue;
    const col = alvos.find((a) => semAcento(a) === semAcento(it.status));
    if (col && semAcento(antes) !== semAcento(it.status)) {
      const ja = await EQUIPE.redis(['SADD', K.publicados, it.id + '|' + semAcento(col)]); // 1 = ainda não publicado nessa coluna
      const jaLink = it.url ? await EQUIPE.redis(['SADD', K.publicados, 'url:' + it.url.toLowerCase() + '|' + semAcento(col)]) : 1;
      if (ja === 1 && jaLink === 1) novas.push(novidadeDe(it, col));
    }
  }
  if (set.length) await EQUIPE.redis(['HSET', K.status].concat(set));
  await salvarCards(quadro.itens.filter((x) => x.titulo), 'automático');
  for (const n of novas) { await EQUIPE.redis(['HSET', CHAVE_NOV, n.id, JSON.stringify(n)]); await new Promise((r) => setTimeout(r, 3)); }
  const info = { quando: Date.now(), projeto: quadro.titulo, cards: quadro.itens.length, novas: novas.length, primeira, erro: '' };
  await EQUIPE.redis(['SET', K.info, JSON.stringify(info)]);
  return info;
}

// guarda a lista de cards para a aba "Cards" (só dados do card: título, número, coluna, etiquetas, autor, link)
function cardLeve(it) {
  return { id: it.id || ('url:' + String(it.url || it.titulo).toLowerCase()), t: it.titulo, n: it.numero || 0, u: it.url || '', s: it.status || '', r: it.repo || '',
    l: (it.labels || []).slice(0, 15), a: it.autor || '', p: (it.responsaveis || []).slice(0, 5), c: it.criadoEm || '', m: it.atualizadoEm || '' };
}
async function salvarCards(itens, fonte) {
  await EQUIPE.redis(['DEL', K.cards]);
  const lista = itens.map(cardLeve);
  for (let i = 0; i < lista.length; i += 150) {
    const cmd = ['HSET', K.cards];
    lista.slice(i, i + 150).forEach((x) => cmd.push(x.id, JSON.stringify(x)));
    await EQUIPE.redis(cmd);
  }
  await EQUIPE.redis(['SET', K.cardsInfo, JSON.stringify({ quando: Date.now(), fonte, total: lista.length })]);
}
async function lerCards() {
  const arr = (await EQUIPE.redis(['HGETALL', K.cards])) || [];
  const out = [];
  for (let i = 0; i < arr.length; i += 2) { try { out.push(JSON.parse(arr[i + 1])); } catch (e) {} }
  return out;
}
// busca no texto das issues (e-mail, telefone etc.) direto no GitHub, sem guardar nada
async function buscarTexto(c, q) {
  const termo = q.replace(/"/g, '').trim();
  const digitos = termo.replace(/\D/g, '');
  const variantes = [termo];
  if (digitos.length >= 8 && !/@/.test(termo)) {
    // telefone pode estar escrito de vários jeitos no card: 13999991234, 99999-1234, 9999-1234…
    const d9 = digitos.slice(-9), d8 = digitos.slice(-8);
    variantes.push(digitos, d8, d8.slice(0, 4) + '-' + d8.slice(4));
    if (digitos.length >= 9) variantes.push(d9, d9.slice(0, 5) + '-' + d9.slice(5));
  }
  const repos = (process.env.GITHUB_REPOS || c.org + '/Suporte').split(',').map((x) => x.trim()).filter(Boolean);
  const achados = {};
  for (const v of [...new Set(variantes)]) {
    const qs = '"' + v + '" ' + repos.map((r) => 'repo:' + r).join(' ') + ' is:issue';
    const r = await fetch('https://api.github.com/search/issues?per_page=50&q=' + encodeURIComponent(qs), { headers: { Authorization: 'Bearer ' + c.token, Accept: 'application/vnd.github+json', 'User-Agent': 'guia-whatsmenu' } });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) throw new Error('O GitHub recusou o token (inválido ou expirado).');
    if (!r.ok) throw new Error('GitHub respondeu ' + r.status + (j.message ? ': ' + j.message : ''));
    (j.items || []).forEach((it) => { achados[it.html_url.toLowerCase()] = { u: it.html_url, n: it.number, t: it.title, a: (it.user && it.user.login) || '', estado: it.state }; });
  }
  return Object.values(achados);
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const { url, token } = EQUIPE.cfg();
  if (!url || !token) return res.status(500).json({ erro: 'Banco de dados não conectado.' });
  const c = conf();
  const acao = String((req.query && req.query.acao) || new URL(req.url, 'http://x').searchParams.get('acao') || '');
  try {
    if (acao === 'status') {
      const eu = await EQUIPE.equipeLogada(req);
      if (!eu || !eu.admin) return res.status(403).json({ erro: 'Só administradores.' });
      const info = JSON.parse((await EQUIPE.redis(['GET', K.info])) || 'null');
      return res.status(200).json({ configurado: !!c.token, org: c.org, projeto: c.projeto, coluna: c.coluna, info });
    }

    if (acao === 'cards') {
      const eu = await EQUIPE.equipeLogada(req);
      if (!eu) return res.status(401).json({ erro: 'Entre com seu login da equipe.' });
      const info = JSON.parse((await EQUIPE.redis(['GET', K.cardsInfo])) || 'null');
      return res.status(200).json({ cards: await lerCards(), info, buscaTexto: !!c.token });
    }

    if (acao === 'buscar-texto') {
      const eu = await EQUIPE.equipeLogada(req);
      if (!eu) return res.status(401).json({ erro: 'Entre com seu login da equipe.' });
      if (!c.token) return res.status(200).json({ ok: false, semToken: true, itens: [] });
      const q = String((req.query && req.query.q) || new URL(req.url, 'http://x').searchParams.get('q') || '').slice(0, 120);
      if (q.trim().length < 3) return res.status(400).json({ erro: 'Digite pelo menos 3 caracteres.' });
      try { return res.status(200).json({ ok: true, itens: await buscarTexto(c, q) }); }
      catch (e) { return res.status(200).json({ ok: false, erro: e.message, itens: [] }); }
    }

    if (acao === 'sincronizar') {
      if (!c.token) return res.status(200).json({ ok: false, configurado: false, novas: 0 });
      // admin pode forçar; os outros respeitam o intervalo de 3 minutos
      let forcar = false;
      if (String((req.query && req.query.forcar) || '') === '1') { const eu = await EQUIPE.equipeLogada(req); forcar = !!(eu && eu.admin); }
      if (!forcar) {
        const livre = await EQUIPE.redis(['SET', K.trava, '1', 'NX', 'EX', '180']);
        if (livre !== 'OK') return res.status(200).json({ ok: true, pulou: true, novas: 0 });
      }
      try {
        const info = await sincronizar(c);
        return res.status(200).json({ ok: true, novas: info.novas, primeira: info.primeira, cards: info.cards });
      } catch (e) {
        const velho = JSON.parse((await EQUIPE.redis(['GET', K.info])) || 'null') || {};
        await EQUIPE.redis(['SET', K.info, JSON.stringify(Object.assign(velho, { erro: e.message, erroEm: Date.now() }))]);
        return res.status(200).json({ ok: false, erro: e.message, novas: 0 });
      }
    }
    return res.status(400).json({ erro: 'Ação desconhecida.' });
  } catch (e) {
    return res.status(500).json({ erro: 'Erro: ' + e.message });
  }
};

// usado pela importação por planilha (Novidades › Importar do GitHub)
module.exports.novidadeDe = novidadeDe;
module.exports.semAcento = semAcento;
module.exports.CHAVE_PUBLICADOS = K.publicados;
module.exports.salvarCards = salvarCards;
