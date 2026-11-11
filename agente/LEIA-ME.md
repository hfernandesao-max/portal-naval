# Agente do Gestor de Acessos

Executa no ERP Primavera (base do sistema **PRIEMPRE**) os pedidos aprovados em `gestor.html`. Corre num servidor da rede do Grupo Naval, por tarefa agendada de 5 em 5 minutos. Só faz ligações de saída: ao SQL Server da rede e a `https://api.github.com`. Não é preciso abrir portas.

## Como funciona
1. Alguém cria um pedido no portal: aplicar a matriz a um conjunto de contas, ou um acesso temporário.
2. **Outra pessoa** da lista `aprovadores` aprova-o. Quem pede não pode aprovar.
3. O agente confirma no GitHub quem deu cada passo e que o conteúdo é o que foi aprovado (impressão digital SHA-256). Depois aplica o pedido na **cópia de testes** e verifica o resultado.
4. Se correu bem, uma pessoa da lista `executores` dá a ordem de produção, escrevendo APLICAR. Quem aprovou não pode dar a ordem.
5. O agente faz uma cópia de segurança local do estado de cada conta. Depois aplica em **produção** numa só transacção e volta a ler para verificar.
6. «Reverter» repõe o estado guardado na cópia de segurança. Os acessos temporários fecham sozinhos no fim do prazo.

O agente confia apenas em duas coisas: o seu diário local (`registos/diario.json`) e os marcadores de eventos do GitHub. A identidade de cada passo é o autor do commit que criou o marcador. Um pedido alterado depois de aprovado é recusado.

## O que escreve, e só isto
- `Permissoes`: atribui e retira os perfis geridos. São os perfis do catálogo `_02`, os legados listados em `config.json` e o perfil pessoal (`PerfilSugerido`).
- `Utilizadores.Activo`: desactiva as contas marcadas «Desactivar». Abre e fecha as contas da lista `contasJit`.

Nunca escreve perfis, operações dos perfis, licenciamento (tabelas com hash), séries nem palavras-passe. Também nunca reactiva uma conta pela matriz. As contas novas e os perfis `_02` criam-se no Administrador, com o script 04. Se faltar uma conta ou um perfil, o agente recusa o pedido antes de escrever.

## Instalação (uma vez)
Pré-requisitos no servidor: **Node.js 20 LTS** ou superior, e acesso aos dois SQL Server (testes e produção) e a `https://api.github.com`.

1. **Utilizador SQL do agente**, com permissões mínimas, em **cada** ambiente (primeiro testes, depois produção):
   ```sql
   USE master;
   CREATE LOGIN gestor_acessos WITH PASSWORD = '<palavra-passe forte>', CHECK_POLICY = ON;
   USE PRIEMPRE;
   CREATE USER gestor_acessos FOR LOGIN gestor_acessos;
   GRANT SELECT ON dbo.Perfis TO gestor_acessos;
   GRANT SELECT, INSERT, DELETE ON dbo.Permissoes TO gestor_acessos;
   GRANT SELECT (Codigo, Activo, PerfilSugerido) ON dbo.Utilizadores TO gestor_acessos;
   GRANT UPDATE (Activo) ON dbo.Utilizadores TO gestor_acessos;
   ```
2. **Conta do GitHub própria para o agente**, por exemplo `naval-agente`, com acesso de escrita ao repositório `portal-naval`. Nessa conta, crie um token fine-grained só para `portal-naval`, com **Contents: Read and write** e validade de 90 dias. Não use a conta de quem aprova nem a de quem dá a ordem.
3. **Copiar o repositório** para o servidor, mantendo a estrutura (`matriz-acessos.js` e `gestor-acessos.js` na raiz, o agente em `agente\`):
   `git clone https://github.com/hfernandesao-max/portal-naval.git C:\PortalNaval`
4. Numa consola PowerShell, na pasta `agente`:
   ```powershell
   npm ci --omit=dev        # instala o controlador do SQL Server (mssql)
   copy config.local.exemplo.json config.local.json
   notepad config.local.json   # logins do GitHub: aprovadores, executores e contasJit
   .\configurar.ps1            # guarda credenciais cifradas pelo Windows (DPAPI) em credenciais.xml
   ```
   Corra o `configurar.ps1` com a **mesma conta do Windows** que vai correr a tarefa agendada.
5. **Ensaio sem tocar no Primavera nem no portal**:
   ```powershell
   node agente.js --simular exemplo-primavera.json
   ```
   Este modo usa um Primavera em memória e não grava nada no portal.
6. **Agendar** numa consola aberta como administrador: `.\agendar.ps1`. Por omissão corre de 5 em 5 minutos, 24 horas por dia, para os acessos temporários fecharem a horas.

## Configuração
- `config.json` (vai para o GitHub): empresas da matriz e o seu código no Primavera, perfis legados a retirar, `retirarPerfilPessoal`, `aliases` (login da matriz → código no Primavera) e `jitHorasMax`.
- `config.local.json` (fica só no servidor): `aprovadores`, `executores` e `contasJit`. A conta de acesso temporário deve ter o perfil de Administrador já definido no Primavera e ficar inactiva por omissão.

## Registos e cópias
- `registos/agente-AAAA-MM.log`: o que o agente fez em cada passagem.
- `registos/diario.json`: os passos já executados. Impede que um pedido corra duas vezes.
- `copias/<pedido>.json`: estado de cada conta antes da execução em produção. É usado por «Reverter».

Nenhum destes ficheiros vai para o GitHub. Faça cópia de segurança da pasta `agente` com o resto do servidor.

## Testes
`node --test testes/agente.test.js` cobre quatro áreas:
- a execução, a verificação e a reversão;
- a recusa antes de escrever;
- a separação de funções (auto-aprovação, aprovador desconhecido, conteúdo alterado, ordem dada por quem aprovou);
- o acesso temporário e a fusão de gravações simultâneas.
