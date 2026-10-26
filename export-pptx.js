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

      // 1. Ponto de situação
      var s1 = base(EN ? 'Digital projects · IT · RTM · Cegid Evolution ERP Primavera' : 'Projectos digitais · IT · RTM · Cegid Evolution ERP Primavera', EN ? 'Status update' : 'Ponto de situação');
      var comPct = TA.filter(function (t) { return t.pct != null; });
      var media = comPct.length ? Math.round(comPct.reduce(function (a, t) { return a + t.pct; }, 0) / comPct.length) : 0;
      var nfd = TA.filter(function (t) { return t.estado === 'concluido' || t.estado === 'definido'; }).length;
      var V = D.vendas || { rotas: [], aVender: [] };
      var deps = D.dependencias ? D.dependencias(EN) : [];
      var kw = (W - 2 * M - 0.45) / 4;
      kpi(s1, M, 1.3, kw, EN ? 'Average completion' : 'Execução média', media + '%', (EN ? 'across ' : 'nos ') + comPct.length + (EN ? ' tracked topics' : ' temas com medição'), C.tx);
      kpi(s1, M + (kw + 0.15), 1.3, kw, EN ? 'Done or defined' : 'Concluídos ou definidos', nfd + ' / ' + TA.length, (TA.length - nfd) + (EN ? ' in progress or pending' : ' em curso ou pendentes'));
      kpi(s1, M + 2 * (kw + 0.15), 1.3, kw, EN ? 'RTM routes selling' : 'Rotas RTM a vender', V.aVender.length + ' / ' + V.rotas.length, L(V.docs));
      kpi(s1, M + 3 * (kw + 0.15), 1.3, kw, EN ? 'Blocked or waiting' : 'Bloqueados ou à espera', String(deps.length), deps.join(' · '), 'FF8A84');
      var rows1 = [[cab('Proj.'), cab(EN ? 'Topic' : 'Tema'), cab(EN ? 'Status' : 'Estado'), cab(EN ? 'Completion' : 'Execução'), cab(EN ? 'Forecast / done on' : 'Previsão / concluído a')]];
      TA.forEach(function (t) {
        var fim = t.estado === 'concluido';
        rows1.push([projCel(t), cel(nome(t), { color: fim ? C.mut : C.tx }), pill(t), cel(exec(t), { bold: true, color: (EST[t.estado] || EST.previsto)[2], align: 'right' }),
          cel(fim ? (t.concl ? dt(t.concl) : '—') : prev(t), { color: (!fim && D.atrasado && D.atrasado(t)) ? 'E0A458' : C.tx })]);
      });
      var fs1 = TA.length > 18 ? 8.5 : 9.5;
      s1.addTable(rows1, { x: M, y: 2.42, w: W - 2 * M, colW: [0.6, 7.0, 1.6, 1.3, 1.83], fontFace: FONT, fontSize: fs1, color: C.tx, fill: { color: C.card }, border: { type: 'solid', color: C.line, pt: 0.5 }, valign: 'middle', margin: [2, 6, 2, 6], rowH: 0.205, autoPage: false });

      // 2-3. Concluído e pendente (com descrições completas, em vários diapositivos se preciso)
      function blocos(lista, titulo, sub, dataRot, fim) {
        // paginação pela altura estimada de cada linha (descrição ~105 caracteres por linha a 9 pt)
        var alt = function (t) { var ld = Math.ceil(((t.det ? L(t.det) : '—').length) / 100), lt = Math.ceil(nome(t).length / 34); return 0.14 + 0.165 * Math.max(ld, lt, 1); };
        var paginas = [], cur = [], h = 0, MAXH = 5.0;
        lista.forEach(function (t) { var a = alt(t); if (cur.length && h + a > MAXH) { paginas.push(cur); cur = []; h = 0; } cur.push(t); h += a; });
        if (cur.length || !paginas.length) paginas.push(cur);
        var total = paginas.length;
        paginas.forEach(function (fatia, k) {
          var parte = k + 1;
          var s = base(EN ? 'Digital projects · IT · Summary' : 'Projectos digitais · IT · Resumo', (EN ? 'Done and pending' : 'Concluído e pendente') + ' · ' + titulo + (total > 1 ? ' (' + parte + '/' + total + ')' : ''));
          s.addText(sub, { x: M, y: 1.18, w: W - 2 * M, h: 0.3, fontFace: FONT, fontSize: 11, color: C.mut });
          var rows = [[cab('Proj.'), cab(EN ? 'Topic' : 'Tema'), cab(EN ? 'Description' : 'Descrição'), cab(EN ? 'Status' : 'Estado'), cab(EN ? 'Completion' : 'Execução'), cab(dataRot)]];
          fatia.forEach(function (t) {
            rows.push([projCel(t), cel(nome(t), { bold: true }), cel(t.det ? L(t.det) : '—', { color: t.det ? 'D4D7E2' : '6E7591' }), pill(t),
              cel(exec(t), { bold: true, color: (EST[t.estado] || EST.previsto)[2], align: 'right' }),
              cel(fim ? (t.concl ? dt(t.concl) : '—') : prev(t), { color: (!fim && D.atrasado && D.atrasado(t)) ? 'E0A458' : C.tx })]);
          });
          s.addTable(rows, { x: M, y: 1.55, w: W - 2 * M, colW: [0.55, 2.75, 5.6, 1.25, 1.05, 1.13], fontFace: FONT, fontSize: 9, color: C.tx, fill: { color: C.card }, border: { type: 'solid', color: C.line, pt: 0.5 }, valign: 'top', margin: [4, 6, 4, 6], autoPage: false });
        });
      }
      blocos(pend, EN ? 'Pending' : 'Pendente', pend.length + (EN ? ' topics · most critical first' : ' temas · do mais crítico para o menos crítico'), EN ? 'Forecast' : 'Previsão', false);
      blocos(feitos, EN ? 'Done' : 'Concluído', feitos.length + (EN ? ' topics · last ' : ' temas · últimos ') + (D.DIAS_CONCLUIDOS || 14) + (EN ? ' days' : ' dias'), EN ? 'Completed on' : 'Concluído a', true);

      var d = D.actualizado || '';
      return pptx.writeFile({ fileName: (EN ? 'Grupo_Naval_Digital_Projects_' : 'Grupo_Naval_Projectos_Digitais_') + d + '.pptx' });
    });
  };
})();
