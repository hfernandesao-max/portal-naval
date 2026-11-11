/* Gestor de Acessos ERP Primavera: pedidos, aprovações e execução controlada.

   O portal é público e estático, por isso:
   - os pedidos ficam num ficheiro cifrado (data/gestor-pedidos.enc.json), com a mesma palavra-passe e a mesma
     cifra da matriz de acessos (AES-GCM 256, PBKDF2-SHA256), através de matriz-acessos.js;
   - cada passo do fluxo (pedido, aprovação, ordem de produção, reversão) grava também um marcador sem dados
     pessoais em data/gestor/eventos/. Quem fez o passo é o autor do commit desse marcador no GitHub, que
     ninguém consegue falsificar com o token de outra pessoa. O agente na rede confirma os autores antes de executar;
   - só o agente na rede escreve no Primavera, e só o que foi aprovado: o marcador de aprovação leva a impressão
     digital (SHA-256) do conteúdo do pedido, e qualquer alteração posterior invalida a aprovação.

   Regras: quem pede não aprova; quem aprova não dá a ordem de produção; nada vai para produção sem ter corrido
   bem na cópia de testes; produção exige escrever APLICAR. Funciona no browser e no Node (agente). */
(function (root) {
  'use strict';
  var MA = root.MA || (typeof require === 'function' ? require('./matriz-acessos.js') : null);
  var GA = {};
  GA.FICHEIRO = 'data/gestor-pedidos.enc.json';
  GA.RESUMO = 'data/gestor-resumo.js';
  GA.EVENTOS = 'data/gestor/eventos/';
  GA.ORIGEM = 'Pedidos do Gestor de Acessos ERP Primavera';

  /* ---------- Catálogo de perfis (modulares, aditivos, versão _02) ---------- */
  GA.PERFIL = {
    'Vendas': 'VND', 'Compras': 'CMP', 'Inventário': 'INV', 'Contas Correntes': 'CCT', 'Tesouraria': 'BNC',
    'Contabilidade': 'CBL', 'Equipamentos e Activos': 'EQA', 'Contactos e Oportunidades': 'CRM', 'Retalho / Pontos de Venda': 'POS',
    'Contabilidade de Gestão': null /* sem aplicação própria: não é gerido */
  };
  GA.DOC_CREDITO = 'VND_NC_02';
  GA.codigoPerfil = function (modulo, nivel) {
    var p = GA.PERFIL[modulo]; if (!p) return null;
    return nivel === 'Total' ? p + '_WR_02' : nivel === 'Consulta' ? p + '_RD_02' : null;
  };
  GA.perfisCatalogo = function () {
    var o = [GA.DOC_CREDITO];
    Object.keys(GA.PERFIL).forEach(function (m) { if (GA.PERFIL[m]) o.push(GA.PERFIL[m] + '_RD_02', GA.PERFIL[m] + '_WR_02'); });
    return o;
  };

  /* Segregação de funções: combinações que bloqueiam o pedido (B) ou exigem justificação (J) */
  GA.SOD = [
    { id: 'R1', sev: 'B', t: 'Compras Total com Tesouraria Total', f: function (m) { return m['Compras'] === 'Total' && m['Tesouraria'] === 'Total'; } },
    { id: 'R2', sev: 'B', t: 'Vendas Total, Tesouraria Total e documentos de crédito', f: function (m, c) { return m['Vendas'] === 'Total' && m['Tesouraria'] === 'Total' && c; } },
    { id: 'R3', sev: 'J', t: 'Contabilidade Total com Tesouraria Total', f: function (m) { return m['Contabilidade'] === 'Total' && m['Tesouraria'] === 'Total'; } },
    { id: 'R4', sev: 'J', t: 'Compras Total com Inventário Total', f: function (m) { return m['Compras'] === 'Total' && m['Inventário'] === 'Total'; } }
  ];
  GA.sod = function (conta) { return GA.SOD.filter(function (r) { return r.f(conta.modulos || {}, !!conta.credito); }); };

  /* ---------- Estado de um pedido, a partir do histórico ---------- */
  GA.ESTADOS = {
    pendente: 'Aguarda aprovação', rejeitado: 'Rejeitado', aprovado: 'Aprovado · ensaio na cópia de testes',
    testado: 'Ensaio concluído · aguarda ordem de produção', falhou_testes: 'Falhou na cópia de testes',
    producao: 'Ordem dada · a executar em produção', executado: 'Executado e verificado em produção', falhou: 'Falhou em produção',
    reverter: 'Reversão pedida', revertido: 'Revertido', activo: 'Acesso temporário aberto', fechado: 'Acesso temporário fechado'
  };
  var ult = function (p, t) { for (var i = p.h.length - 1; i >= 0; i--) if (t.indexOf(p.h[i].t) >= 0) return p.h[i]; return null; };
  GA.ultimo = ult;
  GA.estado = function (p) {
    var e = ult(p, ['pedido', 'aprovacao', 'rejeicao', 'testes', 'producao', 'execucao', 'reverter', 'revertido', 'jit-aberto', 'jit-fechado']);
    if (!e) return 'pendente';
    switch (e.t) {
      case 'pedido': return 'pendente';
      case 'rejeicao': return 'rejeitado';
      case 'aprovacao': return 'aprovado';
      case 'testes': return e.ok ? 'testado' : 'falhou_testes';
      case 'producao': return 'producao';
      case 'execucao': return e.ok ? 'executado' : 'falhou';
      case 'reverter': return 'reverter';
      case 'revertido': return 'revertido';
      case 'jit-aberto': return 'activo';
      case 'jit-fechado': return 'fechado';
    }
    return 'pendente';
  };

  /* ---------- Impressão digital do que vai ser executado ---------- */
  var canon = function (v) {
    if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
    if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ':' + canon(v[k]); }).join(',') + '}';
    return JSON.stringify(v === undefined ? null : v);
  };
  GA.canon = canon;
  GA.hash = async function (p) {
    var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canon({ id: p.id, tipo: p.tipo, conteudo: p.conteudo })));
    return Array.from(new Uint8Array(buf)).map(function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  };

  /* ---------- Pedidos a partir da matriz ---------- */
  GA.conta = function (r, EMP, MODS) {
    var C = MA.COL, mods = {}, est = r[C.estado] ? String(r[C.estado]).trim() : '';
    MODS.forEach(function (m, j) { var v = r[C.mod0 + j]; if ((v === 'Total' || v === 'Consulta') && GA.PERFIL[m]) mods[m] = v; });
    var emp = []; for (var i = 0; i < C.empN; i++) if (r[C.emp0 + i]) emp.push(EMP[i]);
    return {
      login: String(r[C.user]).trim(),
      accao: /^desactivar/i.test(est) ? 'desactivar' : 'aplicar',
      empresas: emp, modulos: mods, credito: /^sim/i.test(String(r[C.cred] || ''))
    };
  };
  /* Contas com decisão (Manter, Novo, Desactivar) e diferenças face ao último retrato do ERP */
  GA.candidatas = function (M) {
    var C = MA.COL, EMP = MA.empresas(M), MODS = MA.modulos(M);
    return MA.linhas(M).map(function (r) {
      var est = r[C.estado] ? String(r[C.estado]).trim() : '';
      if (!(est === 'Manter' || est === 'Novo' || /^desactivar/i.test(est))) return null;
      var dif = M.erp ? MA.divergenciasLinha(r, M.erp, EMP, MODS) : [];
      var c = GA.conta(r, EMP, MODS);
      var dm = /^Desactivar em (\d\d)\/(\d\d)\/(\d{4})/i.exec(est);
      if (dm && dm[3] + '-' + dm[2] + '-' + dm[1] > MA.hoje().iso) return null; // saída ainda no futuro
      if (c.accao === 'aplicar' && !c.empresas.length) return null;
      return { conta: c, nome: r[C.nome] || c.login, diferencas: dif, sod: c.accao === 'aplicar' ? GA.sod(c) : [] };
    }).filter(Boolean);
  };
  GA.tempo = function (contas) {
    var m = 0; contas.forEach(function (c) { m += 5 + (c.empresas || []).length + 2; });
    var a = contas.length ? Math.round(10 + 0.5 * contas.length) : 0;
    return { manual: m, app: a, poupado: Math.max(0, m - a) };
  };

  /* ---------- Repositório (API do GitHub) ---------- */
  var api = function () { return 'https://api.github.com/repos/' + MA.REPO.dono + '/' + MA.REPO.repo; };
  GA.gh = async function (token, metodo, caminho, corpo, absoluto) {
    var h = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (token) h.Authorization = 'Bearer ' + token;
    if (corpo) h['Content-Type'] = 'application/json';
    var r = await fetch(absoluto ? caminho : api() + caminho, { method: metodo, headers: h, body: corpo ? JSON.stringify(corpo) : undefined, cache: 'no-store' });
    if (!r.ok) { var e = new Error('github'); e.status = r.status; try { e.detalhe = (await r.json()).message; } catch (x) {} throw e; }
    return r.status === 204 ? null : r.json();
  };
  GA.quem = async function (token) { var u = await GA.gh(token, 'GET', 'https://api.github.com/user', null, true); return u.login; };
  var b64 = function (s) { return typeof Buffer !== 'undefined' ? Buffer.from(s, 'base64').toString('utf8') : new TextDecoder().decode(Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); })); };

  GA.vazio = function () { return { v: 1, seq: 1000, pedidos: [] }; };
  GA.ler = async function (token, senha) {
    try {
      var j = await GA.gh(token, 'GET', '/contents/' + GA.FICHEIRO + '?ref=' + MA.REPO.ramo + '&t=' + Date.now());
      return { D: await MA.decifrarTexto(JSON.parse(b64(j.content.replace(/\s/g, ''))), senha), sha: j.sha };
    } catch (e) { if (e.status === 404) return { D: GA.vazio(), sha: null }; throw e; }
  };

  /* Junta duas versões do ficheiro de pedidos (o browser e o agente podem gravar ao mesmo tempo):
     pedidos por id; histórico por união (sem repetidos), ordenado pela hora. */
  GA.fundir = function (a, b) {
    var por = {}, ordem = [];
    [a, b].forEach(function (D) {
      (D.pedidos || []).forEach(function (p) {
        var q = por[p.id];
        if (!q) { por[p.id] = JSON.parse(JSON.stringify(p)); ordem.push(p.id); return; }
        var chaves = {}; q.h.forEach(function (e) { chaves[canon(e)] = 1; });
        p.h.forEach(function (e) { if (!chaves[canon(e)]) q.h.push(e); });
        q.h.sort(function (x, y) { return x.em < y.em ? -1 : x.em > y.em ? 1 : 0; });
      });
    });
    return { v: 1, seq: Math.max(a.seq || 0, b.seq || 0), pedidos: ordem.map(function (k) { return por[k]; }) };
  };

  /* Resumo público: só números */
  GA.resumo = function (D) {
    var n = {}; D.pedidos.forEach(function (p) { var e = GA.estado(p); n[e] = (n[e] || 0) + 1; });
    var poupado = 0; D.pedidos.forEach(function (p) { var x = ult(p, ['execucao']); if (x && x.ok && p.tempo) poupado += p.tempo.poupado; });
    return { data: MA.hoje().iso, pedidos: D.pedidos.length, porEstado: n, minutosPoupados: poupado };
  };
  GA.ficheiroResumo = function (R) {
    return '/* Gerado pelo Gestor de Acessos (sem dados pessoais). Não editar à mão. */\n' +
      'window.PD && window.PD.aplicarGestor && window.PD.aplicarGestor(' + JSON.stringify(R) + ');\n';
  };

  /* Altera o ficheiro de pedidos num único commit, com os marcadores de eventos.
     alterar(D) muda D e devolve [{ id, evento, hash }]. Em caso de conflito, lê de novo, junta e repete. */
  GA.alterar = async function (token, senha, alterar, mensagem) {
    for (var tent = 1; tent <= 4; tent++) {
      var F = await GA.ler(token, senha);
      var D = JSON.parse(JSON.stringify(F.D));
      var eventos = (await alterar(D)) || [];
      var enc = await MA.cifrar(D, senha, GA.ORIGEM);
      var ficheiros = [{ path: GA.FICHEIRO, content: JSON.stringify(enc) }, { path: GA.RESUMO, content: GA.ficheiroResumo(GA.resumo(D)) }];
      eventos.forEach(function (ev) {
        ficheiros.push({ path: GA.EVENTOS + ev.id + '.' + ev.evento + '.json', content: JSON.stringify({ id: ev.id, evento: ev.evento, hash: ev.hash, em: new Date().toISOString() }) + '\n' });
      });
      try {
        var ref = await GA.gh(token, 'GET', '/git/ref/heads/' + MA.REPO.ramo);
        if (F.sha) {
          var cur = await GA.gh(token, 'GET', '/contents/' + GA.FICHEIRO + '?ref=' + ref.object.sha);
          if (cur.sha !== F.sha) throw new Error('conflito');
        }
        var com = await GA.gh(token, 'GET', '/git/commits/' + ref.object.sha);
        var tree = await GA.gh(token, 'POST', '/git/trees', { base_tree: com.tree.sha, tree: ficheiros.map(function (f) { return { path: f.path, mode: '100644', type: 'blob', content: f.content }; }) });
        var novo = await GA.gh(token, 'POST', '/git/commits', { message: mensagem, tree: tree.sha, parents: [ref.object.sha] });
        await GA.gh(token, 'PATCH', '/git/refs/heads/' + MA.REPO.ramo, { sha: novo.sha });
        return { D: D, commit: novo.sha };
      } catch (e) {
        var repetir = e.message === 'conflito' || e.status === 409 || e.status === 422;
        if (!repetir || tent === 4) throw e;
        await new Promise(function (r) { setTimeout(r, 1500 * tent); });
      }
    }
    throw new Error('conflito');
  };

  /* Autor (login do GitHub) do commit que criou o marcador de um evento; null se não existir */
  GA.autorEvento = async function (token, id, evento) {
    var c = await GA.gh(token, 'GET', '/commits?path=' + encodeURIComponent(GA.EVENTOS + id + '.' + evento + '.json') + '&sha=' + MA.REPO.ramo + '&per_page=100');
    if (!c || !c.length) return null;
    var primeiro = c[c.length - 1]; // o mais antigo: quem criou o marcador
    return primeiro.author ? primeiro.author.login : null;
  };
  GA.lerEvento = async function (token, id, evento) {
    try {
      var j = await GA.gh(token, 'GET', '/contents/' + GA.EVENTOS + id + '.' + evento + '.json?ref=' + MA.REPO.ramo);
      return JSON.parse(b64(j.content.replace(/\s/g, '')));
    } catch (e) { if (e.status === 404) return null; throw e; }
  };

  /* ---------- Acções do fluxo (browser) ---------- */
  var agora = function () { return new Date().toISOString(); };
  GA.novoId = function (D) { D.seq = (D.seq || 1000) + 1; return 'GA-' + D.seq; };
  GA.criarPedido = async function (D, tipo, titulo, conteudo, por, extra) {
    var p = { id: GA.novoId(D), tipo: tipo, titulo: titulo, conteudo: conteudo, h: [{ t: 'pedido', em: agora(), por: por }] };
    if (extra) Object.keys(extra).forEach(function (k) { p[k] = extra[k]; });
    p.hash = await GA.hash(p);
    D.pedidos.unshift(p);
    return [{ id: p.id, evento: 'pedido', hash: p.hash }];
  };
  GA.registar = function (D, id, evento, por, dados) {
    var p = D.pedidos.filter(function (x) { return x.id === id; })[0];
    if (!p) throw new Error('Pedido ' + id + ' não encontrado.');
    var e = { t: evento, em: agora(), por: por }; if (dados) Object.keys(dados).forEach(function (k) { e[k] = dados[k]; });
    p.h.push(e);
    return [{ id: id, evento: evento, hash: p.hash }];
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = GA; else root.GA = GA;
})(typeof window !== 'undefined' ? window : globalThis);
