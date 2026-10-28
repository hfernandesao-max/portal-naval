/* Matriz de acessos Cegid Primavera Evolution V10: leitura, edição e resumo.
   O ficheiro cifrado (data/acessos-matriz.enc.json) guarda a matriz com a mesma estrutura do Excel
   (folhas, células, estilos e listas). Daqui saem: as linhas da folha «Utilizadores» para edição,
   a gravação das alterações (com registo automático na folha «Alterações») e o resumo agregado,
   sem dados pessoais, que alimenta as páginas públicas (data/acessos-resumo.js). */
(function (root) {
  'use strict';
  var MA = {};
  MA.PRAZO = '2026-10-16';   // prazo dado aos responsáveis para devolverem a matriz
  MA.LINHA0 = 5;            // primeira linha de dados na folha «Utilizadores»
  MA.NCOL = 39;
  MA.COL = { num: 0, user: 1, nome: 2, email: 3, nivel: 4, estado: 5, area: 6, resp: 7, valid: 8, empSel: 9, emp0: 10, empN: 17, mod0: 27, modN: 10, cred: 37, obs: 38 };
  MA.ESTADOS = ['Manter', 'Novo', 'Desactivar', 'A confirmar'];
  MA.NIVEIS = ['Administrador', 'Super', 'Utilizador', 'Novo (a criar)'];
  MA.NIVEL_MOD = ['Total', 'Consulta', 'Sem acesso'];
  MA.MOD_EN = { 'Vendas': 'Sales', 'Compras': 'Purchasing', 'Inventário': 'Inventory', 'Contas Correntes': 'Current accounts', 'Tesouraria': 'Treasury', 'Contabilidade': 'Accounting', 'Contabilidade de Gestão': 'Management accounting', 'Equipamentos e Activos': 'Fixed assets', 'Contactos e Oportunidades': 'Contacts & opportunities', 'Retalho / Pontos de Venda': 'Retail / POS' };
  MA.MOD_CURTO = { 'Contabilidade de Gestão': 'Contab. de Gestão', 'Retalho / Pontos de Venda': 'Retalho / POS' };

  function folha(M, nome) { for (var i = 0; i < M.sheets.length; i++) if (M.sheets[i].name === nome) return M.sheets[i]; return null; }
  function letra(c) { var s = ''; while (c > 0) { var m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s; }
  MA.letra = letra;
  MA.folha = folha;

  /* Cabeçalhos (linha 4) e linhas de dados da folha «Utilizadores» */
  MA.cabecalho = function (M) {
    var S = folha(M, 'Utilizadores'), h = [];
    S.cells.forEach(function (e) { if (e.r === 4) h[e.c - 1] = e.v; });
    return h;
  };
  MA.linhas = function (M) {
    var S = folha(M, 'Utilizadores'), por = {};
    S.cells.forEach(function (e) {
      if (e.r < MA.LINHA0) return;
      var r = por[e.r] || (por[e.r] = new Array(MA.NCOL).fill(null));
      r[e.c - 1] = e.v == null ? null : e.v;
    });
    return Object.keys(por).map(Number).sort(function (a, b) { return a - b; })
      .map(function (k) { return por[k]; })
      .filter(function (r) { return r[MA.COL.user] != null && String(r[MA.COL.user]).trim() !== ''; })
      .map(function (r) { return r.map(function (v) { return v === '' ? null : v; }); });
  };
  MA.empresas = function (M) { return MA.cabecalho(M).slice(MA.COL.emp0, MA.COL.emp0 + MA.COL.empN); };
  MA.modulos = function (M) { return MA.cabecalho(M).slice(MA.COL.mod0, MA.COL.mod0 + MA.COL.modN); };
  MA.empresasSel = function (r, emp) { var o = []; for (var i = 0; i < MA.COL.empN; i++) if (r[MA.COL.emp0 + i] && String(r[MA.COL.emp0 + i]).trim() !== '') o.push(emp[i]); return o.join(', '); };

  /* Grava as linhas na folha «Utilizadores» com o estilo de cada coluna e regista as alterações */
  MA.gravar = function (M, rows, alteracoes) {
    var S = folha(M, 'Utilizadores'), emp = MA.empresas(M);
    var molde = {};
    S.cells.forEach(function (e) { if (e.r === MA.LINHA0) molde[e.c] = e; });
    S.cells = S.cells.filter(function (e) { return e.r < MA.LINHA0; });
    rows.forEach(function (r, i) {
      var R = MA.LINHA0 + i;
      r[MA.COL.num] = i + 1;
      for (var c = 1; c <= MA.NCOL; c++) {
        var m = molde[c] || {}, e = { r: R, c: c };
        if (m.font) e.font = m.font; if (m.fill) e.fill = m.fill; if (m.al) e.al = m.al; if (m.bd) e.bd = m.bd;
        if (c - 1 === MA.COL.empSel) {
          var parts = []; for (var k = 0; k < MA.COL.empN; k++) { var L = letra(MA.COL.emp0 + k + 1); parts.push('IF(' + L + R + '<>"",' + L + '$4,"")'); }
          e.f = '_xlfn.TEXTJOIN(", ",TRUE(),' + parts.join(',') + ')'; e.v = MA.empresasSel(r, emp);
        } else if (r[c - 1] != null && r[c - 1] !== '') e.v = r[c - 1];
        if (e.v != null || e.f || e.fill) S.cells.push(e);
      }
    });
    var ult = MA.LINHA0 + Math.max(rows.length, 1) - 1;
    S.dv = S.dv.map(function (d) { return { ref: d.ref.replace(/(\$?[A-Z]+)(\d+):(\$?[A-Z]+)(\d+)/g, function (_, a, n1, b) { return a + n1 + ':' + b + ult; }), f: d.f }; });
    var est = ['Manter', 'Novo', 'Desactivar'];
    rows.forEach(function (r) { var v = r[MA.COL.estado]; if (v && est.indexOf(v) < 0 && v !== 'A confirmar') est.push(v); });
    est.push('A confirmar');
    S.dv.forEach(function (d) { if (/^\$?F\d/.test(d.ref)) d.f = '"' + est.join(',') + '"'; });
    var I = folha(M, 'Instruções'), hj = MA.hoje();
    if (I) I.cells.forEach(function (e) { if (e.r === 3 && typeof e.v === 'string') e.v = e.v.replace(/actualizada a \d\d\/\d\d\/\d{4}/, 'actualizada a ' + hj.dmy); });
    if (alteracoes && alteracoes.length) {
      var A = folha(M, 'Alterações');
      if (A) {
        var maxr = 0, mold = {};
        A.cells.forEach(function (e) { if (e.r > maxr) maxr = e.r; });
        A.cells.forEach(function (e) { if (e.r === 4) mold[e.c] = e; });
        alteracoes.forEach(function (a) {
          maxr++;
          [a.data, a.utilizador, a.alteracao, a.origem].forEach(function (v, j) {
            var m = mold[j + 1] || {}, e = { r: maxr, c: j + 1, v: v };
            if (m.font) e.font = m.font; if (m.al) e.al = m.al; if (m.bd) e.bd = m.bd;
            A.cells.push(e);
          });
        });
      }
    }
    return M;
  };

  /* Resumo agregado (sem nomes nem e-mails) para as páginas públicas */
  MA.resumo = function (M, dataISO) {
    var rows = MA.linhas(M), mods = MA.modulos(M), C = MA.COL;
    var est = function (r) { var v = r[C.estado] ? String(r[C.estado]).trim() : ''; if (/^desactivar/i.test(v)) return 'Desactivar'; return v; };
    var niv = function (r) { return r[C.nivel] ? String(r[C.nivel]).trim() : 'Utilizador'; };
    var cnt = function (f) { return rows.filter(f).length; };
    var nManter = cnt(function (r) { return est(r) === 'Manter'; }), nNovo = cnt(function (r) { return est(r) === 'Novo'; }),
        nDes = cnt(function (r) { return est(r) === 'Desactivar'; }), nConf = cnt(function (r) { return est(r) === 'A confirmar'; }),
        nSem = cnt(function (r) { return est(r) === ''; }), tot = rows.length;
    var nDesData = cnt(function (r) { return /^desactivar em/i.test(String(r[C.estado] || '')); });
    var nivN = function (n) { return cnt(function (r) { return niv(r) === n; }); };
    var perfis = rows.filter(function (r) { for (var i = 0; i < C.modN; i++) if (r[C.mod0 + i]) return true; return false; });
    var modulos = mods.map(function (m, i) {
      var t = 0, c = 0, s = 0;
      perfis.forEach(function (r) { var v = r[C.mod0 + i]; if (v === 'Total') t++; else if (v === 'Consulta') c++; else if (v === 'Sem acesso') s++; });
      return { pt: MA.MOD_CURTO[m] || m, en: MA.MOD_EN[m] || m, t: t, c: c, s: s };
    });
    var credSim = perfis.filter(function (r) { return r[C.cred] === 'Sim'; }).length;
    var admSem = cnt(function (r) { return niv(r) === 'Administrador' && est(r) === ''; });
    var superSem = cnt(function (r) { return niv(r) === 'Super' && est(r) === ''; });
    var admDes = cnt(function (r) { return niv(r) === 'Administrador' && est(r) === 'Desactivar'; });
    var admConf = cnt(function (r) { return niv(r) === 'Administrador' && est(r) === 'A confirmar'; });
    var genericas = cnt(function (r) { return /^(extra|refresh|msgna|sales\b|estagiario)/i.test(String(r[C.user] || '')) && est(r) === ''; });
    var fornecedor = cnt(function (r) { return niv(r) === 'Super' && /digitex/i.test(String(r[C.email] || '') + String(r[C.nome] || '')); });
    var semEmail = cnt(function (r) { return !r[C.email]; });
    var DOM = /@(naval\.co\.ao|vistar\.co\.ao|refitec\.co\.ao|foodtec\.co\.ao|everywhere-gt\.com|digitex\.co\.ao|grupo-naval\.com)$/i;
    var emailMau = cnt(function (r) { return r[C.email] && !DOM.test(String(r[C.email]).trim()); });
    var pl = function (n, s, p) { return n === 1 ? s : p; };
    var riscos = [];
    if (admSem) riscos.push({ nivel: 'alto', pt: admSem + pl(admSem, ' conta de Administrador sem resposta: confirmar ou bloquear primeiro.', ' contas de Administrador sem resposta: confirmar ou bloquear primeiro.'), en: admSem + pl(admSem, ' Administrator account with no reply: confirm or block first.', ' Administrator accounts with no reply: confirm or block first.') });
    if (admDes) riscos.push({ nivel: 'alto', pt: admDes + pl(admDes, ' conta de Administrador a desactivar: desactivar já.', ' contas de Administrador a desactivar: desactivar já.'), en: admDes + pl(admDes, ' Administrator account to deactivate: deactivate now.', ' Administrator accounts to deactivate: deactivate now.') });
    if (admConf) riscos.push({ nivel: 'alto', pt: admConf + pl(admConf, ' Administrador com resposta incompleta.', ' Administradores com resposta incompleta.'), en: admConf + pl(admConf, ' Administrator with an incomplete reply.', ' Administrators with an incomplete reply.') });
    if (credSim) riscos.push({ nivel: 'medio', pt: credSim + ' de ' + perfis.length + ' perfis podem emitir documentos de crédito (NC, NCA, NCO, PDV, DV): rever, a regra é «Não».', en: credSim + ' of ' + perfis.length + ' profiles may issue credit documents (NC, NCA, NCO, PDV, DV): review, the default is "No".' });
    if (genericas) riscos.push({ nivel: 'medio', pt: genericas + pl(genericas, ' conta genérica sem utilizador identificado.', ' contas genéricas (Extra, Refresh, Sales…) sem utilizador identificado.'), en: genericas + pl(genericas, ' shared account with no identified user.', ' shared accounts (Extra, Refresh, Sales…) with no identified user.') });
    if (fornecedor) riscos.push({ nivel: 'medio', pt: fornecedor + pl(fornecedor, ' conta do fornecedor com nível Super: limitar ao período de implementação.', ' contas do fornecedor com nível Super: limitar ao período de implementação.'), en: fornecedor + pl(fornecedor, ' vendor account with Super level: limit to the implementation period.', ' vendor accounts with Super level: limit to the implementation period.') });
    if (semEmail || emailMau) riscos.push({ nivel: 'baixo', pt: (semEmail ? semEmail + pl(semEmail, ' conta sem e-mail', ' contas sem e-mail') : '') + (semEmail && emailMau ? ' e ' : '') + (emailMau ? emailMau + pl(emailMau, ' e-mail com domínio a corrigir', ' e-mails com domínio a corrigir') : '') + '.', en: (semEmail ? semEmail + pl(semEmail, ' account with no e-mail', ' accounts with no e-mail') : '') + (semEmail && emailMau ? ' and ' : '') + (emailMau ? emailMau + pl(emailMau, ' e-mail with a domain to fix', ' e-mails with a domain to fix') : '') + '.' });
    var passos = [];
    var bloq = nSem - superSem;
    if (nSem) passos.push({ pt: 'Bloquear as ' + bloq + ' contas de utilizadores sem resposta' + (superSem ? '; as ' + superSem + ' contas Super, de gestão do ERP, ficam de fora.' : '.'), en: 'Block the ' + bloq + ' user accounts with no reply' + (superSem ? '; the ' + superSem + ' Super accounts, used to manage the ERP, are excluded.' : '.') });
    if (nDes) passos.push({ pt: 'Desactivar ' + nDes + pl(nDes, ' conta', ' contas') + (nDesData ? ' (' + nDesData + ' com data marcada)' : '') + ', sem apagar, para manter o histórico.', en: 'Deactivate ' + nDes + pl(nDes, ' account', ' accounts') + (nDesData ? ' (' + nDesData + ' on a set date)' : '') + ', without deleting, to keep the history.' });
    if (nNovo) passos.push({ pt: 'Criar ' + nNovo + pl(nNovo, ' conta nova', ' contas novas') + ', com acesso remoto.', en: 'Create ' + nNovo + pl(nNovo, ' new account', ' new accounts') + ', with remote access.' });
    if (nConf) passos.push({ pt: 'Fechar ' + pl(nConf, 'a resposta incompleta', 'as ' + nConf + ' respostas incompletas') + ' com os responsáveis.', en: 'Close ' + pl(nConf, 'the incomplete reply', 'the ' + nConf + ' incomplete replies') + ' with the managers.' });
    passos.push({ pt: 'Aplicar os ' + perfis.length + ' perfis por módulo e reservar o nível Administrador a quem gere o ERP.', en: 'Apply the ' + perfis.length + ' module profiles and keep the Administrator level for ERP managers only.' });
    var d = dataISO || new Date().toISOString().slice(0, 10), dpt = d.slice(8, 10) + '-' + d.slice(5, 7);
    return {
      data: d,
      hora: MA.hoje().hora,
      acessos: {
        data: d,
        prazo: MA.PRAZO,
        grupos: [
          { pt: 'Mantêm o acesso', en: 'Keep access', n: nManter, cor: '#2397D4' },
          { pt: 'Contas novas a criar', en: 'New accounts to create', n: nNovo, cor: '#7CC6EE' },
          { pt: 'A desactivar', en: 'To deactivate', n: nDes, cor: '#FF6961' },
          { pt: 'Resposta incompleta', en: 'Incomplete reply', n: nConf, cor: '#C9822A' },
          { pt: 'Sem resposta · a bloquear', en: 'No reply · being blocked', n: nSem, cor: 'rgba(235,235,245,0.22)' }
        ],
        notas: [
          { pt: 'Contas desactivadas, não apagadas, para manter o histórico.', en: 'Accounts are deactivated, not deleted, to keep the history.' },
          { pt: 'Contas novas com acesso remoto configurado ao criar as contas.', en: 'Remote access is set up when new accounts are created.' },
          { pt: 'O prazo para devolver a matriz terminou a ' + MA.PRAZO.slice(8, 10) + '-' + MA.PRAZO.slice(5, 7) + '.', en: 'The deadline to return the matrix was ' + MA.PRAZO + '.' }
        ]
      },
      acessosAnalise: {
        fonte: { pt: 'Matriz de acessos Cegid Primavera Evolution V10 · actualizada a ' + dpt + '-' + d.slice(0, 4), en: 'Cegid Primavera Evolution V10 access matrix · updated ' + d },
        empresas: MA.empresas(M).length,
        niveis: [
          { pt: 'Administrador', en: 'Administrator', n: nivN('Administrador'), cor: '#FF8A84' },
          { pt: 'Super', en: 'Super', n: nivN('Super'), cor: '#E0A458' },
          { pt: 'Utilizador', en: 'User', n: tot - nivN('Administrador') - nivN('Super') - nivN('Novo (a criar)'), cor: '#2397D4' },
          { pt: 'Novo (a criar)', en: 'New (to create)', n: nivN('Novo (a criar)'), cor: '#7CC6EE' }
        ],
        perfis: perfis.length,
        modulos: modulos,
        credito: { sim: credSim, total: perfis.length },
        riscos: riscos,
        passos: passos
      },
      tarefa: { total: tot, tratados: nManter + nNovo + nDes, manter: nManter, novo: nNovo, desactivar: nDes, confirmar: nConf, sem: nSem }
    };
  };

  /* Texto do ficheiro data/acessos-resumo.js */
  MA.ficheiroResumo = function (R) {
    return '/* Gerado pelo portal a partir da matriz de acessos (sem dados pessoais). Não editar à mão. */\n' +
      'window.PD && window.PD.aplicarAcessos && window.PD.aplicarAcessos(' + JSON.stringify(R) + ');\n';
  };

  MA.hoje = function () {
    var d = new Date(), p = function (n) { return ('0' + n).slice(-2); };
    return { iso: d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()), dmy: p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear(), hora: p(d.getHours()) + ':' + p(d.getMinutes()) };
  };

  /* Descrição legível da diferença entre duas versões de uma linha (para a folha «Alterações») */
  MA.diferencas = function (a, b, cab) {
    var C = MA.COL, o = [], vz = function (v) { return v == null || v === '' ? '—' : String(v); };
    if (!a) return 'Utilizador acrescentado à matriz';
    if (!b) return 'Utilizador retirado da matriz';
    [C.user, C.nome, C.email, C.nivel, C.estado, C.area, C.resp, C.valid].forEach(function (i) { if (vz(a[i]) !== vz(b[i])) o.push(cab[i] + ': ' + vz(a[i]) + ' → ' + vz(b[i])); });
    var mais = [], menos = [];
    for (var k = 0; k < C.empN; k++) { var x = !!a[C.emp0 + k], y = !!b[C.emp0 + k]; if (x !== y) (y ? mais : menos).push(cab[C.emp0 + k]); }
    if (mais.length) o.push('Empresas acrescentadas: ' + mais.join(', '));
    if (menos.length) o.push('Empresas retiradas: ' + menos.join(', '));
    for (var m = 0; m < C.modN; m++) { var i2 = C.mod0 + m; if (vz(a[i2]) !== vz(b[i2])) o.push(cab[i2] + ': ' + vz(a[i2]) + ' → ' + vz(b[i2])); }
    if (vz(a[C.cred]) !== vz(b[C.cred])) o.push('Documentos de crédito: ' + vz(a[C.cred]) + ' → ' + vz(b[C.cred]));
    if (vz(a[C.obs]) !== vz(b[C.obs])) o.push('Observações actualizadas');
    return o.join('; ');
  };

  /* ---------- Funções do browser: cifra, Excel e gravação no GitHub ---------- */
  var b64d = function (s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  var b64e = function (u) { u = new Uint8Array(u); var s = '', N = 0x8000; for (var i = 0; i < u.length; i += N) s += String.fromCharCode.apply(null, u.subarray(i, i + N)); return btoa(s); };
  MA.b64e = b64e;
  var chave = async function (senha, salt, iter, uso) {
    var base = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, [uso]);
  };
  MA.decifrarTexto = async function (E, senha) {
    var key = await chave(senha, b64d(E.salt), E.iter, 'decrypt'), raw;
    try { raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(E.iv) }, key, b64d(E.ct)); } catch (e) { throw new Error('senha'); }
    return JSON.parse(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
  };
  MA.cifrar = async function (M, senha, origem) {
    var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), iter = 310000;
    var gz = await new Response(new Blob([JSON.stringify(M)]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    var key = await chave(senha, salt, iter, 'encrypt');
    var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, gz);
    return { v: 1, alg: 'AES-GCM-256', kdf: 'PBKDF2-SHA256', iter: iter, salt: b64e(salt), iv: b64e(iv), gzip: true, origem: origem || 'Matriz de acessos Cegid Primavera Evolution V10', ct: b64e(ct) };
  };

  MA.REPO = { dono: 'hfernandesao-max', repo: 'portal-naval', ramo: 'main', ficheiro: 'data/acessos-matriz.enc.json', resumo: 'data/acessos-resumo.js' };
  var api = 'https://api.github.com/repos/' + MA.REPO.dono + '/' + MA.REPO.repo;
  var gh = async function (token, metodo, caminho, corpo) {
    var h = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (token) h.Authorization = 'Bearer ' + token;
    if (corpo) h['Content-Type'] = 'application/json';
    var r = await fetch(api + caminho, { method: metodo, headers: h, body: corpo ? JSON.stringify(corpo) : undefined, cache: 'no-store' });
    if (!r.ok) { var e = new Error('github'); e.status = r.status; try { e.detalhe = (await r.json()).message; } catch (x) {} throw e; }
    return r.json();
  };
  /* Lê o ficheiro cifrado: primeiro do repositório (versão mais recente), senão da cópia publicada no site */
  MA.carregar = async function (token) {
    try {
      var j = await gh(token, 'GET', '/contents/' + MA.REPO.ficheiro + '?ref=' + MA.REPO.ramo + '&t=' + Date.now());
      var txt = new TextDecoder().decode(b64d(j.content.replace(/\s/g, '')));
      return { E: JSON.parse(txt), sha: j.sha, fonte: 'repo' };
    } catch (e) {
      var r = await fetch(MA.REPO.ficheiro + '?t=' + Date.now(), { cache: 'no-store' });
      return { E: await r.json(), sha: null, fonte: 'site' };
    }
  };
  MA.verificarToken = async function (token) {
    var j = await gh(token, 'GET', '');
    if (j.permissions && !j.permissions.push) { var e = new Error('github'); e.status = 403; throw e; }
    return j;
  };
  /* Grava os dois ficheiros num único commit (matriz cifrada + resumo público) */
  MA.publicar = async function (token, ficheiros, mensagem, shaEsperado) {
    if (shaEsperado) {
      var cur = await gh(token, 'GET', '/contents/' + MA.REPO.ficheiro + '?ref=' + MA.REPO.ramo + '&t=' + Date.now());
      if (cur.sha !== shaEsperado) { var e = new Error('conflito'); throw e; }
    }
    var ref = await gh(token, 'GET', '/git/ref/heads/' + MA.REPO.ramo);
    var com = await gh(token, 'GET', '/git/commits/' + ref.object.sha);
    var tree = await gh(token, 'POST', '/git/trees', { base_tree: com.tree.sha, tree: ficheiros.map(function (f) { return { path: f.path, mode: '100644', type: 'blob', content: f.content }; }) });
    var novo = await gh(token, 'POST', '/git/commits', { message: mensagem, tree: tree.sha, parents: [ref.object.sha] });
    await gh(token, 'PATCH', '/git/refs/heads/' + MA.REPO.ramo, { sha: novo.sha });
    var depois = await gh(token, 'GET', '/contents/' + MA.REPO.ficheiro + '?ref=' + novo.sha);
    return { commit: novo.sha, sha: depois.sha };
  };

  /* Excel: biblioteca ExcelJS carregada a pedido */
  MA.excelJS = function () { return root.ExcelJS ? Promise.resolve() : new Promise(function (ok, ko) { var sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js'; sc.onload = ok; sc.onerror = ko; document.head.appendChild(sc); }); };
  MA.excel = async function (M) {
    await MA.excelJS();
    var wb = new ExcelJS.Workbook(); wb.creator = 'Grupo Naval · Projectos Digitais'; wb.created = new Date();
    M.sheets.forEach(function (S) {
      var ws = wb.addWorksheet(S.name);
      Object.keys(S.cols).forEach(function (k) { ws.getColumn(k).width = S.cols[k]; });
      Object.keys(S.rows).forEach(function (k) { ws.getRow(+k).height = S.rows[k]; });
      S.cells.forEach(function (e) {
        var c = ws.getCell(e.r, e.c);
        if (e.f) c.value = { formula: e.f, result: e.v == null ? '' : e.v }; else if (e.v != null) c.value = e.v;
        var f = { name: 'Arial', size: (e.font && e.font.sz) || 10 };
        if (e.font) { if (e.font.b) f.bold = true; if (e.font.i) f.italic = true; if (e.font.c) f.color = { argb: e.font.c }; }
        c.font = f;
        if (e.fill) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: e.fill } };
        if (e.al) c.alignment = { wrapText: !!e.al.w, horizontal: e.al.h, vertical: e.al.v };
        if (e.bd) { var t = { style: 'thin', color: { argb: 'FFD9DEE7' } }; c.border = { top: t, left: t, bottom: t, right: t }; }
      });
      S.merges.forEach(function (rg) { try { ws.mergeCells(rg); } catch (x) {} });
      if (S.freeze) { var mm = S.freeze.match(/^([A-Z]+)(\d+)$/); if (mm) { var col = 0; for (var i = 0; i < mm[1].length; i++) col = col * 26 + mm[1].charCodeAt(i) - 64; ws.views = [{ state: 'frozen', xSplit: col - 1, ySplit: +mm[2] - 1 }]; } }
      S.dv.forEach(function (d) { d.ref.split(' ').forEach(function (rg) { if (ws.dataValidations && ws.dataValidations.add) ws.dataValidations.add(rg, { type: 'list', allowBlank: true, formulae: [d.f] }); }); });
    });
    return wb.xlsx.writeBuffer();
  };
  MA.descarregar = function (buf, nome) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    a.download = nome || ('Matriz_de_acessos_Cegid_Primavera_Evolution_V10_' + MA.hoje().iso + '.xlsx');
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  };
  /* Lê um Excel actualizado (folha «Utilizadores», cabeçalhos na linha com «Utilizador») e devolve as linhas no formato da matriz */
  var norm = function (s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase(); };
  MA.lerExcel = async function (buf, M) {
    await MA.excelJS();
    var wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf);
    var ws = wb.getWorksheet('Utilizadores') || wb.worksheets.filter(function (w) { return /utilizador/i.test(w.name); })[0] || wb.worksheets[0];
    if (!ws) throw new Error('folha');
    var val = function (c) { var v = c.value; if (v && typeof v === 'object') { if (v.richText) v = v.richText.map(function (t) { return t.text; }).join(''); else if ('result' in v) v = v.result; else if (v.text) v = v.text; else if (v instanceof Date) v = v.toISOString().slice(0, 10); } return v; };
    var cab = MA.cabecalho(M), alvo = cab.map(norm), linhaCab = 0, mapa = {};
    for (var r = 1; r <= Math.min(15, ws.rowCount) && !linhaCab; r++) {
      var row = ws.getRow(r), achou = false;
      row.eachCell(function (c) { if (norm(val(c)) === 'utilizador') achou = true; });
      if (achou) { linhaCab = r; row.eachCell(function (c, n) { var i = alvo.indexOf(norm(val(c))); if (i >= 0 && !(i in mapa)) mapa[i] = n; }); }
    }
    if (!linhaCab || !(MA.COL.user in mapa)) throw new Error('cabecalho');
    var falta = cab.filter(function (h, i) { return !(i in mapa) && i !== MA.COL.empSel; });
    var out = [];
    for (var k = linhaCab + 1; k <= ws.rowCount; k++) {
      var R = ws.getRow(k), lin = new Array(MA.NCOL).fill(null);
      Object.keys(mapa).forEach(function (i) {
        var v = val(R.getCell(mapa[i])); if (v == null) return; if (typeof v === 'string') { v = v.trim(); if (!v) return; }
        i = +i;
        if (i >= MA.COL.emp0 && i < MA.COL.emp0 + MA.COL.empN) v = 'X';
        else if (i >= MA.COL.mod0 && i < MA.COL.mod0 + MA.COL.modN) { var n = norm(v); v = n === 'total' ? 'Total' : n === 'consulta' ? 'Consulta' : /^sem/.test(n) ? 'Sem acesso' : v; }
        else if (i === MA.COL.cred) { var n2 = norm(v); v = /^s/.test(n2) ? 'Sim' : /^n/.test(n2) ? 'Não' : v; }
        lin[i] = v;
      });
      if (lin[MA.COL.user] != null && String(lin[MA.COL.user]).trim() !== '') out.push(lin);
    }
    return { linhas: out, falta: falta, folha: ws.name };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MA; else root.MA = MA;
})(typeof window !== 'undefined' ? window : this);
