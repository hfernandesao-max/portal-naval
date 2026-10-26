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

      // Um único diapositivo-resumo: indicadores, pendentes (com o ponto de situação em poucas palavras) e concluídos.
      var comPct = TA.filter(function (t) { return t.pct != null; });
      var media = comPct.length ? Math.round(comPct.reduce(function (a, t) { return a + t.pct; }, 0) / comPct.length) : 0;
      var V = D.vendas || { rotas: [], aVender: [] };
      var deps = D.dependencias ? D.dependencias(EN) : [];
      var curto = function (t) { if (t.res) return L(t.res); var x = t.det ? L(t.det) : ''; var i = x.search(/[.;]/); x = i > 0 ? x.slice(0, i) : x; return x.length > 70 ? x.slice(0, 68) + '…' : (x || '—'); };
      var s = base(EN ? 'Digital projects · IT · RTM · Cegid Evolution ERP Primavera' : 'Projectos digitais · IT · RTM · Cegid Evolution ERP Primavera', EN ? 'Status update' : 'Ponto de situação');
      var kw = (W - 2 * M - 0.45) / 4;
      kpi(s, M, 1.22, kw, EN ? 'Average completion' : 'Execução média', media + '%', (EN ? 'across ' : 'nos ') + comPct.length + (EN ? ' tracked topics' : ' temas com medição'), C.tx);
      kpi(s, M + (kw + 0.15), 1.22, kw, EN ? 'Done' : 'Concluídos', feitos.length + ' / ' + TA.length, pend.length + (EN ? ' in progress or pending' : ' em curso ou pendentes'));
      kpi(s, M + 2 * (kw + 0.15), 1.22, kw, EN ? 'RTM routes selling' : 'Rotas RTM a vender', V.aVender.length + ' / ' + V.rotas.length, L(V.docs));
      kpi(s, M + 3 * (kw + 0.15), 1.22, kw, EN ? 'Blocked or waiting' : 'Bloqueados ou à espera', String(deps.length), deps.join(' · '), 'FF8A84');

      var TOP = 2.32, FUNDO = 6.98, GAP = 0.2;
      var wL = 8.55, wR = W - 2 * M - wL - GAP, xR = M + wL + GAP;
      var hp = (FUNDO - TOP - 0.32) / (pend.length + 1), fp = Math.max(7, Math.min(10, hp * 72 * 0.55));
      var hf = (FUNDO - TOP - 0.32) / (feitos.length + 1), ff = Math.max(7, Math.min(10, hf * 72 * 0.55));
      // títulos das secções
      var sec = function (x, w, cor, txt, sub) {
        s.addShape(pptx.ShapeType.ellipse, { x: x, y: TOP + 0.07, w: 0.13, h: 0.13, fill: { color: cor }, line: { color: cor } });
        s.addText([{ text: txt, options: { bold: true, color: C.tx, fontSize: 13 } }, { text: '   ' + sub, options: { color: C.mut, fontSize: 9 } }], { x: x + 0.2, y: TOP - 0.02, w: w - 0.2, h: 0.3, fontFace: FONT, valign: 'middle' });
      };
      sec(M, wL, C.blue, (EN ? 'Pending' : 'Pendente') + ' (' + pend.length + ')', EN ? 'most critical first' : 'do mais crítico para o menos crítico');
      sec(xR, wR, '30D158', (EN ? 'Done' : 'Concluído') + ' (' + feitos.length + ')', (EN ? 'last ' : 'últimos ') + (D.DIAS_CONCLUIDOS || 14) + (EN ? ' days' : ' dias'));

      var rp = [[cab('Proj.'), cab(EN ? 'Topic' : 'Tema'), cab(EN ? 'Where it stands' : 'Ponto de situação'), cab(EN ? 'Status' : 'Estado'), cab('%'), cab(EN ? 'Forecast' : 'Previsão')]];
      pend.forEach(function (t) {
        rp.push([projCel(t), cel(nome(t), { bold: true }), cel(curto(t), { color: 'D4D7E2' }), pill(t),
          cel(exec(t), { bold: true, color: (EST[t.estado] || EST.previsto)[2], align: 'right' }),
          cel(prev(t), { color: (D.atrasado && D.atrasado(t)) ? 'E0A458' : C.tx })]);
      });
      s.addTable(rp, { x: M, y: TOP + 0.32, w: wL, colW: [0.48, 2.85, 2.9, 1.0, 0.5, 0.82], rowH: hp, fontFace: FONT, fontSize: fp, color: C.tx, fill: { color: C.card }, border: { type: 'solid', color: C.line, pt: 0.5 }, valign: 'middle', margin: [1, 4, 1, 4], autoPage: false });

      var rf = [[cab('Proj.'), cab(EN ? 'Topic' : 'Tema'), cab(EN ? 'Done on' : 'Concluído a')]];
      feitos.forEach(function (t) { rf.push([projCel(t), cel(nome(t), { color: 'D4D7E2' }), cel(t.concl ? dt(t.concl) : '—', { color: '5BE07F', bold: true })]); });
      s.addTable(rf, { x: xR, y: TOP + 0.32, w: wR, colW: [0.48, wR - 0.48 - 0.85, 0.85], rowH: hf, fontFace: FONT, fontSize: ff, color: C.tx, fill: { color: C.card }, border: { type: 'solid', color: C.line, pt: 0.5 }, valign: 'middle', margin: [1, 4, 1, 4], autoPage: false });

      var d = D.actualizado || '';
      return pptx.writeFile({ fileName: (EN ? 'Grupo_Naval_Digital_Projects_' : 'Grupo_Naval_Projectos_Digitais_') + d + '.pptx' });
    });
  };
})();
