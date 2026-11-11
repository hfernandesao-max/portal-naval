/* Repositório em memória com o mesmo contrato do priempre.js, para testes e para o modo --simular. */
'use strict';
module.exports = function memoria(estado) {
  const S = JSON.parse(JSON.stringify(estado)); // { utilizadores: [...], permissoes: [...], perfis: [...] }
  const k = (s) => String(s).toLowerCase();
  return {
    estado: () => S,
    async utilizadores() { return S.utilizadores.map((u) => ({ ...u })); },
    async permissoes(codigos, empresas) {
      const c = new Set(codigos.map(k)), e = new Set(empresas.map((x) => String(x).toUpperCase()));
      return S.permissoes.filter((p) => c.has(k(p.utilizador)) && e.has(String(p.empresa).toUpperCase())).map((p) => ({ ...p }));
    },
    async perfisExistentes(codigos) { const p = new Set(S.perfis.map((x) => x.toUpperCase())); return codigos.filter((x) => p.has(x.toUpperCase())); },
    async transaccao(f) {
      const copia = JSON.stringify(S);
      const tx = {
        inserir: async (u, p, e) => { if (!S.permissoes.some((x) => k(x.utilizador) === k(u) && x.perfil.toUpperCase() === String(p).toUpperCase() && x.empresa.toUpperCase() === String(e).toUpperCase())) S.permissoes.push({ utilizador: u, perfil: p, empresa: e }); },
        apagar: async (u, p, e) => { S.permissoes = S.permissoes.filter((x) => !(k(x.utilizador) === k(u) && x.perfil.toUpperCase() === String(p).toUpperCase() && x.empresa.toUpperCase() === String(e).toUpperCase())); },
        activo: async (u, v) => { const x = S.utilizadores.find((y) => k(y.codigo) === k(u)); if (x) x.activo = v; }
      };
      try { await f(tx); } catch (e) { Object.assign(S, JSON.parse(copia)); throw e; }
    }
  };
};
