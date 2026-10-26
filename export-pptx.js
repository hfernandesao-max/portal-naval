/* Exporta «Ponto de situação» e «Concluído e pendente» para PowerPoint (.pptx), com tabelas editáveis.
   Usa os mesmos dados do portal (window.PD) e a biblioteca PptxGenJS, carregada só quando é precisa. */
(function () {
  var LIB = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';
  var C = { bg: '070B1F', card: '121A36', line: '26304F', tx: 'F5F5F7', mut: 'A9AEC2', acc: '7CC6EE', soft: '9CC4EA', navy: '283E81', blue: '3C79BE', rtm: '7CC6EE', erp: 'B5A8F0' };
  var EST = { concluido: ['Concluído', 'Done', '5BE07F', '15402A'], definido: ['Definido', 'Defined', '7CC6EE', '18324A'], curso: ['Em curso', 'In progress', '5FB8E8', '12324F'], previsto: ['Previsto', 'Planned', 'C9CCD6', '2A2F45'], aguarda: ['A aguardar', 'Waiting', 'E0A458', '3A2A14'], bloqueado: ['Bloqueado', 'Blocked', 'FF8A84', '3D1A1A'] };
  var MES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var FONT = 'Arial';

  function carregar() {
    return window.PptxGenJS ? Promise.resolve() : new Promise(function (ok, ko) {
      var s = document.createElement('script'); s.src = LIB; s.onload = ok; s.onerror = ko; document.head.appendChild(s);
    });
  }
  function imagem(url) {
    return fetch(url).then(function (r) { return r.blob(); }).then(function (b) {
      return new Promise(function (ok) { var f = new FileReader(); f.onload = function () { ok(f.result); }; f.readAsDataURL(b); });
    }).catch(function () { return null; });
  }

  window.exportarPPTX = function (EN) {
    var D = window.PD; if (!D) return Promise.reject(new Error('dados'));
    var L = function (o) { return o == null ? '' : (typeof o === 'string' ? o : (EN ? o.en : o.pt)); };
    var dt = function (iso, ano) { if (!iso || !/^\d{4}-\d\d-\d\d$/.test(iso)) return iso || ''; var x = iso.split('-'); return EN ? (+x[2]) + ' ' + MES[+x[1] - 1] + (ano ? ' ' + x[0] : '') : x[2] + '-' + x[1] + (ano ? '-' + x[0] : ''); };
    var TA = D.ordem(D.ativos ? D.ativos(D.tarefas) : D.tarefas);
    var feitos = TA.filter(function (t) { return t.estado === 'concluido'; });
    var pend = TA.filter(function (t) { return t.estado !== 'concluido'; });
    var quando = dt(D.actualizado, true) + (D.hora ? (EN ? ' at ' : ', às ') + D.hora : '');
    var prev = function (t) { return t.prev == null ? (EN ? 'TBC' : 'A definir') : (typeof t.prev === 'string' ? dt(t.prev) : L(t.prev)); };
    var exec = function (t) { return t.pct != null ? t.pct + '%' : L(t.valor); };
    var nome = function (t) { return EN ? t.en : t.pt; };

    return Promise.all([carregar(), imagem('assets/naval-logo.png')]).then(function (res) {
      var logo = res[1];
      var pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_WIDE'; // 13,33 x 7,5 pol.
      pptx.author = 'Grupo Naval · Projectos Digitais'; pptx.company = 'Grupo Naval';
      pptx.title = EN ? 'Grupo Naval - Digital Projects' : 'Grupo Naval - Projectos Digitais';
      var W = 13.333, M = 0.5, n = 0;

      function base(eyebrow, titulo) {
        var s = pptx.addSlide(); n++;
        s.background = { color: C.bg };
        s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.08, fill: { color: C.blue }, line: { color: C.blue } });
        if (logo) s.addImage({ data: logo, x: M, y: 0.32, w: 0.75, h: 0.62, sizing: { type: 'contain', w: 0.75, h: 0.62 } });
        s.addText(eyebrow.toUpperCase(), { x: M + 0.9, y: 0.28, w: 8.5, h: 0.3, fontFace: FONT, fontSize: 11, color: C.acc, charSpacing: 2 });
        s.addText(titulo, { x: M + 0.9, y: 0.55, w: 8.5, h: 0.5, fontFace: FONT, fontSize: 26, bold: true, color: C.tx });
        s.addText((EN ? 'As of ' : 'Actualizado a ') + quando, { x: W - M - 3.6, y: 0.4, w: 3.6, h: 0.32, fontFace: FONT, fontSize: 10.5, bold: true, color: C.soft, align: 'center', fill: { color: '15224A' }, line: { color: C.blue, width: 0.75 }, rectRadius: 0.08, shape: pptx.ShapeType.roundRect });
        s.addText('Grupo Naval · ' + (EN ? 'Digital Projects' : 'Projectos Digitais'), { x: M, y: 7.08, w: 6, h: 0.25, fontFace: FONT, fontSize: 9, color: '6E7591' });
        s.addText(String(n), { x: W - M - 1, y: 7.08, w: 1, h: 0.25, fontFace: FONT, fontSize: 9, color: '6E7591', align: 'right' });
        return s;
      }
      function kpi(s, x, y, w, rot, val, nota, cor) {
        s.addShape(pptx.ShapeType.roundRect, { x: x, y: y, w: w, h: 0.95, fill: { color: C.card }, line: { color: C.line, width: 0.75 }, rectRadius: 0.1 });
        s.addText(rot.toUpperCase(), { x: x + 0.15, y: y + 0.06, w: w - 0.3, h: 0.25, fontFace: FONT, fontSize: 8.5, color: C.mut, charSpacing: 1 });
        s.addText(val, { x: x + 0.15, y: y + 0.28, w: w - 0.3, h: 0.4, fontFace: FONT, fontSize: 20, bold: true, color: cor || C.soft });
        s.addText(nota, { x: x + 0.15, y: y + 0.62, w: w - 0.3, h: 0.3, fontFace: FONT, fontSize: nota.length > 70 ? 7 : 8.5, color: C.mut, valign: 'top', fit: 'shrink' });
      }
      function pill(t) { var e = EST[t.estado] || EST.previsto; return { text: EN ? e[1] : e[0], options: { color: e[2], bold: true, fill: { color: e[3] } } }; }
      var cab = function (txt) { return { text: txt, options: { bold: true, color: C.mut, fontSize: 8.5, fill: { color: '0E1430' } } }; };
      var cel = function (txt, o) { return { text: txt, options: o || {} }; };
      var projCel = function (t) { return cel(t.proj, { bold: true, color: t.proj === 'RTM' ? C.rtm : C.erp, fontSize: 9 }); };

      // Indicadores
      var comPct = TA.filter(function (t) { return t.pct != null; });
      var media = comPct.length ? Math.round(comPct.reduce(function (a, t) { return a + t.pct; }, 0) / comPct.length) : 0;
      var V = D.vendas || { rotas: [], aVender: [] };
      var deps = D.dependencias ? D.dependencias(EN) : [];
      var S = D.series || [], st = 0, sc = 0; S.forEach(function (x) { st += x.total; sc += x.comunicadas; });
      var kmp = ((D.km30 || {}).passos || []);
      var kw = (W - 2 * M - 0.45) / 4;
      var TOP = 2.42, FUNDO = 6.95;

      // Tabela com descrição completa; ajusta o tamanho da letra para caber no diapositivo
      function tabela(s, lista, dataRot, fim) {
        var colW = [0.55, 2.7, 6.1, 1.15, 0.95, 0.88];
        var cpl = function (pt, w) { return Math.floor(w * 72 / (pt * 0.42)); }; // caracteres por linha (aprox.)
        var altura = function (pt) {
          var lh = pt * 1.22 / 72, tot = 0.26;
          lista.forEach(function (t) {
            var ld = Math.ceil(((t.det ? L(t.det) : '—').length + 1) / cpl(pt, colW[2] - 0.12));
            var lt = Math.ceil((nome(t).length + 1) / cpl(pt, colW[1] - 0.12));
            tot += Math.max(ld, lt, 1) * lh + 0.07;
          });
          return tot;
        };
        var pt = 10.5; while (pt > 6.5 && altura(pt) > FUNDO - TOP) pt -= 0.5;
        var rows = [[cab('Proj.'), cab(EN ? 'Topic' : 'Tema'), cab(EN ? 'Description' : 'Descrição'), cab(EN ? 'Status' : 'Estado'), cab(EN ? 'Completion' : 'Execução'), cab(dataRot)]];
        lista.forEach(function (t) {
          rows.push([projCel(t), cel(nome(t), { bold: true }), cel(t.det ? L(t.det) : '—', { color: t.det ? 'D4D7E2' : '6E7591' }), pill(t),
            cel(exec(t), { bold: true, color: (EST[t.estado] || EST.previsto)[2], align: 'right' }),
            cel(fim ? (t.concl ? dt(t.concl) : '—') : prev(t), { color: (!fim && D.atrasado && D.atrasado(t)) ? 'E0A458' : C.tx })]);
        });
        s.addTable(rows, { x: M, y: TOP, w: W - 2 * M, colW: colW, fontFace: FONT, fontSize: pt, color: C.tx, fill: { color: C.card }, border: { type: 'solid', color: C.line, pt: 0.5 }, valign: 'top', margin: [2, 5, 2, 5], autoPage: false });
      }

      // 1. Ponto de situação · pendente
      var s1 = base(EN ? 'Digital projects · IT · RTM · Cegid Evolution ERP Primavera' : 'Projectos digitais · IT · RTM · Cegid Evolution ERP Primavera', (EN ? 'Status update · Pending' : 'Ponto de situação · Pendente') + ' (' + pend.length + ')');
      kpi(s1, M, 1.3, kw, EN ? 'Average completion' : 'Execução média', media + '%', (EN ? 'across ' : 'nos ') + comPct.length + (EN ? ' tracked topics' : ' temas com medição'), C.tx);
      kpi(s1, M + (kw + 0.15), 1.3, kw, EN ? 'Pending' : 'Pendentes', pend.length + ' / ' + TA.length, EN ? 'most critical first' : 'do mais crítico para o menos crítico');
      kpi(s1, M + 2 * (kw + 0.15), 1.3, kw, EN ? 'Next deadlines' : 'Próximos prazos', String(pend.filter(function (t) { return typeof t.prev === 'string' && /^\d{4}/.test(t.prev); }).length), EN ? 'topics with a set date' : 'temas com data definida');
      kpi(s1, M + 3 * (kw + 0.15), 1.3, kw, EN ? 'Blocked or waiting' : 'Bloqueados ou à espera', String(deps.length), deps.join(' · '), 'FF8A84');
      tabela(s1, pend, EN ? 'Forecast' : 'Previsão', false);

      // 2. Concluído
      var s2 = base(EN ? 'Digital projects · IT · Summary' : 'Projectos digitais · IT · Resumo', (EN ? 'Done' : 'Concluído') + ' (' + feitos.length + ')' + (EN ? ' · last ' : ' · últimos ') + (D.DIAS_CONCLUIDOS || 14) + (EN ? ' days' : ' dias'));
      kpi(s2, M, 1.3, kw, EN ? 'Topics completed' : 'Temas concluídos', feitos.length + ' / ' + TA.length, pend.length + (EN ? ' still in progress or pending' : ' ainda em curso ou pendentes'));
      kpi(s2, M + (kw + 0.15), 1.3, kw, EN ? 'RTM routes selling' : 'Rotas RTM a vender', V.aVender.length + ' / ' + V.rotas.length, L(V.docs));
      kpi(s2, M + 2 * (kw + 0.15), 1.3, kw, EN ? 'AGT series communicated' : 'Séries AGT comunicadas', sc + ' / ' + st, S.map(function (x) { return x.emp; }).join(' · '));
      kpi(s2, M + 3 * (kw + 0.15), 1.3, kw, EN ? 'KM30 steps done' : 'Passos do KM30 concluídos', kmp.filter(function (x) { return x.estado === 'concluido'; }).length + ' / ' + kmp.length, L((D.km30 || {}).bloqueio));
      tabela(s2, feitos, EN ? 'Completed on' : 'Concluído a', true);

      var d = D.actualizado || '';
      return pptx.writeFile({ fileName: (EN ? 'Grupo_Naval_Digital_Projects_' : 'Grupo_Naval_Projectos_Digitais_') + d + '.pptx' });
    });
  };
})();
