'use strict';
const test = require('node:test');
const assert = require('node:assert');
const GA = require('../../gestor-acessos.js');
const ex = require('../executor.js');
const fluxo = require('../fluxo.js');
const memoria = require('../memoria.js');

const cfg = {
  empresas: { GERAL: 'GERAL', VISTAR: 'VISTAR', OCEANO: 'OCEANO' },
  legados: ['VND_RD_01', 'Geral'], retirarPerfilPessoal: true,
  aprovadores: ['aprovador-x'], executores: ['requerente-x'], contasJit: ['tecnico.pri'], jitHorasMax: 8
};
const base = () => ({
  utilizadores: [
    { codigo: 'ana.silva', activo: true, perfilPessoal: 'ANA' },
    { codigo: 'rui.costa', activo: true, perfilPessoal: null },
    { codigo: 'saiu', activo: true, perfilPessoal: null },
    { codigo: 'parado', activo: false, perfilPessoal: null },
    { codigo: 'tecnico.pri', activo: false, perfilPessoal: null }
  ],
  permissoes: [
    { utilizador: 'ana.silva', perfil: 'Geral', empresa: 'GERAL' },
    { utilizador: 'ana.silva', perfil: 'ANA', empresa: 'GERAL' },
    { utilizador: 'ana.silva', perfil: 'COP_X', empresa: 'GERAL' },   // fora do catálogo: fica
    { utilizador: 'rui.costa', perfil: 'VND_RD_01', empresa: 'VISTAR' },
    { utilizador: 'rui.costa', perfil: 'CMP_WR_02', empresa: 'TESTE1' }  // empresa fora do âmbito: fica
  ],
  perfis: GA.perfisCatalogo().concat(['Geral', 'VND_RD_01', 'ANA', 'COP_X'])
});
const contas = [
  { login: 'Ana.Silva', accao: 'aplicar', empresas: ['GERAL', 'VISTAR'], modulos: { 'Vendas': 'Total', 'Tesouraria': 'Consulta' }, credito: true },
  { login: 'rui.costa', accao: 'aplicar', empresas: ['VISTAR'], modulos: { 'Compras': 'Consulta' }, credito: false },
  { login: 'saiu', accao: 'desactivar', empresas: [], modulos: {}, credito: false },
  { login: 'parado', accao: 'aplicar', empresas: ['GERAL'], modulos: { 'Vendas': 'Consulta' }, credito: false }
];
const pares = (S, u) => S.permissoes.filter((p) => p.utilizador === u).map((p) => p.perfil + '@' + p.empresa).sort();

test('aplica a matriz, retira legados e pessoais, não toca no que não é gerido, verifica e reverte', async () => {
  const repo = memoria(base());
  const r = await ex.executarMatriz(repo, { contas }, cfg);
  assert.ok(r.ok, JSON.stringify(r.resumo));
  const S = repo.estado();
  assert.deepStrictEqual(pares(S, 'ana.silva'), ['BNC_RD_02@GERAL', 'BNC_RD_02@VISTAR', 'COP_X@GERAL', 'VND_NC_02@GERAL', 'VND_NC_02@VISTAR', 'VND_WR_02@GERAL', 'VND_WR_02@VISTAR']);
  assert.deepStrictEqual(pares(S, 'rui.costa'), ['CMP_RD_02@VISTAR', 'CMP_WR_02@TESTE1']);
  assert.strictEqual(S.utilizadores.find((u) => u.codigo === 'saiu').activo, false);
  assert.strictEqual(S.utilizadores.find((u) => u.codigo === 'parado').activo, false, 'nunca reactiva');
  assert.strictEqual(r.resumo.desactivadas, 1);

  await ex.reverter(repo, r.copia, cfg);
  assert.deepStrictEqual(repo.estado().permissoes.map((p) => p.utilizador + p.perfil + p.empresa).sort(), base().permissoes.map((p) => p.utilizador + p.perfil + p.empresa).sort());
  assert.strictEqual(repo.estado().utilizadores.find((u) => u.codigo === 'saiu').activo, true);
});

test('recusa antes de escrever quando falta uma conta ou um perfil', async () => {
  const repo = memoria(base());
  await assert.rejects(ex.executarMatriz(repo, { contas: [{ login: 'novo.x', accao: 'aplicar', empresas: ['GERAL'], modulos: { 'Vendas': 'Total' } }] }, cfg), /Crie-as no Administrador/);
  const sem = base(); sem.perfis = sem.perfis.filter((p) => p !== 'VND_WR_02');
  const r2 = memoria(sem);
  await assert.rejects(ex.executarMatriz(r2, { contas }, cfg), /VND_WR_02/);
  assert.deepStrictEqual(r2.estado().permissoes, sem.permissoes, 'nada foi escrito');
});

/* GitHub simulado: marcadores com autor */
function github(marcadores) {
  return {
    lerEvento: async (id, ev) => marcadores[id + '.' + ev] ? { id, evento: ev, hash: marcadores[id + '.' + ev].hash } : null,
    autorEvento: async (id, ev) => marcadores[id + '.' + ev] ? marcadores[id + '.' + ev].autor : null
  };
}
async function cenario() {
  const D = GA.vazio();
  await GA.criarPedido(D, 'matriz', 'Aplicar matriz', { contas }, 'Requerente');
  const p = D.pedidos[0];
  const repos = { testes: memoria(base()), producao: memoria(base()) };
  const copias = {};
  const M = { [p.id + '.pedido']: { hash: p.hash, autor: 'requerente-x' } };
  const d = { cfg, diario: {}, repo: async (a) => repos[a], agora: () => new Date('2026-11-12T10:00:00Z'), gh: github(M), guardarCopia: (id, c) => { copias[id] = c; }, lerCopia: (id) => copias[id] };
  return { D, p, repos, M, d };
}

test('fluxo: aprovação de outra pessoa → testes → ordem de produção → produção → reversão', async () => {
  const { D, p, repos, M, d } = await cenario();
  let r = await fluxo.passo(d, D);
  assert.strictEqual(r.novos.length, 0, 'sem aprovação não faz nada');

  M[p.id + '.aprovacao'] = { hash: p.hash, autor: 'aprovador-x' };
  r = await fluxo.passo(d, D);
  assert.deepStrictEqual(r.novos.map((n) => n.e.t), ['testes']);
  assert.ok(r.novos[0].e.ok);
  assert.deepStrictEqual(pares(repos.producao.estado(), 'rui.costa'), ['CMP_WR_02@TESTE1', 'VND_RD_01@VISTAR'], 'produção intacta');

  M[p.id + '.producao'] = { hash: p.hash, autor: 'requerente-x' };
  r = await fluxo.passo(d, D);
  assert.deepStrictEqual(r.novos.map((n) => n.e.t), ['execucao']);
  assert.deepStrictEqual(pares(repos.producao.estado(), 'rui.costa'), ['CMP_RD_02@VISTAR', 'CMP_WR_02@TESTE1']);

  r = await fluxo.passo(d, D);
  assert.strictEqual(r.novos.length, 0, 'não executa duas vezes');

  M[p.id + '.reverter'] = { hash: p.hash, autor: 'requerente-x' };
  r = await fluxo.passo(d, D);
  assert.deepStrictEqual(r.novos.map((n) => n.e.t), ['revertido']);
  assert.deepStrictEqual(pares(repos.producao.estado(), 'rui.costa'), ['CMP_WR_02@TESTE1', 'VND_RD_01@VISTAR']);
});

test('fluxo: recusa auto-aprovação, aprovador desconhecido, conteúdo alterado e produção dada por quem aprovou', async () => {
  let c = await cenario();
  c.M[c.p.id + '.aprovacao'] = { hash: c.p.hash, autor: 'requerente-x' };
  c.d.cfg = Object.assign({}, cfg, { aprovadores: ['requerente-x'] });
  let r = await fluxo.passo(c.d, c.D);
  assert.match(r.log[0], /quem pediu não pode aprovar/);

  c = await cenario();
  c.M[c.p.id + '.aprovacao'] = { hash: c.p.hash, autor: 'intruso' };
  r = await fluxo.passo(c.d, c.D);
  assert.match(r.log[0], /não está na lista de aprovadores/);

  c = await cenario();
  c.M[c.p.id + '.aprovacao'] = { hash: c.p.hash, autor: 'aprovador-x' };
  c.p.conteudo.contas[1].modulos['Compras'] = 'Total'; // alterado depois de aprovado
  r = await fluxo.passo(c.d, c.D);
  assert.match(r.log[0], /impressão digital/);
  assert.deepStrictEqual(pares(c.repos.testes.estado(), 'rui.costa'), ['CMP_WR_02@TESTE1', 'VND_RD_01@VISTAR']);

  c = await cenario();
  c.M[c.p.id + '.aprovacao'] = { hash: c.p.hash, autor: 'aprovador-x' };
  await fluxo.passo(c.d, c.D);
  c.M[c.p.id + '.producao'] = { hash: c.p.hash, autor: 'aprovador-x' };
  c.d.cfg = Object.assign({}, cfg, { executores: ['aprovador-x'] });
  r = await fluxo.passo(c.d, c.D);
  assert.match(r.log[0], /quem aprovou não pode dar a ordem/);
});

test('acesso temporário abre com aprovação e fecha sozinho no fim do prazo', async () => {
  const D = GA.vazio();
  await GA.criarPedido(D, 'jit', 'Acesso temporário', { conta: 'tecnico.pri', horas: 2, motivo: 'actualização', ticket: 'INC-1' }, 'Requerente');
  const p = D.pedidos[0];
  const prod = memoria(base());
  let agora = new Date('2026-11-12T10:00:00Z');
  const M = { [p.id + '.pedido']: { hash: p.hash, autor: 'requerente-x' }, [p.id + '.aprovacao']: { hash: p.hash, autor: 'aprovador-x' } };
  const d = { cfg, diario: {}, repo: async () => prod, agora: () => agora, gh: github(M), guardarCopia() {}, lerCopia() {} };
  let r = await fluxo.passo(d, D);
  assert.deepStrictEqual(r.novos.map((n) => n.e.t), ['jit-aberto']);
  assert.strictEqual(prod.estado().utilizadores.find((u) => u.codigo === 'tecnico.pri').activo, true);
  agora = new Date('2026-11-12T11:00:00Z');
  assert.strictEqual((await fluxo.passo(d, D)).novos.length, 0);
  agora = new Date('2026-11-12T12:00:01Z');
  r = await fluxo.passo(d, D);
  assert.deepStrictEqual(r.novos.map((n) => n.e.t), ['jit-fechado']);
  assert.strictEqual(prod.estado().utilizadores.find((u) => u.codigo === 'tecnico.pri').activo, false);
  await assert.rejects(ex.jit(prod, 'ana.silva', true, cfg), /contasJit/);
});

test('cifra e funde pedidos gravados ao mesmo tempo pelo portal e pelo agente', async () => {
  const MA = require('../../matriz-acessos.js');
  const D = GA.vazio();
  await GA.criarPedido(D, 'matriz', 'x', { contas: [] }, 'H');
  const a = JSON.parse(JSON.stringify(D)), b = JSON.parse(JSON.stringify(D));
  GA.registar(a, D.pedidos[0].id, 'aprovacao', 'V');
  b.pedidos[0].h.push({ t: 'testes', ok: true, em: '2999-01-01T00:00:00Z', por: 'agente' });
  const f = GA.fundir(a, b);
  assert.deepStrictEqual(f.pedidos[0].h.map((e) => e.t), ['pedido', 'aprovacao', 'testes']);
  assert.strictEqual(GA.estado(f.pedidos[0]), 'testado');
  const enc = await MA.cifrar(f, 'segredo-de-teste');
  assert.deepStrictEqual(await MA.decifrarTexto(enc, 'segredo-de-teste'), f);
  assert.ok(!JSON.stringify(GA.resumo(f)).includes('H'), 'resumo público sem nomes');
});
