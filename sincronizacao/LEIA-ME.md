# Sincronização da matriz de acessos com o ERP Primavera

Lê o ERP Primavera (base de dados do sistema **PRIEMPRE**, só leitura) e actualiza a matriz de acessos do portal. Corre num servidor da rede do Grupo Naval, por tarefa agendada. A ligação é só de saída (HTTPS para `api.github.com`); não é preciso abrir portas.

## O que faz em cada execução
1. Lê do Primavera as contas (`Utilizadores`), as empresas de cada utilizador (`Permissoes`, `***` = todas) e os módulos (`UtilizadoresAplicacoes`). As consultas estão em `consultas.sql`.
2. Abre a matriz cifrada do portal e actualiza as colunas que vêm do ERP: Nome, E-mail e Nível. As decisões (Estado / Acção, Empresas, Módulos, Crédito, Responsável, Validado por, Observações) não são alteradas.
3. Regista na folha «Alterações» o que mudou no ERP: contas criadas, desactivadas, reactivadas ou removidas, e mudanças de nome, nível, empresas e módulos. Origem: «Primavera (sincronização automática)».
4. Compara a matriz aprovada com o ERP. As diferenças aparecem no portal: na coluna «ERP» e no filtro «Diferenças com o ERP» da página de actualização, e no Excel, na folha «Diferenças ERP».
5. Cifra de novo a matriz e grava-a no portal, com o resumo público (só números), num único commit. Só grava quando o ERP mudou, ou uma vez por dia para confirmar a ligação.

| Diferença | Prioridade |
|---|---|
| A desactivar, mas ainda activa no ERP | Alta |
| Sem resposta, ainda activa no ERP (excepto contas Super) | Alta |
| Empresas no ERP além das aprovadas | Média |
| Módulos no ERP marcados «Sem acesso» na matriz | Média |
| Empresas ou módulos aprovados ainda sem acesso no ERP | Baixa |
| «Manter», mas inactiva no ERP / na matriz, mas não existe no ERP | Baixa |
| Conta nova ainda por criar no ERP | Informação |

## Instalação (uma vez)
Pré-requisitos no servidor: **Node.js 20 LTS** ou superior, e acesso ao SQL Server do Primavera e a `https://api.github.com`.

1. **Utilizador SQL só de leitura**, no SQL Server Management Studio:
   ```sql
   USE master;
   CREATE LOGIN portal_leitura WITH PASSWORD = '<palavra-passe forte>', CHECK_POLICY = ON;
   USE PRIEMPRE;
   CREATE USER portal_leitura FOR LOGIN portal_leitura;
   ALTER ROLE db_datareader ADD MEMBER portal_leitura;
   ```
2. **Token do GitHub próprio para o servidor**: fine-grained, só o repositório `portal-naval`, permissão **Contents: Read and write**, validade de 90 dias. Usar um token diferente do pessoal permite revogá-lo sem afectar o resto.
3. **Copiar a pasta** `sincronizacao` e o ficheiro `matriz-acessos.js` para o servidor, mantendo a estrutura:
   ```
   C:\PortalNaval\matriz-acessos.js
   C:\PortalNaval\sincronizacao\...
   ```
   A forma mais simples é clonar o repositório: `git clone https://github.com/hfernandesao-max/portal-naval.git C:\PortalNaval`.
4. Numa consola PowerShell, na pasta `sincronizacao`:
   ```powershell
   npm ci
   .\configurar.ps1        # pede servidor SQL, utilizador, palavras-passe e token; guarda tudo cifrado pelo Windows
   .\executar.ps1 -Teste   # lê o ERP e gera saida\Matriz_de_acessos_<data>_teste.xlsx, sem gravar no portal
   ```
5. Abrir o Excel de teste e confirmar as folhas «ERP (Primavera)» e «Diferenças ERP». Se houver empresas com códigos diferentes dos cabeçalhos da matriz, o registo avisa; acrescente-as em `config.json`, por exemplo `"empresas": { "NAVALAGRO": "AGRO" }`.
6. Primeira sincronização real e agendamento (PowerShell como administrador):
   ```powershell
   .\executar.ps1
   .\agendar.ps1           # de hora a hora, das 07:00 às 20:00; ex.: .\agendar.ps1 -IntervaloMinutos 30
   ```

## Segurança
- Só leitura no Primavera (`db_datareader`) e ligação SQL com `ApplicationIntent=ReadOnly`.
- As credenciais ficam em `credenciais.xml`, cifrado pelo Windows (DPAPI) para a conta que correu o `configurar.ps1`, e só essa conta e os administradores o podem ler. Não vai para o GitHub (`.gitignore`).
- A matriz continua cifrada (AES-GCM 256) com a mesma palavra-passe. Antes de gravar, o script decifra o resultado para confirmar que a cifra está correcta.
- A mensagem do commit e o resumo público só têm números. Os registos em `registos\` também não têm nomes nem e-mails.
- Se a matriz for alterada no portal durante a sincronização, o script não grava por cima e volta a tentar na execução seguinte.

## Por confirmar
- **Contabilidade de Gestão** e **Retalho / Pontos de Venda**: falta confirmar o código da aplicação no Primavera. Até lá estes dois módulos não são comparados (`MA.APL` em `matriz-acessos.js`).
- **Total / Consulta e documentos de crédito**: nesta fase compara-se se o utilizador tem o módulo. O nível dentro do módulo e a permissão de emitir NC, NCA, NCO, PDV e DV dependem das operações dos perfis (`OperacoesPerfis`). Passam a ser comparados quando os perfis individuais estiverem criados.
- **Nível**: `SuperAdministrador` = Super, `Administrador` = Administrador, restantes = Utilizador.

## Problemas frequentes
| Mensagem no registo | O que fazer |
|---|---|
| `não foi possível ler o Primavera` | Confirmar servidor/instância, porta e utilizador SQL. Testar com `consultas.sql` no SSMS com o mesmo utilizador. |
| `palavra-passe da matriz errada` | Correr de novo `.\configurar.ps1`. |
| `HTTP 401` | Token expirado: criar um novo e correr `.\configurar.ps1`. |
| `HTTP 403` / `404` | O token não tem **Contents: Read and write** no `portal-naval`. |
| Sem saída para a internet | Se o servidor sair para a internet por proxy, pedir uma excepção para `api.github.com` ou ajustar o script para usar o proxy. |
