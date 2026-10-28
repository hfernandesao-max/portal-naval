#!/usr/bin/env node
/* Sincronização da matriz de acessos do portal com o ERP Primavera.

   Corre num servidor da rede do Grupo Naval (agendado). Em cada execução:
   1. lê da base PRIEMPRE, só em leitura, as contas, as empresas e os módulos de cada utilizador;
   2. abre a matriz cifrada do portal (GitHub), actualiza as colunas que vêm do ERP e regista
      as alterações detectadas na folha «Alterações» (origem «Primavera»);
   3. calcula as diferenças entre a matriz aprovada e o ERP;
   4. cifra de novo a matriz e grava-a no portal, com o resumo público (só números), num único commit.
   Só grava quando o ERP mudou desde a última leitura, ou uma vez por dia para confirmar a ligação.

   Credenciais (variáveis de ambiente; o executar.ps1 lê-as do ficheiro protegido pelo Windows):
     PRIMAVERA_SQL_SERVIDOR   ex.: SRV-PRIMAVERA\PRIMAVERA  ou  10.0.0.10,1433
     PRIMAVERA_SQL_BD         por omissão PRIEMPRE
     PRIMAVERA_SQL_UTILIZADOR utilizador SQL só de leitura (portal_leitura)
     PRIMAVERA_SQL_SENHA
     MATRIZ_SENHA             palavra-passe da matriz de acessos
     GITHUB_TOKEN             token fine-grained: só portal-naval, Contents: Read and write

   Opções:
     --teste                  não grava no portal; escreve o resultado na pasta «saida» (Excel com as diferenças)
     --matriz <ficheiro>      usa um ficheiro cifrado local em vez do GitHub (testes)
     --dados <ficheiro.json>  usa dados do ERP de um ficheiro em vez do SQL Server (testes)
     --forcar                 grava mesmo sem alterações no ERP */
'use strict';
const fs = require('fs');
const path = require('path');
const MA = require('../matriz-acessos.js');

const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : null; };
const TESTE = !!opt('--teste'), FORCAR = !!opt('--forcar');
const DIR = __dirname, SAIDA = path.join(DIR, 'saida'), LOGS = path.join(DIR, 'registos');
const CONFIG = fs.existsSync(path.join(DIR, 'config.json')) ? JSON.parse(fs.readFileSync(path.join(DIR, 'config.json'), 'utf8')) : {};

fs.mkdirSync(LOGS, { recursive: true });
const ficheiroLog = path.join(LOGS, 'sincronizacao-' + MA.hoje().iso.slice(0, 7) + '.log');
/* O registo só tem números e mensagens técnicas, sem nomes nem e-mails. */
const log = (m) => { const l = MA.hoje().iso + ' ' + new Date().toTimeString().slice(0, 8) + '  ' + m; console.log(l); fs.appendFileSync(ficheiroLog, l + '\n'); };
const falha = (m, e) => { log('ERRO: ' + m + (e ? ' (' + (e.status ? 'HTTP ' + e.status + ' ' : '') + (e.detalhe || e.message || e) + ')' : '')); process.exit(1); };
const env = (n, obrig) => { const v = process.env[n]; if (obrig && !v) falha('falta a variável ' + n); return v; };

/* Mapa empresa do Primavera → coluna da matriz. Por omissão o código é igual ao cabeçalho da matriz (ex.: OCEANO).
   Para códigos diferentes, acrescentar em config.json: { "empresas": { "CODIGO_PRIMAVERA": "CABECALHO_MATRIZ" } } */
const mapaEmpresa = (cod, EMP) => {
  const c = String(cod || '').trim().toUpperCase();
  if (c === '***') return '*';
  if (CONFIG.empresas && CONFIG.empresas[c]) return CONFIG.empresas[c];
  return EMP.indexOf(c) >= 0 ? c : null;
};

async function lerERP(EMP) {
  const ficheiro = opt('--dados');
  let U, P, A;
  if (ficheiro) {
    ({ utilizadores: U, permissoes: P, aplicacoes: A } = JSON.parse(fs.readFileSync(ficheiro, 'utf8')));
  } else {
    const sql = require('mssql');
    const [srv, porta] = String(env('PRIMAVERA_SQL_SERVIDOR', true)).split(',');
    const [host, instancia] = srv.split('\\');
    const pool = await sql.connect({
      server: host, port: porta ? +porta : undefined, database: env('PRIMAVERA_SQL_BD') || 'PRIEMPRE',
      user: env('PRIMAVERA_SQL_UTILIZADOR', true), password: env('PRIMAVERA_SQL_SENHA', true),
      options: { instanceName: instancia || undefined, encrypt: CONFIG.sqlEncriptar !== false, trustServerCertificate: CONFIG.sqlConfiarCertificado !== false, readOnlyIntent: true, appName: 'Portal Naval - sincronizacao' },
      requestTimeout: 60000
    });
    try {
      U = (await pool.request().query('SELECT Codigo, Nome, Email, Activo, Bloqueado, Administrador, SuperAdministrador FROM Utilizadores')).recordset;
      P = (await pool.request().query('SELECT DISTINCT Utilizador, Empresa FROM Permissoes')).recordset;
      A = (await pool.request().query('SELECT Utilizador, Apl FROM UtilizadoresAplicacoes')).recordset;
      const E = (await pool.request().query('SELECT Codigo FROM Empresas')).recordset;
      const semMapa = E.map((e) => String(e.Codigo).trim().toUpperCase()).filter((c) => !mapaEmpresa(c, EMP));
      if (semMapa.length) log('Aviso: empresas do Primavera sem coluna na matriz (ignoradas): ' + semMapa.join(', '));
    } finally { await pool.close(); }
  }
  const users = {};
  U.forEach((u) => {
    const k = MA.chaveU(u.Codigo); if (!k) return;
    users[k] = {
      codigo: String(u.Codigo).trim(), nome: u.Nome ? String(u.Nome).trim() : null, email: u.Email ? String(u.Email).trim() : null,
      activo: !!u.Activo && !u.Bloqueado,
      nivel: u.SuperAdministrador ? 'Super' : (u.Administrador ? 'Administrador' : 'Utilizador'),
      empresas: [], apl: []
    };
  });
  P.forEach((p) => { const u = users[MA.chaveU(p.Utilizador)], e = mapaEmpresa(p.Empresa, EMP); if (u && e && u.empresas.indexOf(e) < 0) u.empresas.push(e); });
  A.forEach((a) => { const u = users[MA.chaveU(a.Utilizador)], c = String(a.Apl || '').trim().toUpperCase(); if (u && c && u.apl.indexOf(c) < 0) u.apl.push(c); });
  Object.keys(users).forEach((k) => {
    const u = users[k];
    u.empresas = u.empresas.indexOf('*') >= 0 ? ['*'] : u.empresas.sort((a, b) => EMP.indexOf(a) - EMP.indexOf(b));
    u.apl.sort();
  });
  const h = MA.hoje();
  return { data: h.iso, hora: h.hora, users };
}

(async () => {
  const senha = env('MATRIZ_SENHA', true);
  const token = TESTE ? env('GITHUB_TOKEN') : env('GITHUB_TOKEN', true);

  /* 1. Matriz actual */
  let E, sha = null;
  try {
    if (opt('--matriz')) E = JSON.parse(fs.readFileSync(opt('--matriz'), 'utf8'));
    else { const F = await MA.carregar(token); if (F.fonte !== 'repo') throw new Error('sem acesso ao repositório'); E = F.E; sha = F.sha; }
  } catch (e) { falha('não foi possível ler a matriz do portal', e); }
  let M;
  try { M = await MA.decifrarTexto(E, senha); } catch (e) { falha(e.message === 'senha' ? 'palavra-passe da matriz errada' : 'matriz ilegível', e); }
  const EMP = MA.empresas(M);

  /* 2. ERP */
  let erp;
  try { erp = await lerERP(EMP); } catch (e) { falha('não foi possível ler o Primavera', e); }
  const nAct = Object.values(erp.users).filter((u) => u.activo).length;
  log('Primavera lido: ' + Object.keys(erp.users).length + ' contas (' + nAct + ' activas).');

  /* 3. Houve mudanças no ERP? (compara com o retrato anterior, sem a data/hora) */
  const retrato = (x) => JSON.stringify(x && x.users ? x.users : null);
  const mudou = retrato(M.erp) !== retrato(erp);
  const ultimo = M.erp ? M.erp.data : null;
  if (!mudou && !FORCAR && !TESTE && ultimo === erp.data) { log('Sem alterações no ERP desde ' + M.erp.data + ' ' + M.erp.hora + '. Nada a gravar.'); return; }

  /* 4. Aplicar à matriz */
  const S = MA.sincronizarERP(M, erp);
  MA.gravar(M, S.rows, S.alteracoes);
  const R = MA.resumo(M, erp.data);
  const dv = MA.divergencias(M).filter((d) => d.g !== 'info');
  log('Alterações registadas: ' + S.alteracoes.length + '. Diferenças entre a matriz e o ERP: ' + dv.length + ' (' + Object.entries(R.erp.porTipo).map(([k, n]) => k + '=' + n).join(', ') + ').');

  /* 5. Cifrar e verificar */
  const enc = await MA.cifrar(M, senha);
  const M2 = await MA.decifrarTexto(enc, senha);
  if (JSON.stringify(M2) !== JSON.stringify(M)) falha('a verificação da cifra falhou; nada foi gravado');

  if (TESTE) {
    fs.mkdirSync(SAIDA, { recursive: true });
    global.ExcelJS = require('exceljs');
    fs.writeFileSync(path.join(SAIDA, 'Matriz_de_acessos_' + erp.data + '_teste.xlsx'), Buffer.from(await MA.excel(M)));
    fs.writeFileSync(path.join(SAIDA, 'acessos-resumo.js'), MA.ficheiroResumo(R));
    fs.writeFileSync(path.join(SAIDA, 'acessos-matriz.enc.json'), JSON.stringify(enc));
    log('Modo de teste: nada foi gravado no portal. Resultado na pasta «saida» (o Excel tem as folhas «Diferenças ERP» e «ERP (Primavera)»).');
    return;
  }

  /* 6. Gravar no portal (mensagem pública: só números) */
  const msg = 'Sincronização com o ERP Primavera: ' + S.alteracoes.length + (S.alteracoes.length === 1 ? ' alteração' : ' alterações') + ', ' + dv.length + (dv.length === 1 ? ' diferença' : ' diferenças') + '\n\n' +
    'Contas no ERP: ' + Object.keys(erp.users).length + ' (' + nAct + ' activas). Detalhe nas folhas «Alterações» e «Diferenças ERP» da matriz cifrada.';
  for (let tent = 1; tent <= 3; tent++) {
    try {
      const res = await MA.publicar(token, [
        { path: MA.REPO.ficheiro, content: JSON.stringify(enc) },
        { path: MA.REPO.resumo, content: MA.ficheiroResumo(R) }
      ], msg, sha);
      log('Gravado no portal (commit ' + res.commit.slice(0, 7) + ').');
      return;
    } catch (e) {
      if (e.message === 'conflito') falha('a matriz foi alterada no portal durante a sincronização; volta a ser lida na próxima execução');
      if (tent === 3 || e.status === 401 || e.status === 403) falha('não foi possível gravar no portal', e);
      log('Tentativa ' + tent + ' falhou (' + (e.status || e.message) + '); a repetir.');
      await new Promise((r) => setTimeout(r, 5000 * tent));
    }
  }
})().catch((e) => falha('erro inesperado', e));
