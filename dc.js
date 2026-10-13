/* Mini runtime para as páginas do protótipo (sc-for, sc-if, {{campos}} e eventos). */
(function () {
  'use strict';
  var inst = null, tpl = '', app = null, handlers = [], pending = false;
  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (o) { Object.assign(this.state, typeof o === 'function' ? o(this.state) : o); schedule(); };
  DCLogic.prototype.forceUpdate = function () { schedule(); };
  window.DCLogic = DCLogic;
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function get(scope, p) {
    p = p.trim();
    if (p === 'true') return true;
    if (p === 'false') return false;
    var v = scope, parts = p.split('.');
    for (var i = 0; i < parts.length; i++) { if (v == null) return undefined; v = v[parts[i]]; }
    return v;
  }
  function find(str, tag) {
    var o = str.indexOf('<' + tag); if (o < 0) return null;
    var oe = str.indexOf('>', o) + 1, d = 1, i = oe;
    while (d > 0) {
      var a = str.indexOf('<' + tag, i), b = str.indexOf('</' + tag + '>', i);
      if (b < 0) return null;
      if (a >= 0 && a < b) { d++; i = a + 1; } else { d--; if (!d) return [o, oe, b, b + tag.length + 3]; i = b + 1; }
    }
    return null;
  }
  function render(str, scope) {
    for (;;) {
      var a = find(str, 'sc-for'), b = find(str, 'sc-if'), r, kind;
      if (!a && !b) break;
      if (a && (!b || a[0] < b[0])) { r = a; kind = 'for'; } else { r = b; kind = 'if'; }
      var open = str.slice(r[0], r[1]), inner = str.slice(r[1], r[2]), rep = '';
      if (kind === 'for') {
        var L = get(scope, (open.match(/list="\{\{(.*?)\}\}"/) || [])[1] || '') || [];
        var as = (open.match(/as="(\w+)"/) || [])[1];
        for (var k = 0; k < L.length; k++) { var s = Object.create(scope); s[as] = L[k]; rep += render(inner, s); }
      } else {
        var v = get(scope, (open.match(/value="\{\{(.*?)\}\}"/) || [])[1] || '');
        rep = v ? render(inner, scope) : '';
      }
      str = str.slice(0, r[0]) + rep + str.slice(r[3]);
    }
    str = str.replace(/\son([A-Z][a-zA-Z]*)="\{\{([^}]+)\}\}"/g, function (m, ev, p) {
      var f = get(scope, p);
      if (typeof f !== 'function') return '';
      handlers.push(f);
      return ' data-dcev-' + ev.toLowerCase() + '="' + (handlers.length - 1) + '"';
    });
    return str.replace(/\{\{([^}]+)\}\}/g, function (m, p) {
      var v = get(scope, p);
      return (v == null || typeof v === 'function') ? '' : esc(v);
    });
  }
  function bind(root) {
    ['click', 'change', 'input'].forEach(function (ev) {
      root.querySelectorAll('[data-dcev-' + ev + ']').forEach(function (el) {
        var h = handlers[+el.getAttribute('data-dcev-' + ev)];
        el.addEventListener(ev, function (e) { h.call(inst, e); });
      });
    });
    root.querySelectorAll('select[value]').forEach(function (el) { el.value = el.getAttribute('value'); });
  }
  function paint() {
    pending = false;
    var act = document.activeElement, idx = -1, s0 = null, s1 = null;
    var fields = app.querySelectorAll('input,select,textarea,button');
    if (act && app.contains(act)) {
      idx = Array.prototype.indexOf.call(fields, act);
      try { s0 = act.selectionStart; s1 = act.selectionEnd; } catch (e) {}
    }
    handlers = [];
    app.innerHTML = render(tpl, inst.renderVals());
    bind(app);
    if (idx >= 0) {
      var el = app.querySelectorAll('input,select,textarea,button')[idx];
      if (el) { el.focus({ preventScroll: true }); try { if (s0 != null) el.setSelectionRange(s0, s1); } catch (e) {} }
    }
  }
  function schedule() { if (!pending && inst) { pending = true; Promise.resolve().then(paint); } }
  window.DC = {
    mount: function (Comp) {
      tpl = document.getElementById('dc-tpl').textContent;
      app = document.getElementById('dc-app');
      inst = new Comp({});
      paint();
      if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
    }
  };
})();
