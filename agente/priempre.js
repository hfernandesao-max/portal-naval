/* Repositório real: base PRIEMPRE no SQL Server, com uma conta de serviço que só tem
   SELECT em Utilizadores, Permissoes e Perfis, INSERT/DELETE em Permissoes e UPDATE(Activo) em Utilizadores
   (ver LEIA-ME.md). Cada execução corre numa única transacção. */
'use strict';
module.exports = async function priempre(ligacao) {
  const sql = require('mssql');
  const [srv, porta] = String(ligacao.servidor).split(',');
  const [host, instancia] = srv.split('\\');
  const pool = await sql.connect({
    server: host, port: porta ? +porta : undefined, database: ligacao.bd || 'PRIEMPRE',
    user: ligacao.utilizador, password: ligacao.senha,
    options: { instanceName: instancia || undefined, encrypt: ligacao.encriptar !== false, trustServerCertificate: ligacao.confiarCertificado !== false, appName: 'Portal Naval - gestor de acessos' },
    requestTimeout: 120000
  });
  const lista = (req, nome, valores) => valores.map((v, i) => { req.input(nome + i, sql.NVarChar, String(v)); return '@' + nome + i; }).join(',');
  return {
    fechar: () => pool.close(),
    async utilizadores() {
      const r = await pool.request().query('SELECT Codigo, Activo, PerfilSugerido FROM Utilizadores');
      return r.recordset.map((u) => ({ codigo: String(u.Codigo).trim(), activo: !!u.Activo, perfilPessoal: u.PerfilSugerido ? String(u.PerfilSugerido).trim() : null }));
    },
    async permissoes(codigos, empresas) {
      if (!codigos.length || !empresas.length) return [];
      const req = pool.request();
      const q = 'SELECT Utilizador, Perfil, Empresa FROM Permissoes WHERE Utilizador IN (' + lista(req, 'u', codigos) + ') AND Empresa IN (' + lista(req, 'e', empresas) + ')';
      return (await req.query(q)).recordset.map((p) => ({ utilizador: String(p.Utilizador).trim(), perfil: String(p.Perfil).trim(), empresa: String(p.Empresa).trim() }));
    },
    async perfisExistentes(codigos) {
      if (!codigos.length) return [];
      const req = pool.request();
      return (await req.query('SELECT Codigo FROM Perfis WHERE Codigo IN (' + lista(req, 'p', codigos) + ')')).recordset.map((p) => String(p.Codigo).trim());
    },
    async transaccao(f) {
      const tx = new sql.Transaction(pool);
      await tx.begin();
      const r = () => new sql.Request(tx);
      try {
        await f({
          inserir: (u, p, e) => r().input('u', sql.NVarChar, u).input('p', sql.NVarChar, p).input('e', sql.NVarChar, e)
            .query('IF NOT EXISTS (SELECT 1 FROM Permissoes WHERE Utilizador = @u AND Perfil = @p AND Empresa = @e) INSERT INTO Permissoes (Utilizador, Perfil, Empresa) VALUES (@u, @p, @e)'),
          apagar: (u, p, e) => r().input('u', sql.NVarChar, u).input('p', sql.NVarChar, p).input('e', sql.NVarChar, e)
            .query('DELETE FROM Permissoes WHERE Utilizador = @u AND Perfil = @p AND Empresa = @e'),
          activo: (u, v) => r().input('u', sql.NVarChar, u).input('v', sql.Bit, v ? 1 : 0).query('UPDATE Utilizadores SET Activo = @v WHERE Codigo = @u')
        });
        await tx.commit();
      } catch (e) { try { await tx.rollback(); } catch (x) { /* a transacção já foi anulada pelo servidor */ } throw e; }
    }
  };
};
