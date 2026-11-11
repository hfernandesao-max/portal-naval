#!/usr/bin/env node
/* Agente do Gestor de Acessos. Corre num servidor da rede do Grupo Naval, por tarefa agendada (ex.: de 5 em 5 minutos).
   Em cada execução:
   1. lê os pedidos cifrados do portal (GitHub);
   2. para cada pedido aprovado, confirma no GitHub quem deu cada passo e que o conteúdo é o aprovado;
   3. executa na cópia de testes; depois da ordem de produção, executa em produção, com cópia de segurança local;
   4. abre e fecha os acessos temporários no prazo;
   5. grava no portal o resultado (cifrado) e o resumo público (só números).
   Só faz ligações de saída: SQL Server na rede e https://api.github.com.

   Variáveis de ambiente (o executar.ps1 lê-as do ficheiro protegido pelo Windows):
     GITHUB_TOKEN        token fine-grained da conta do agente: só portal-naval, Contents: Read and write
     MATRIZ_SENHA        palavra-passe da matriz (a mesma cifra os pedidos)
     PRI_TESTES_SERVIDOR, PRI_TESTES_BD, PRI_TESTES_UTILIZADOR, PRI_TESTES_SENHA
     PRI_PRODUCAO_SERVIDOR, PRI_PRODUCAO_BD, PRI_PRODUCAO_UTILIZADOR, PRI_PRODUCAO_SENHA
   Opções:
     --simular <estado.json>  usa um Primavera em memória (testes de instalação) e não grava no portal */
'use strict';
const fs = require('fs');
const path = require('path');
const MA = require('../matriz-acessos.js');
const GA = require('../gestor-acessos.js');
const fluxo = require('./fluxo.js');

const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : null; };
const DIR = __dirname, LOGS = path.join(DIR, 'registos'), COPIAS = path.join(DIR, 'copias'), DIARIO = path.join(DIR, 'registos', 'diario.json');
const lerJSON = (f, d) => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d;
const cfg = Object.assign({}, lerJSON(path.join(DIR, 'config.json'), {}), lerJSON(path.join(DIR, 'config.local.json'), {}));
fs.mkdirSync(LOGS, { recursive: true }); fs.mkdirSync(COPIAS, { recursive: true });
const ficheiroLog = path.join(LOGS, 'agente-' + MA.hoje().iso.slice(0, 7) + '.log');
const log = (m) => { const l = new Date().toISOString().replace('T', ' ').slice(0, 19) + '  ' + m; console.log(l); fs.appendFileSync(ficheiroLog, l + '\n'); };
const falha = (m, e) => { log('ERRO: ' + m + (e ? ' (' + (e.status ? 'HTTP ' + e.status + ' ' : '') + (e.detalhe || e.message || e) + ')' : '')); process.exit(1); };
const env = (n) => { const v = process.env[n]; if (!v) falha('falta a variável ' + n); return v; };

(async () => {
  const SIM = opt('--simular');
  const token = env('GITHUB_TOKEN'), senha = env('MATRIZ_SENHA');
  let F;
  try { F = await GA.ler(token, senha); } catch (e) { falha(e.message === 'senha' ? 'palavra-passe errada' : 'não foi possível ler os pedidos do portal', e); }

  const repos = {};
  const repo = async (amb) => {
    if (repos[amb]) return repos[amb];
    if (SIM) return (repos[amb] = require('./memoria.js')(lerJSON(SIM)));
    const P = 'PRI_' + amb.toUpperCase() + '_';
    return (repos[amb] = await require('./priempre.js')({ servidor: env(P + 'SERVIDOR'), bd: process.env[P + 'BD'] || 'PRIEMPRE', utilizador: env(P + 'UTILIZADOR'), senha: env(P + 'SENHA') }));
  };
  const diario = lerJSON(DIARIO, {});
  const d = {
    cfg, diario, repo, agora: () => new Date(),
    gh: { lerEvento: (id, ev) => GA.lerEvento(token, id, ev), autorEvento: (id, ev) => GA.autorEvento(token, id, ev) },
    guardarCopia: (id, c) => fs.writeFileSync(path.join(COPIAS, id + '.json'), JSON.stringify(c, null, 1)),
    lerCopia: (id) => lerJSON(path.join(COPIAS, id + '.json'), null)
  };

  const { novos, log: linhas } = await fluxo.passo(d, F.D);
  linhas.forEach(log);
  for (const r of Object.values(repos)) if (r.fechar) await r.fechar();
  if (!SIM) fs.writeFileSync(DIARIO, JSON.stringify(diario, null, 1)); // o diário fica sempre no servidor
  if (!novos.length) { log('Sem pedidos para executar.'); return; }
  if (SIM) { log('Modo de simulação: ' + novos.length + ' evento(s), nada gravado no portal.'); return; }

  const msg = 'Gestor de acessos: ' + novos.length + (novos.length === 1 ? ' resultado' : ' resultados') + ' do agente';
  try {
    await GA.alterar(token, senha, (D) => {
      novos.forEach((n) => { const p = D.pedidos.find((x) => x.id === n.id); if (p && !p.h.some((e) => GA.canon(e) === GA.canon(n.e))) p.h.push(n.e); });
      return [];
    }, msg);
    log('Gravado no portal: ' + novos.length + ' evento(s).');
  } catch (e) { falha('executado no Primavera, mas não foi possível gravar o resultado no portal (fica no diário local)', e); }
})().catch((e) => falha('erro inesperado', e));
