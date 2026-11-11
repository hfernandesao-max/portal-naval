/* Execução no Primavera (PRIEMPRE) dos pedidos aprovados. Não depende do SQL Server: recebe um repositório
   com estas operações (ver priempre.js para o real e memoria.js para os testes):
     utilizadores()                   → [{ codigo, activo, perfilPessoal }]
     permissoes(codigos, empresas)    → [{ utilizador, perfil, empresa }]
     perfisExistentes(codigos)        → [codigo]
     transaccao(async tx => { tx.inserir(u, perfil, empresa); tx.apagar(u, perfil, empresa); tx.activo(u, bool) })

   O que escreve, e só isto: Permissoes (atribuir e retirar perfis geridos) e Utilizadores.Activo.
   Nunca escreve Perfis, operações dos perfis, licenciamento (tabelas com hash) nem palavras-passe.
   Contas novas criam-se no Administrador; contas inactivas nunca são reactivadas pela matriz. */
'use strict';
const GA = require('../gestor-acessos.js');

const k = (s) => String(s == null ? '' : s).trim().toLowerCase();
const par = (u, p, e) => k(u) + '|' + String(p).toUpperCase() + '|' + String(e).toUpperCase();

/* cfg: { empresas: { CABECALHO_MATRIZ: 'CODIGO_PRIMAVERA' }, legados: [..], retirarPerfilPessoal, aliases: { login: codigo }, contasJit: [..] } */
function contexto(cfg) {
  const catalogo = new Set(GA.perfisCatalogo().map((x) => x.toUpperCase()));
  const legados = new Set((cfg.legados || []).map((x) => String(x).toUpperCase()));
  const emp = (h) => String((cfg.empresas || {})[h] || h).toUpperCase();
  const gerido = (perfil, pessoal) => {
    const p = String(perfil).toUpperCase();
    return catalogo.has(p) || legados.has(p) || (cfg.retirarPerfilPessoal && pessoal && p === String(pessoal).toUpperCase());
  };
  return { catalogo, emp, gerido };
}

function procurarConta(us, login, cfg) {
  const alvo = k((cfg.aliases || {})[login] || (cfg.aliases || {})[k(login)] || login);
  const r = us.filter((u) => k(u.codigo) === alvo);
  if (r.length > 1) throw new Error('Há mais de uma conta ' + alvo + ' no Primavera; use um alias na configuração.');
  return r[0] || null;
}

function desejado(conta, cx) {
  const out = new Set();
  if (conta.accao !== 'aplicar') return out;
  conta.empresas.forEach((h) => {
    const e = cx.emp(h);
    Object.keys(conta.modulos || {}).forEach((m) => { const p = GA.codigoPerfil(m, conta.modulos[m]); if (p) out.add(par('', p, e).slice(1)); });
    if (conta.credito) out.add(par('', GA.DOC_CREDITO, e).slice(1));
  });
  return out; // 'PERFIL|EMPRESA'
}

/* Plano: o que muda em cada conta. Não escreve nada. */
async function planear(repo, contas, cfg) {
  const cx = contexto(cfg);
  const us = await repo.utilizadores();
  const empresasGeridas = Object.values(cfg.empresas || {}).length ? [...new Set(Object.keys(cfg.empresas).map(cx.emp))] : null;
  const faltam = [], linhas = [];
  for (const c of contas) {
    const u = procurarConta(us, c.login, cfg);
    if (!u) { faltam.push(c.login); continue; }
    linhas.push({ c, u });
  }
  if (faltam.length) throw new Error('Contas que não existem no Primavera: ' + faltam.join(', ') + '. Crie-as no Administrador e volte a pedir.');
  const empresasDoPedido = new Set();
  contas.forEach((c) => c.empresas.forEach((h) => empresasDoPedido.add(cx.emp(h))));
  const empresas = empresasGeridas || [...empresasDoPedido];
  const actuais = await repo.permissoes(linhas.map((l) => l.u.codigo), empresas);
  const plano = [];
  for (const { c, u } of linhas) {
    const meus = actuais.filter((r) => k(r.utilizador) === k(u.codigo));
    const orig = new Map(meus.filter((r) => cx.gerido(r.perfil, u.perfilPessoal)).map((r) => [String(r.perfil).toUpperCase() + '|' + String(r.empresa).toUpperCase(), String(r.perfil) + '|' + String(r.empresa)]));
    const geridos = new Set(orig.keys());
    const item = { login: c.login, codigo: u.codigo, activoAntes: !!u.activo, paresAntes: [...orig.values()].sort(), inserir: [], apagar: [], desactivar: false, nota: null };
    if (c.accao === 'desactivar') {
      item.desactivar = !!u.activo;
      if (!u.activo) item.nota = 'Já estava inactiva';
    } else if (!u.activo) {
      item.nota = 'Inactiva no Primavera: a matriz não reactiva contas';
    } else {
      const alvo = desejado(c, cx);
      item.inserir = [...alvo].filter((x) => !geridos.has(x)).sort();
      item.apagar = [...geridos].filter((x) => !alvo.has(x)).map((x) => orig.get(x)).sort();
    }
    plano.push(item);
  }
  const precisos = [...new Set(plano.flatMap((i) => i.inserir.map((x) => x.split('|')[0])))];
  if (precisos.length) {
    const existem = new Set((await repo.perfisExistentes(precisos)).map((x) => String(x).toUpperCase()));
    const emFalta = precisos.filter((p) => !existem.has(p));
    if (emFalta.length) throw new Error('Perfis que ainda não existem no Primavera: ' + emFalta.join(', ') + '. Crie-os no Administrador (script 04) antes de executar.');
  }
  return plano;
}

/* Executa um pedido de matriz numa transacção. Devolve a cópia de segurança (para reverter) e o resultado verificado. */
async function executarMatriz(repo, conteudo, cfg) {
  const plano = await planear(repo, conteudo.contas, cfg);
  const copia = plano.map((i) => ({ login: i.login, codigo: i.codigo, activo: i.activoAntes, pares: i.paresAntes }));
  await repo.transaccao(async (tx) => {
    for (const i of plano) {
      for (const x of i.apagar) { const [p, e] = x.split('|'); await tx.apagar(i.codigo, p, e); }
      for (const x of i.inserir) { const [p, e] = x.split('|'); await tx.inserir(i.codigo, p, e); }
      if (i.desactivar) await tx.activo(i.codigo, false);
    }
  });
  // verificação: volta a ler e confirma que não falta nem sobra nada
  const depois = await planear(repo, conteudo.contas, cfg);
  const pendentes = depois.filter((i) => i.inserir.length || i.apagar.length || i.desactivar);
  const resumo = {
    contas: plano.length,
    atribuidos: plano.reduce((s, i) => s + i.inserir.length, 0),
    retirados: plano.reduce((s, i) => s + i.apagar.length, 0),
    desactivadas: plano.filter((i) => i.desactivar).length,
    semAlteracao: plano.filter((i) => !i.inserir.length && !i.apagar.length && !i.desactivar).length,
    diferencasDepois: pendentes.length
  };
  return { ok: pendentes.length === 0, resumo, copia, plano };
}

/* Repõe o estado guardado antes da execução */
async function reverter(repo, copia, cfg) {
  const cx = contexto(cfg);
  const us = await repo.utilizadores();
  const empresas = [...new Set(copia.flatMap((c) => c.pares.map((x) => x.split('|')[1])).concat(Object.keys(cfg.empresas || {}).map(cx.emp)))];
  const actuais = await repo.permissoes(copia.map((c) => c.codigo), empresas);
  let n = 0;
  await repo.transaccao(async (tx) => {
    for (const c of copia) {
      const u = us.find((x) => k(x.codigo) === k(c.codigo));
      if (!u) continue;
      const U = (x) => x.toUpperCase();
      const agora = actuais.filter((r) => k(r.utilizador) === k(c.codigo) && cx.gerido(r.perfil, u.perfilPessoal)).map((r) => r.perfil + '|' + r.empresa);
      const sa = new Set(agora.map(U)), sb = new Set(c.pares.map(U));
      for (const x of agora) if (!sb.has(U(x))) { const [p, e] = x.split('|'); await tx.apagar(c.codigo, p, e); n++; }
      for (const x of c.pares) if (!sa.has(U(x))) { const [p, e] = x.split('|'); await tx.inserir(c.codigo, p, e); n++; }
      if (!!u.activo !== !!c.activo) { await tx.activo(c.codigo, !!c.activo); n++; }
    }
  });
  return { ok: true, alteracoes: n };
}

/* Acesso temporário: só contas da lista contasJit (ex.: a conta do técnico, com perfil de Administrador já
   definido no Primavera e inactiva por defeito). Abrir = activar; fechar = desactivar. */
async function jit(repo, conta, abrir, cfg) {
  const permitidas = (cfg.contasJit || []).map(k);
  if (permitidas.indexOf(k(conta)) < 0) throw new Error('A conta ' + conta + ' não está na lista de contas de acesso temporário (contasJit).');
  const u = procurarConta(await repo.utilizadores(), conta, cfg);
  if (!u) throw new Error('A conta ' + conta + ' não existe no Primavera.');
  await repo.transaccao(async (tx) => { await tx.activo(u.codigo, abrir); });
  const v = procurarConta(await repo.utilizadores(), conta, cfg);
  return { ok: !!v.activo === abrir };
}

module.exports = { planear, executarMatriz, reverter, jit };
