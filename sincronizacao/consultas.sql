/* Consultas usadas pela sincronização (só leitura, base de dados do sistema PRIEMPRE).
   Podem ser corridas à mão no SQL Server Management Studio para conferir os dados. */
USE PRIEMPRE;
GO

/* 1. Contas de utilizador */
SELECT Codigo, Nome, Email, Activo, Bloqueado, Administrador, SuperAdministrador
FROM Utilizadores
ORDER BY Codigo;

/* 2. Empresas a que cada utilizador tem acesso (Empresa = '***' significa todas) */
SELECT DISTINCT Utilizador, Empresa
FROM Permissoes
ORDER BY Utilizador, Empresa;

/* 3. Módulos (aplicações) de cada utilizador */
SELECT Utilizador, Apl
FROM UtilizadoresAplicacoes
ORDER BY Utilizador, Apl;

/* 4. Empresas registadas no Primavera */
SELECT Codigo
FROM Empresas
ORDER BY Codigo;
