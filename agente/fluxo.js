/* Decide o que o agente faz em cada pedido e confirma, antes de escrever no Primavera, que cada passo
   foi dado por quem o podia dar. Fontes de verdade:
   - os marcadores de eventos no GitHub (autor do commit = quem fez o passo; hash = o que foi aprovado);
   - o diário local do agente (o que ele próprio executou), guardado no servidor e nunca no portal.
   O ficheiro de pedidos do portal serve para mostrar o estado; o agente não confia nele para decidir. */
'use strict';
const GA = require('../gestor-acessos.js');
const ex = require('./executor.js');

const lc = (s) => String(s || '').toLowerCase();

/* d = { gh: { lerEvento(id, ev), autorEvento(id, ev) }, repo(ambiente) → repositório, diario, cfg, agora() , guardarCopia(id, copia), lerCopia(id) } */
async function verificar(d, p, etapa) {
  const h = await GA.hash(p);
  if (h !== p.hash) return 'o conteúdo do pedido não corresponde à impressão digital registada';
  const ev = async (nome) => {
    const m = await d.gh.lerEvento(p.id, nome);
    if (!m) return { erro: 'falta o marcador «' + nome + '»' };
    if (m.hash !== h) return { erro: 'o marcador «' + nome + '» é de outra versão do pedido' };
    const autor = await d.gh.autorEvento(p.id, nome);
    if (!autor) return { erro: 'não foi possível saber quem deu o passo «' + nome + '»' };
    return { autor: lc(autor) };
  };
  const pedido = await ev('pedido'); if (pedido.erro) return pedido.erro;
  const rej = await d.gh.lerEvento(p.id, 'rejeicao'); if (rej) return 'o pedido foi rejeitado';
  const apr = await ev('aprovacao'); if (apr.erro) return apr.erro;
  const aprovadores = (d.cfg.aprovadores || []).map(lc);
  if (aprovadores.indexOf(apr.autor) < 0) return 'quem aprovou (' + apr.autor + ') não está na lista de aprovadores';
  if (apr.autor === pedido.autor) return 'quem pediu não pode aprovar o próprio pedido';
  if (etapa === 'producao' || etapa === 'reverter') {
    const o = await ev(etapa); if (o.erro) return o.erro;
    const executores = (d.cfg.executores || []).map(lc);
    if (executores.indexOf(o.autor) < 0) return 'quem deu a ordem (' + o.autor + ') não está na lista de executores';
    if (o.autor === apr.autor) return 'quem aprovou não pode dar a ordem de produção';
  }
  if (etapa === 'fechar') {
    const o = await ev('fechar'); if (o.erro) return o.erro;
    const pode = (d.cfg.executores || []).map(lc).concat(pedido.autor, apr.autor);
    if (pode.indexOf(o.autor) < 0) return 'quem pediu o fecho não pode fechar este acesso';
  }
  return null;
}

/* Uma passagem: devolve os eventos a acrescentar ao ficheiro de pedidos ({ id, e }) e actualiza o diário. */
async function passo(d, D) {
  const novos = [], log = [];
  const marca = (p, e) => novos.push({ id: p.id, e: Object.assign({ em: d.agora().toISOString(), por: 'agente' }, e) });
  const fazer = async (p, etapa, f) => {
    const erro = await verificar(d, p, etapa);
    if (erro) {
      const j = d.diario[p.id] = d.diario[p.id] || {};
      if (j.recusa !== etapa + ':' + erro) { j.recusa = etapa + ':' + erro; marca(p, { t: 'aviso', nota: 'O agente não executou: ' + erro + '.' }); log.push(p.id + ' recusado (' + etapa + '): ' + erro); }
      return;
    }
    try { await f(); } catch (e) { log.push(p.id + ' erro (' + etapa + '): ' + e.message); throw e; }
  };
  for (const p of D.pedidos) {
    const j = d.diario[p.id] = d.diario[p.id] || {};
    const tem = async (ev) => !!(await d.gh.lerEvento(p.id, ev));
    try {
      if (p.tipo === 'matriz') {
        if (!j.testes && await tem('aprovacao')) {
          await fazer(p, 'testes', async () => {
            let r;
            try { r = await ex.executarMatriz(await d.repo('testes'), p.conteudo, d.cfg); } catch (e) { r = { ok: false, erro: e.message }; }
            j.testes = { ok: r.ok, hash: p.hash, em: d.agora().toISOString() };
            marca(p, { t: 'testes', ok: r.ok, ambiente: 'testes', resumo: r.resumo || null, nota: r.erro || (r.ok ? 'Cópia de testes actualizada e verificada.' : 'A verificação encontrou diferenças depois de aplicar.') });
            log.push(p.id + ' testes: ' + (r.ok ? 'ok' : 'falhou'));
          });
        } else if (j.testes && j.testes.ok && j.testes.hash === p.hash && !j.producao && await tem('producao')) {
          await fazer(p, 'producao', async () => {
            let r;
            try { r = await ex.executarMatriz(await d.repo('producao'), p.conteudo, d.cfg); } catch (e) { r = { ok: false, erro: e.message }; }
            if (r.copia) d.guardarCopia(p.id, r.copia);
            j.producao = { ok: r.ok, hash: p.hash, em: d.agora().toISOString() };
            marca(p, { t: 'execucao', ok: r.ok, ambiente: 'producao', resumo: r.resumo || null, nota: r.erro || (r.ok ? 'Produção actualizada e verificada. Cópia de segurança guardada no servidor.' : 'A verificação encontrou diferenças depois de aplicar.') });
            log.push(p.id + ' produção: ' + (r.ok ? 'ok' : 'falhou'));
          });
        } else if (j.producao && j.producao.ok && !j.revertido && await tem('reverter')) {
          await fazer(p, 'reverter', async () => {
            const copia = d.lerCopia(p.id);
            if (!copia) throw new Error('não há cópia de segurança deste pedido no servidor');
            const r = await ex.reverter(await d.repo('producao'), copia, d.cfg);
            j.revertido = { em: d.agora().toISOString() };
            marca(p, { t: 'revertido', ok: true, ambiente: 'producao', nota: r.alteracoes + ' alteração(ões) desfeitas a partir da cópia de segurança.' });
            log.push(p.id + ' revertido');
          });
        }
      } else if (p.tipo === 'jit') {
        const c = p.conteudo;
        if (!j.aberto && await tem('aprovacao')) {
          await fazer(p, 'jit', async () => {
            const horas = Math.min(Math.max(1, +c.horas || 1), d.cfg.jitHorasMax || 8);
            const r = await ex.jit(await d.repo('producao'), c.conta, true, d.cfg);
            const fim = new Date(d.agora().getTime() + horas * 3600e3).toISOString();
            j.aberto = { em: d.agora().toISOString(), fim, ok: r.ok };
            marca(p, { t: 'jit-aberto', ok: r.ok, fim, nota: 'Conta activada no Primavera até ' + fim.slice(0, 16).replace('T', ' ') + ' (UTC).' });
            log.push(p.id + ' acesso aberto');
          });
        } else if (j.aberto && !j.fechado) {
          const expirou = d.agora().toISOString() >= j.aberto.fim;
          const pedidoFecho = !expirou && await tem('fechar') && !(await verificar(d, p, 'fechar'));
          if (expirou || pedidoFecho) {
            const r = await ex.jit(await d.repo('producao'), c.conta, false, d.cfg);
            j.fechado = { em: d.agora().toISOString(), motivo: expirou ? 'prazo' : 'pedido' };
            marca(p, { t: 'jit-fechado', ok: r.ok, nota: expirou ? 'Fechado automaticamente no fim do prazo.' : 'Fechado antes do prazo, a pedido.' });
            log.push(p.id + ' acesso fechado');
          }
        }
      }
    } catch (e) { /* já registado; continua nos outros pedidos */ }
  }
  return { novos, log };
}

module.exports = { verificar, passo };
