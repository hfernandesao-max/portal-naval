/* Projectos digitais · dados do ponto de situação (RTM e Cegid Evolution ERP Primavera).
   Para actualizar: alterar os valores abaixo. Site público: só nomes autorizados (ex.: equipa do Dubai com acesso ao Pinguim BO); sem e-mails, NIF nem dados de acessos individuais. */
window.PD = {
  actualizado: '2026-10-25',

  /* estado: concluido | definido | curso | previsto | aguarda | bloqueado */
  tarefas: [
    { proj: 'RTM', pt: 'Pré-requisitos e formação in loco (11 de 11)', en: 'Prerequisites and on-site training (11 of 11)', estado: 'concluido', pct: 100, prev: '—', concl: '2026-10-16', det: { pt: 'Os 11 vendedores formados no registo de clientes, com acompanhamento in loco.', en: 'All 11 sales reps trained on customer registration, with on-site follow-up.' } },
    { proj: 'RTM', pt: 'Instalação da APP WinRest e registo de clientes', en: 'WinRest APP installation and customer registration', estado: 'concluido', pct: 100, valor: { pt: '≈ 937 clientes', en: '≈ 937 customers' }, prev: '—', concl: '2026-10-19', det: { pt: 'APP instalada nos 11 smartphones; o registo de clientes (≈ 937) passou a ser trabalho da equipa comercial.', en: 'APP installed on the 11 smartphones; customer registration (≈ 937) is now the sales team\u2019s work.' } },
    { proj: 'RTM', pt: 'Vendas na APP (11 de 11 rotas · só Factura/Recibo)', en: 'Sales on the APP (11 of 11 routes · FR only)', estado: 'concluido', pct: 100, prev: '—', det: { pt: 'Todas as rotas a vender no RTM; nesta fase, só Factura/Recibo.', en: 'All routes selling on RTM; Invoice/Receipt only for now.' } },
    { proj: 'RTM', pt: 'Fluxo de mercadoria SAP → RTM (manual)', en: 'Goods flow SAP → RTM (manual)', estado: 'definido', pct: 67, prev: '2026-10-19' },
    { proj: 'RTM', pt: 'Acessos ao Pinguim BO (5 · equipa do Dubai)', en: 'Pinguim BO portal access (5 users · Dubai team)', estado: 'concluido', pct: 100, prev: '—', concl: '2026-10-25', det: { pt: 'Muzamil Walele, Shanwaz Karani, Atif Zaidi, Mahesh Kumar Anuganti e Rohit Patel.', en: 'Muzamil Walele, Shanwaz Karani, Atif Zaidi, Mahesh Kumar Anuganti and Rohit Patel.' } },
    { proj: 'RTM', pt: 'Lista de artigos e template de carga diária', en: 'Item list and daily load template', estado: 'previsto', pct: 0, prev: '2026-10-19' },
    { proj: 'ERP', pt: 'Servidor, relatórios Finanças, câmbio e listas', en: 'Server, finance reports, exchange rate, lists', estado: 'concluido', pct: 100, prev: '—', det: { pt: 'Relatório técnico do servidor antigo, relatórios Bank, Supplier e Customer, câmbio de 01-10 e listas migradas para a V10.', en: 'Old server technical report, Bank, Supplier and Customer reports, 1 Oct exchange rate and lists migrated to V10.' } },
    { proj: 'ERP', pt: 'Formação Oceano (2 módulos)', en: 'Oceano training (2 modules)', estado: 'concluido', pct: 100, prev: '—', concl: '2026-10-12', det: { pt: 'Logística e Compras; Contactos e Oportunidades.', en: 'Logistics and Purchasing; Contacts and Opportunities.' } },
    { proj: 'ERP', pt: 'Ajustes às listas V10', en: 'V10 list adjustments', estado: 'concluido', pct: 100, prev: '—', concl: '2026-10-19', det: { pt: 'Global Sales List, Global Stock e novas listas.', en: 'Global Sales List, Global Stock and new lists.' } },
    { proj: 'ERP', pt: 'Criação automática de códigos nas empresas', en: 'Automatic code creation across companies', estado: 'concluido', pct: 100, prev: '—', concl: '2026-10-25', det: { pt: 'Ao criar clientes, fornecedores, artigos ou contas do plano de contas, abre-os em todas as outras empresas; inclui a actualização do câmbio.', en: 'When customers, suppliers, items or chart-of-accounts accounts are created, they are opened in all other companies; includes the exchange-rate update.' } },
    { proj: 'ERP', pt: 'Séries AGT (Cazengo, Yawaba, Inovagate)', en: 'AGT series (Cazengo, Yawaba, Inovagate)', estado: 'concluido', pct: 100, prev: '—', concl: '2026-10-19', det: { pt: 'Séries criadas e activadas para a facturação digital nas três empresas.', en: 'Series created and activated for digital invoicing in the three companies.' } },
    { proj: 'ERP', pt: 'Módulo de Serviços – Oceano', en: 'Services module – Oceano', estado: 'curso', pct: 60, prev: '2026-11-10', det: { pt: 'Proposta adjudicada, planeamento concluído e pagamento liquidado; faltam a implementação e a formação.', en: 'Proposal awarded, planning done and payment settled; implementation and training pending.' } },
    { proj: 'ERP', pt: 'Portal AGT: APP de leitura e relatório de gestão', en: 'AGT portal: reader APP and management report', estado: 'curso', pct: 67, prev: '2026-10-30' },
    { proj: 'ERP', pt: 'Front-Office KM30 (4 de 6 passos)', en: 'KM30 Front-Office (4 of 6 steps)', estado: 'bloqueado', pct: 67, prev: { pt: 'Logística', en: 'Logistics' } },
    { proj: 'ERP', pt: 'Relatório de GRN pendentes (todas as empresas)', en: 'Outstanding GRN report (all companies)', estado: 'curso', pct: 80, prev: '2026-10-30', det: { pt: 'Desenvolvido, testado e validado; aplicação em todas as empresas esta semana, concluído até 30-10.', en: 'Developed, tested and approved; roll-out to all companies this week, completed by 30 Oct.' } },
    { proj: 'ERP', pt: 'Layout da folha de rosto e da PO no Primavera', en: 'Cover sheet and PO layout in Primavera', estado: 'aguarda', pct: 25, prev: { pt: 'Licença Crystal', en: 'Crystal licence' }, det: { pt: 'Pedido e modelos recebidos (folha de rosto SAP e PO); o ajuste dos layouts só começa depois de receber a licença do Crystal Reports.', en: 'Request and models received (SAP cover sheet and PO); the layout changes start only once the Crystal Reports licence arrives.' } },
    { proj: 'ERP', pt: 'Redefinição de acessos (27 de 70 tratados)', en: 'Access redesign (27 of 70 handled)', estado: 'curso', pct: 39, prev: '2026-10-16' }
  ],

  /* Arranque das vendas: códigos de rota (sem nomes) */
  vendas: { rotas: ['1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008', '1009', '1010', '1011'], aVender: ['1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008', '1009', '1010', '1011'], docs: { pt: 'Nesta fase, só vendas com Factura/Recibo (FR).', en: 'For now, sales with Invoice/Receipt (FR) only.' }, inicio: '2026-10-19', prazo: '2026-10-21' },

  fluxo: {
    passos: [
      { pt: 'SAP', en: 'SAP', t: { pt: 'Saída de mercadoria', en: 'Goods issue' }, d: { pt: 'Documento de saída nas empresas.', en: 'Goods-issue document in the companies.' } },
      { pt: 'Pinguim BO', en: 'Pinguim BO', t: { pt: 'Entrada manual', en: 'Manual goods receipt' }, d: { pt: 'Armazéns REFITEC/FOODTEC PIV - FOOD e HIGITEC PIV - NON FOOD.', en: 'Warehouses REFITEC/FOODTEC PIV - FOOD and HIGITEC PIV - NON FOOD.' } },
      { pt: 'Carrinhas', en: 'Vans', t: { pt: 'Transferência', en: 'Transfer' }, d: { pt: 'Para o armazém de cada carrinha, com o template de carga diária.', en: 'To each van’s warehouse, using the daily load template.' } }
    ],
    regras: [
      { pt: 'Manual nesta fase: sem integrador; mesma empresa nos dois sistemas; movimento interno, não venda.', en: 'Manual for now: no integration tool; same company in both systems; internal movement, not a sale.' },
      { pt: 'A mercadoria não vendida volta aos armazéns FOOD e NON FOOD do Pinguim BO.', en: 'Unsold goods return to the Pinguim BO FOOD and NON FOOD warehouses.' },
      { pt: 'Reconciliação diária de stock entre o SAP e o RTM.', en: 'Daily stock reconciliation between SAP and RTM.' }
    ]
  },

  km30: {
    deadline: '2026-10-12',
    resolvido: null, /* data em que a loja começou a facturar */
    passos: [
      { pt: 'Necessidades enviadas ao Departamento de IT', en: 'Requirements sent to the IT Department', estado: 'concluido' },
      { pt: 'Computador instalado', en: 'Computer installed', estado: 'concluido' },
      { pt: 'POS configurado e testado (10-10)', en: 'POS configured and tested (10 Oct)', estado: 'concluido' },
      { pt: 'Impressora de talões nova instalada', en: 'New receipt printer installed', estado: 'concluido' },
      { pt: 'Importação da lista de artigos para a base de dados', en: 'Item list import into the database', estado: 'bloqueado' },
      { pt: 'Loja a facturar no Primavera', en: 'Store invoicing in Primavera', estado: 'previsto' }
    ],
    bloqueio: { pt: 'A aguardar a lista de artigos da Logística.', en: 'Waiting for the item list from Logistics.' },
    impressoras: [
      { loja: 'KM30', pt: 'Instalada (nova)', en: 'Installed (new)', ok: true },
      { loja: 'Calemba 2', pt: 'A comprar', en: 'To be purchased', ok: false },
      { loja: 'Kikolo-Kianda', pt: 'A comprar', en: 'To be purchased', ok: false }
    ]
  },

  acessos: {
    data: '2026-10-16',
    grupos: [
      { pt: 'Manter', en: 'Keep', n: 20, cor: '#2397D4' },
      { pt: 'Novos (a criar)', en: 'New (to create)', n: 4, cor: '#7CC6EE' },
      { pt: 'Desactivar', en: 'Deactivate', n: 3, cor: '#FF6961' },
      { pt: 'A confirmar', en: 'To confirm', n: 5, cor: '#C9822A' },
      { pt: 'Sem resposta (a bloquear)', en: 'No reply (being blocked)', n: 38, cor: 'rgba(235,235,245,0.22)' }
    ],
    notas: [
      { pt: 'Contas desactivadas, não apagadas, para manter o histórico.', en: 'Accounts are deactivated, not deleted, to keep the history.' },
      { pt: 'Novos utilizadores com acesso a todas as empresas; acesso remoto configurado ao criar as contas.', en: 'New users get access to all companies; remote access is set up when the accounts are created.' },
      { pt: 'O prazo para devolver a matriz terminou a 16-10.', en: 'The deadline to return the matrix was 16 Oct.' }
    ]
  },

  series: [
    { emp: 'Cazengo', total: 14, comunicadas: 13, pend: { pt: 'VD', en: 'VD' } },
    { emp: 'Yawaba', total: 14, comunicadas: 10, pend: { pt: 'FI, FM, ND, VD (erro E99: estabelecimento A)', en: 'FI, FM, ND, VD (error E99: establishment A)' } },
    { emp: 'Inovagate', total: 19, comunicadas: 18, pend: { pt: 'VD', en: 'VD' } }
  ],

  historico: [
    { data: '2026-10-25', pt: 'Layout da folha de rosto e da PO: a aguardar a licença do Crystal Reports para começar o ajuste dos mapas.', en: 'Cover sheet and PO layout: waiting for the Crystal Reports licence to start adjusting the forms.' },
    { data: '2026-10-25', pt: 'Módulo de Serviços da Oceano liquidado; conclusão prevista a 10-11.', en: 'Oceano Services module paid in full; completion due 10 Nov.' },
    { data: '2026-10-25', pt: 'Registo de clientes passa para a equipa comercial; agrupado com a instalação da APP WinRest.', en: 'Customer registration handed over to the sales team; grouped with the WinRest APP installation.' },
    { data: '2026-10-25', pt: 'Cerca de 937 clientes registados na APP.', en: 'About 937 customers registered on the APP.' },
    { data: '2026-10-25', pt: 'Criação automática de códigos nas empresas concluída (inclui a actualização do câmbio).', en: 'Automatic code creation across companies completed (includes the exchange-rate update).' },
    { data: '2026-10-25', pt: 'Relatório de GRN pendentes desenvolvido, testado e validado; aplicação em todas as empresas esta semana, concluído até 30-10-2026.', en: 'Outstanding GRN report developed, tested and approved; roll-out to all companies this week, completed by 30 Oct 2026.' },
    { data: '2026-10-25', pt: 'Portal AGT: acesso criado; APP de leitura em desenvolvimento, conclusão prevista a 30-10.', en: 'AGT portal: access created; reader APP in development, due 30 Oct.' },
    { data: '2026-10-25', pt: 'Todas as 11 rotas a vender no RTM; nesta fase, só vendas com Factura/Recibo.', en: 'All 11 routes selling on RTM; for now, Invoice/Receipt sales only.' },
    { data: '2026-10-25', pt: 'Acessos ao portal Pinguim BO dados a 5 utilizadores da equipa do Dubai.', en: 'Pinguim BO portal access granted to 5 Dubai team users.' },
    { data: '2026-10-20', pt: 'Pedido do relatório de GRN pendentes no Primavera.', en: 'Outstanding GRN report requested in Primavera.' },
    { data: '2026-10-19', pt: 'Vendas no RTM iniciadas em 2 rotas; arranque gradual até 21-10.', en: 'RTM sales started on 2 routes; gradual roll-out until 21 Oct.' },
    { data: '2026-10-19', pt: 'Séries AGT criadas e enviadas para comunicação nas três empresas; ajustes às listas V10 concluídos.', en: 'AGT series created and sent for communication in the three companies; V10 list adjustments completed.' },
    { data: '2026-10-19', pt: 'Pagos o Módulo de Serviços da Oceano e os automatismos do Primavera.', en: 'Oceano Services module and Primavera automations paid.' },
    { data: '2026-10-19', pt: 'Formação WinRest à equipa de Back Office; cerca de 651 clientes registados.', en: 'WinRest training for the Back Office team; about 651 customers registered.' },
    { data: '2026-10-17', pt: 'Fluxo de mercadoria SAP → RTM definido, com início a 19-10.', en: 'Goods flow SAP → RTM defined, starting 19 Oct.' },
    { data: '2026-10-16', pt: 'Instalação da APP WinRest iniciada; prazo da matriz de acessos terminado.', en: 'WinRest APP installation started; access matrix deadline passed.' },
    { data: '2026-10-12', pt: 'Formação Oceano concluída (2 módulos).', en: 'Oceano training completed (2 modules).' },
    { data: '2026-10-10', pt: 'KM30: POS configurado e testado.', en: 'KM30: POS configured and tested.' },
    { data: '2026-10-09', pt: 'Pedido de alteração do layout da PO, além da folha de rosto.', en: 'PO layout change requested, in addition to the cover sheet.' },
    { data: '2026-10-07', pt: 'Pedido de alteração do layout da folha de rosto do Primavera (modelo SAP).', en: 'Primavera cover sheet layout change requested (SAP model).' }
  ]
};

/* Ordem de importância usada em todas as páginas: do mais crítico até aos concluídos.
   1 bloqueado · 2 aguarda aprovação · 3 prazo já ultrapassado (qualquer estado não concluído)
   · 4 em curso (prazo mais próximo primeiro; sem data no fim) · 5 previsto · 6 definido · 7 concluído (mais recente primeiro). */
window.PD.ordem = function (lista) {
  var R = { bloqueado: 0, aguarda: 1, curso: 3, previsto: 4, definido: 5, concluido: 6 };
  var hoje = new Date(); var h = hoje.getFullYear() + '-' + ('0' + (hoje.getMonth() + 1)).slice(-2) + '-' + ('0' + hoje.getDate()).slice(-2);
  var data = function (v) { return typeof v === 'string' && /^\d{4}-\d\d-\d\d$/.test(v) ? v : null; };
  var rank = function (t) { var r = R[t.estado]; if (r >= 3 && r < 6 && data(t.prev) && data(t.prev) < h) return 2; return r; };
  return (lista || []).slice().sort(function (a, b) {
    var d = rank(a) - rank(b); if (d) return d;
    if (a.estado === 'concluido') { var ca = a.concl || '', cb = b.concl || ''; return ca === cb ? 0 : (ca > cb ? -1 : 1); }
    var pa = data(a.prev), pb = data(b.prev);
    if (pa && pb && pa !== pb) return pa < pb ? -1 : 1;
    if (pa && !pb) return -1; if (pb && !pa) return 1;
    return (a.pct == null ? 0 : a.pct) - (b.pct == null ? 0 : b.pct);
  });
};
/* Prazo ultrapassado (para destacar a previsão a laranja). */
window.PD.atrasado = function (t) {
  if (!t || t.estado === 'concluido' || typeof t.prev !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(t.prev)) return false;
  var hoje = new Date(); var h = hoje.getFullYear() + '-' + ('0' + (hoje.getMonth() + 1)).slice(-2) + '-' + ('0' + hoje.getDate()).slice(-2);
  return t.prev < h;
};
