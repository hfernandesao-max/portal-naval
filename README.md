# Portal do Grupo Naval · protótipo

Modelo navegável do portal (PT/EN). Dados de exemplo; sem ligação aos ERPs.

O endereço abre no início de sessão. O mapa de todos os ecrãs está em `mapa.html`.

## Projectos digitais (dados reais)

`ProjectosDigitais.dc.html` (PT) e `ProjectosDigitais_en.dc.html` (EN): ponto de situação dos projectos RTM e Cegid Evolution ERP Primavera. Os dados estão em `data/projectos-digitais.js`; para actualizar o portal basta alterar esse ficheiro. Sem nomes de pessoas, porque o site é público. `ponto-situacao.html` mostra o mesmo ponto de situação num único ecrã 16:9 (para reuniões), com `?lang=pt` ou `?lang=en`; **Página única: `projectos.html`** (separadores Concluído e pendente, Ponto de situação, Acessos ERP, Detalhe e histórico). `acessos.html`: revisão de acessos ao ERP com números agregados, sem dados pessoais. `concluidos.html` mostra o concluído e o pendente lado a lado, num só ecrã.

### Cores (modelo Naval)
Fundo `#070B1F`; azuis Naval `#283E81` (escuro) e `#3C79BE` (médio); destaques sobre fundo escuro `#7CC6EE` e `#9CC4EA`; acção `#2397D4`. Verde, laranja e vermelho só para estados (concluído, atenção, bloqueado), nunca para títulos ou etiquetas.

### Estrutura rotativa dos temas
Os temas novos entram pela ordem de importância. Os temas concluídos ficam visíveis durante 14 dias após a data de conclusão (`concl`) e depois saem dos painéis automaticamente (`DIAS_CONCLUIDOS` em `data/projectos-digitais.js`); continuam registados no histórico.
