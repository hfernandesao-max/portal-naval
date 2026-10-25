# Portal do Grupo Naval · protótipo

Modelo navegável do portal (PT/EN). Dados de exemplo; sem ligação aos ERPs.

O endereço abre no início de sessão. O mapa de todos os ecrãs está em `mapa.html`.

## Projectos digitais (dados reais)

`ProjectosDigitais.dc.html` (PT) e `ProjectosDigitais_en.dc.html` (EN): ponto de situação dos projectos RTM e Cegid Evolution ERP Primavera. Os dados estão em `data/projectos-digitais.js`; para actualizar o portal basta alterar esse ficheiro. Sem nomes de pessoas, porque o site é público. `ponto-situacao.html` mostra o mesmo ponto de situação num único ecrã 16:9 (para reuniões), com `?lang=pt` ou `?lang=en`; **Página única: `projectos.html`** (separadores Concluído e pendente, Ponto de situação, Acessos ERP, Detalhe e histórico). `acessos.html`: revisão de acessos ao ERP com números agregados, sem dados pessoais. `concluidos.html` mostra o concluído e o pendente lado a lado, num só ecrã.
